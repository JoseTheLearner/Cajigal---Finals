require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Missing JWT_SECRET. Add it to your .env file.');
}

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, 'Public'), {
    index: false
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});

const SORTABLE = [
    'id',
    'customer_id',
    'service_type',
    'description',
    'cost',
    'status',
    'created_at'
];

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many login attempts. Try again in 15 minutes.'
    }
});

const vehicleLookupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many vehicle lookups. Please try again in 15 minutes.'
    }
});

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');

    if (type !== 'Bearer' || !token) {
        return res.status(401).json({
            error: 'Please log in first'
        });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({
            error: 'Your login is invalid or expired'
        });
    }
}

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Engine Tuning Shop API is running'
    });
});

app.post('/auth/register', (req, res, next) => {
    try {
        const { name, email, password } = req.body || {};

        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({
                error: 'name is required'
            });
        }

        if (
            typeof email !== 'string' ||
            !/^\S+@\S+\.\S+$/.test(email)
        ) {
            return res.status(400).json({
                error: 'A valid email is required'
            });
        }

        if (typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const existingUser = db.prepare(
            'SELECT id FROM users WHERE email = ?'
        ).get(cleanEmail);

        if (existingUser) {
            return res.status(409).json({
                error: 'That email is already registered'
            });
        }

        const passwordHash = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
            INSERT INTO users (name, email, passwordHash)
            VALUES (?, ?, ?)
        `).run(name.trim(), cleanEmail, passwordHash);

        return res.status(201).json({
            id: result.lastInsertRowid,
            name: name.trim(),
            email: cleanEmail
        });
    } catch (error) {
        return next(error);
    }
});

// Login
app.post('/auth/login', loginLimiter, (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string'
        ) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const user = db.prepare(
            'SELECT * FROM users WHERE email = ?'
        ).get(email.trim().toLowerCase());

        const validPassword = user &&
            bcrypt.compareSync(password, user.passwordHash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Wrong email or password'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        return next(error);
    }
});

app.get('/auth/me', requireAuth, (req, res) => {
    res.json({
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
    });
});

app.get('/api/customers', (req, res, next) => {
    try {
        const customers = db.prepare(`
            SELECT *
            FROM customers
            ORDER BY id
        `).all();

        res.json(customers);
    } catch (error) {
        next(error);
    }
});

app.get('/api/customers/:id', (req, res, next) => {
    try {
        const customer = db.prepare(
            'SELECT * FROM customers WHERE id = ?'
        ).get(req.params.id);

        if (!customer) {
            return res.status(404).json({
                error: 'Customer not found'
            });
        }

        return res.json(customer);
    } catch (error) {
        return next(error);
    }
});

app.post('/api/customers', requireAuth, (req, res, next) => {
    try {
        const {
            name,
            phone,
            vehicle_model,
            plate_number
        } = req.body || {};

        const fields = [
            name,
            phone,
            vehicle_model,
            plate_number
        ];

        if (fields.some(
            field => typeof field !== 'string' || !field.trim()
        )) {
            return res.status(400).json({
                error: 'Name, phone, vehicle_model and plate_number are required'
            });
        }

        const result = db.prepare(`
            INSERT INTO customers
                (name, phone, vehicle_model, plate_number)
            VALUES (?, ?, ?, ?)
        `).run(
            name.trim(),
            phone.trim(),
            vehicle_model.trim(),
            plate_number.trim()
        );

        const customer = db.prepare(
            'SELECT * FROM customers WHERE id = ?'
        ).get(result.lastInsertRowid);

        return res.status(201).json(customer);
    } catch (error) {
        return next(error);
    }
});

app.put('/api/customers/:id', requireAuth, (req, res, next) => {
    try {
        const {
            name,
            phone,
            vehicle_model,
            plate_number
        } = req.body || {};

        const fields = [
            name,
            phone,
            vehicle_model,
            plate_number
        ];

        if (fields.some(
            field => typeof field !== 'string' || !field.trim()
        )) {
            return res.status(400).json({
                error: 'Name, phone, vehicle_model and plate_number are required'
            });
        }

        const result = db.prepare(`
            UPDATE customers
            SET name = ?,
                phone = ?,
                vehicle_model = ?,
                plate_number = ?
            WHERE id = ?
        `).run(
            name.trim(),
            phone.trim(),
            vehicle_model.trim(),
            plate_number.trim(),
            req.params.id
        );

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Customer not found'
            });
        }

        const customer = db.prepare(
            'SELECT * FROM customers WHERE id = ?'
        ).get(req.params.id);

        return res.json(customer);
    } catch (error) {
        return next(error);
    }
});


app.delete('/api/customers/:id', requireAuth, (req, res, next) => {
    try {
        const deleteAndRenumber = db.transaction((customerId) => {
            const customer = db.prepare(
                'SELECT id FROM customers WHERE id = ?'
            ).get(customerId);

            if (!customer) {
                return {
                    status: 404,
                    error: 'Customer not found'
                };
            }

            const { total } = db.prepare(`
                SELECT COUNT(*) AS total
                FROM tuning_jobs
                WHERE customer_id = ?
            `).get(customerId);

            if (total > 0) {
                return {
                    status: 409,
                    error: 'Customer still has tuning jobs. Delete those first.'
                };
            }

            // Delete the selected customer
            db.prepare(
                'DELETE FROM customers WHERE id = ?'
            ).run(customerId);

            // Allow customer IDs and their foreign keys
            // to be updated together inside this transaction.
            db.pragma('defer_foreign_keys = ON');

            const remaining = db.prepare(
                'SELECT id FROM customers ORDER BY id'
            ).all();

            const updateCustomer = db.prepare(
                'UPDATE customers SET id = ? WHERE id = ?'
            );

            const updateJobs = db.prepare(
                'UPDATE tuning_jobs SET customer_id = ? WHERE customer_id = ?'
            );

            // First move all IDs to temporary negative values.
            remaining.forEach((customer, index) => {
                const temporaryId = -(index + 1);

                updateCustomer.run(temporaryId, customer.id);
                updateJobs.run(temporaryId, customer.id);
            });

            // Then assign sequential IDs starting from 1.
            remaining.forEach((customer, index) => {
                const temporaryId = -(index + 1);
                const newId = index + 1;

                updateCustomer.run(newId, temporaryId);
                updateJobs.run(newId, temporaryId);
            });

            // Reset SQLite's AUTOINCREMENT sequence.
            db.prepare(
                "DELETE FROM sqlite_sequence WHERE name = 'customers'"
            ).run();

            if (remaining.length > 0) {
                db.prepare(`
                    INSERT INTO sqlite_sequence (name, seq)
                    VALUES ('customers', ?)
                `).run(remaining.length);
            }

            return {
                status: 200,
                message: 'Customer deleted and remaining customer IDs renumbered successfully.'
            };
        });

        const result = deleteAndRenumber(Number(req.params.id));

        if (result.error) {
            return res.status(result.status).json({
                error: result.error
            });
        }

        return res.status(result.status).json({
            message: result.message
        });

    } catch (error) {
        return next(error);
    }
});


app.get('/api/tuning-jobs', (req, res, next) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 10);
        const sort = req.query.sort ?? 'id';
        const order = String(req.query.order ?? 'asc').toLowerCase();

        const { status, service_type } = req.query;

        if (!Number.isInteger(page) || page < 1) {
            return res.status(400).json({
                error: 'page must be a whole number, 1 or higher'
            });
        }

        if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
            return res.status(400).json({
                error: 'limit must be a whole number from 1 to 50'
            });
        }

        if (!SORTABLE.includes(sort)) {
            return res.status(400).json({
                error: `sort must be one of: ${SORTABLE.join(', ')}`
            });
        }

        if (!['asc', 'desc'].includes(order)) {
            return res.status(400).json({
                error: 'order must be asc or desc'
            });
        }

        if (
            status !== undefined &&
            (typeof status !== 'string' || !ALLOWED_STATUS.includes(status))
        ) {
            return res.status(400).json({
                error: `status must be one of: ${ALLOWED_STATUS.join(', ')}`
            });
        }

        if (
            service_type !== undefined &&
            (typeof service_type !== 'string' || !service_type.trim())
        ) {
            return res.status(400).json({
                error: 'service_type must not be empty'
            });
        }

        const conditions = [];
        const values = [];

        if (status) {
            conditions.push('status = ?');
            values.push(status);
        }

        if (service_type) {
            conditions.push('service_type = ?');
            values.push(service_type.trim());
        }

        const where = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const { total } = db.prepare(`
            SELECT COUNT(*) AS total
            FROM tuning_jobs
            ${where}
        `).get(...values);

        const data = db.prepare(`
            SELECT *
            FROM tuning_jobs
            ${where}
            ORDER BY ${sort} ${order.toUpperCase()}
            LIMIT ? OFFSET ?
        `).all(
            ...values,
            limit,
            (page - 1) * limit
        );

        return res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data
        });
    } catch (error) {
        return next(error);
    }
});

app.get('/api/tuning-jobs/details', (req, res, next) => {
    try {
        const jobs = db.prepare(`
            SELECT
                tuning_jobs.id,
                tuning_jobs.customer_id,
                customers.name AS customer_name,
                customers.vehicle_model,
                customers.plate_number,
                tuning_jobs.service_type,
                tuning_jobs.description,
                tuning_jobs.cost,
                tuning_jobs.status,
                tuning_jobs.created_at
            FROM tuning_jobs
            JOIN customers
                ON tuning_jobs.customer_id = customers.id
            ORDER BY tuning_jobs.id
        `).all();

        return res.json(jobs);
    } catch (error) {
        return next(error);
    }
});

app.get('/api/customers/:id/tuning-jobs', (req, res, next) => {
    try {
        const customer = db.prepare(
            'SELECT id FROM customers WHERE id = ?'
        ).get(req.params.id);

        if (!customer) {
            return res.status(404).json({
                error: 'Customer not found'
            });
        }

        const jobs = db.prepare(`
            SELECT *
            FROM tuning_jobs
            WHERE customer_id = ?
            ORDER BY id
        `).all(customer.id);

        return res.json(jobs);
    } catch (error) {
        return next(error);
    }
});

app.get('/api/tuning-jobs/:id', (req, res, next) => {
    try {
        const job = db.prepare(
            'SELECT * FROM tuning_jobs WHERE id = ?'
        ).get(req.params.id);

        if (!job) {
            return res.status(404).json({
                error: 'Tuning job not found'
            });
        }

        return res.json(job);
    } catch (error) {
        return next(error);
    }
});

app.post('/api/tuning-jobs', requireAuth, (req, res, next) => {
    try {
        const {
            customer_id,
            service_type,
            description,
            cost,
            status = 'Pending'
        } = req.body || {};

        if (!Number.isInteger(customer_id) || customer_id < 1) {
            return res.status(400).json({
                error: 'customer_id must be a positive whole number'
            });
        }

        if (
            typeof service_type !== 'string' ||
            !service_type.trim()
        ) {
            return res.status(400).json({
                error: 'service_type is required'
            });
        }

        if (
            typeof description !== 'string' ||
            !description.trim()
        ) {
            return res.status(400).json({
                error: 'description is required'
            });
        }

        if (
            typeof cost !== 'number' ||
            !Number.isFinite(cost) ||
            cost < 0
        ) {
            return res.status(400).json({
                error: 'cost must be a non-negative number'
            });
        }

        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({
                error: `status must be one of: ${ALLOWED_STATUS.join(', ')}`
            });
        }

        const customer = db.prepare(
            'SELECT id FROM customers WHERE id = ?'
        ).get(customer_id);

        if (!customer) {
            return res.status(400).json({
                error: 'customer_id does not match any customer'
            });
        }

        const result = db.prepare(`
            INSERT INTO tuning_jobs
                (customer_id, service_type, description, cost, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            customer_id,
            service_type.trim(),
            description.trim(),
            cost,
            status,
            new Date().toISOString()
        );

        const job = db.prepare(
            'SELECT * FROM tuning_jobs WHERE id = ?'
        ).get(result.lastInsertRowid);

        return res.status(201).json(job);
    } catch (error) {
        return next(error);
    }
});

