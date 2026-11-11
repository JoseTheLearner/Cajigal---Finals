
process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'local-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const app = require('./server');

let server;
let baseUrl;

// Start a temporary test server
test.before(async () => {
    server = app.listen(0, '127.0.0.1');

    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });

    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
});

// Close the test server
test.after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close(error => {
                if (error) reject(error);
                else resolve();
            });
        });
    }
});

// TEST 1: Health check
test('GET /health returns 200', async () => {
    const response = await fetch(`${baseUrl}/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, 'ok');
});

// TEST 2: Job details
test('GET /api/tuning-jobs/details returns a list', async () => {
    const response = await fetch(
        `${baseUrl}/api/tuning-jobs/details`
    );

    const data = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(data));
});

// TEST 3: Protected route
test('POST /api/customers without token returns 401', async () => {
    const response = await fetch(
        `${baseUrl}/api/customers`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'Test Customer'
            })
        }
    );

    assert.equal(response.status, 401);
});

// TEST 4: Missing job
test('GET /api/tuning-jobs/99999 returns 404', async () => {
    const response = await fetch(
        `${baseUrl}/api/tuning-jobs/99999`
    );

    assert.equal(response.status, 404);
});

// TEST 5: Unknown route
test('GET /nothing returns 404', async () => {
    const response = await fetch(`${baseUrl}/nothing`);

    assert.equal(response.status, 404);
});
