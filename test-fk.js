
const db = require('./db');

try {
    db.prepare(`
        INSERT INTO tuning_jobs
        (customer_id, service_type, description, cost, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(
        999,
        'ECU Remapping',
        'Foreign key test',
        1000,
        'Pending',
        '2026-10-14'
    );

    console.log(
        'Row was saved. The relationship is NOT protected.'
    );
} catch (err) {
    console.log('Blocked:', err.message);
}
