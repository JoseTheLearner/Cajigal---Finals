
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(
    path.join(__dirname, 'engine_tuning.db')
);

db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        vehicle_model TEXT NOT NULL,
        plate_number TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tuning_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        description TEXT NOT NULL,
        cost REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff'
    );
`);

const customerCount = db.prepare(
    'SELECT COUNT(*) AS total FROM customers'
).get().total;

if (customerCount === 0) {
    const insertCustomer = db.prepare(`
        INSERT INTO customers
        (name, phone, vehicle_model, plate_number)
        VALUES (?, ?, ?, ?)
    `);

    const customers = [
        ['Juan Dela Cruz', '09171234567', 'Honda Civic', 'ABC-1234'],
        ['Maria Santos', '09181234567', 'Toyota Vios', 'DEF-5678'],
        ['Pedro Reyes', '09191234567', 'Mitsubishi Lancer', 'GHI-9012'],
        ['Ana Garcia', '09201234567', 'Honda City', 'JKL-3456'],
        ['Carlo Mendoza', '09211234567', 'Toyota Corolla', 'MNO-7890']
    ];

    for (const customer of customers) {
        insertCustomer.run(...customer);
    }
}

const jobCount = db.prepare(
    'SELECT COUNT(*) AS total FROM tuning_jobs'
).get().total;

if (jobCount === 0) {
    const insertJob = db.prepare(`
        INSERT INTO tuning_jobs
        (customer_id, service_type, description, cost, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const jobs = [
        [1, 'ECU Remapping', 'Engine performance optimization', 8500, 'Pending'],
        [2, 'Dyno Tuning', 'Power and torque adjustment', 6000, 'In Progress'],
        [3, 'Fuel Tuning', 'Fuel mixture adjustment', 3500, 'Completed'],
        [4, 'Throttle Calibration', 'Throttle response improvement', 2500, 'Pending'],
        [5, 'ECU Diagnostics', 'Engine control unit inspection', 1500, 'Completed']
    ];

    for (const job of jobs) {
        insertJob.run(...job, new Date().toISOString());
    }
}

module.exports = db;