// UPDATE tuning job status
app.put('/api/tuning-jobs/:id', requireAuth, (req, res, next) => {
    try {
        const { status } = req.body || {};

        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({
                error: `status must be one of: ${ALLOWED_STATUS.join(', ')}`
            });
        }

        const result = db.prepare(`
            UPDATE tuning_jobs
            SET status = ?
            WHERE id = ?
        `).run(status, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Tuning job not found'
            });
        }

        const job = db.prepare(
            'SELECT * FROM tuning_jobs WHERE id = ?'
        ).get(req.params.id);

        return res.json(job);
    } catch (error) {
        return next(error);
    }
});

app.delete('/api/tuning-jobs/:id', requireAuth, (req, res, next) => {
    try {
        const result = db.prepare(
            'DELETE FROM tuning_jobs WHERE id = ?'
        ).run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({
                error: 'Tuning job not found'
            });
        }

        return res.json({
            message: 'Tuning job deleted successfully'
        });
    } catch (error) {
        return next(error);
    }
});

const vehicleLookupCache = new Map();
const VEHICLE_CACHE_TTL_MS = 10 * 60 * 1000;

app.get('/api/vehicle-lookup', vehicleLookupLimiter, async (req, res) => {
    const vin = String(req.query.vin || '').trim().toUpperCase();

    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
        return res.status(400).json({
            error: 'Enter a valid 17-character VIN. VINs do not use I, O, or Q.'
        });
    }

    const cached = vehicleLookupCache.get(vin);

    if (cached && Date.now() - cached.savedAt < VEHICLE_CACHE_TTL_MS) {
        return res.json({
            ...cached.data,
            cached: true
        });
    }

    try {
        const url =
            `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;

        const response = await fetch(url, {
            signal: AbortSignal.timeout(5000),
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(502).json({
                error: 'The vehicle-data service is temporarily unavailable. Please try again later.'
            });
        }

        const payload = await response.json();
        const vehicle = Array.isArray(payload.Results)
            ? payload.Results[0]
            : null;

        if (!vehicle) {
            return res.status(502).json({
                error: 'We could not read the vehicle-data response. Please try again later.'
            });
        }

        const data = {
            vin,
            make: vehicle.Make || '',
            model: vehicle.Model || '',
            modelYear: vehicle.ModelYear || '',
            vehicleType: vehicle.VehicleType || '',
            bodyClass: vehicle.BodyClass || '',
            engineModel: vehicle.EngineModel || '',
            engineDisplacementL: vehicle.DisplacementL || '',
            fuelType: vehicle.FuelTypePrimary || '',
            apiMessage: vehicle.ErrorText || ''
        };

        if (!data.make && !data.model && !data.modelYear) {
            return res.status(404).json({
                error: 'No vehicle details were found for that VIN. Coverage may vary by vehicle and market.'
            });
        }

        vehicleLookupCache.set(vin, {
            data,
            savedAt: Date.now()
        });

        return res.json({
            ...data,
            cached: false
        });
    } catch (error) {
        if (
            error.name === 'TimeoutError' ||
            error.name === 'AbortError'
        ) {
            return res.status(504).json({
                error: 'The vehicle-data service took too long to respond. Please try again.'
            });
        }

        console.error('Vehicle lookup failed:', error.message);

        return res.status(502).json({
            error: 'Could not connect to the vehicle-data service. Check your connection and try again.'
        });
    }
});

// Current workshop weather
app.get('/api/weather', async (req, res) => {
  const apiKey = process.env.WEATHER_API_KEY;
  const location = process.env.WEATHER_LOCATION || 'Lucena City, Philippines';

  if (!apiKey) {
    return res.status(503).json({
      error: 'Weather service is not configured. Add WEATHER_API_KEY to your environment.'
    });
  }

  try {
    const url = new URL('https://api.weatherapi.com/v1/current.json');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', location);
    url.searchParams.set('aqi', 'no');

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    const payload = await response.json();

    if (!response.ok) {
      console.error('Weather API error:', payload.error?.message || response.status);
      return res.status(502).json({
        error: payload.error?.message || 'Weather service is unavailable.'
      });
    }

    return res.json({
      location: payload.location.name,
      country: payload.location.country,
      temperature: payload.current.temp_c,
      condition: payload.current.condition.text,
      icon: payload.current.condition.icon,
      humidity: payload.current.humidity,
      wind: payload.current.wind_kph
    });
  } catch (error) {
    console.error('Weather lookup failed:', error.message);
    return res.status(502).json({
      error: 'Could not retrieve weather right now. Please try again.'
    });
  }
});

// ==============================
// 404 HANDLER
// Keep this AFTER all routes
// ==============================

app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found'
    });
});

// ==============================
// ERROR HANDLER
// Must be the last middleware
// ==============================

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            error: 'Request body is not valid JSON'
        });
    }

    console.error(err.message);

    return res.status(500).json({
        error: 'Something went wrong on the server'
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;