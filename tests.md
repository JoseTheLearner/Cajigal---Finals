
# Engine Tuning Shop API — Week 15 Tests

## Environment
- Server: http://localhost:3000
- Client: Thunder Client
- Database: engine_tuning.db

## Test Results

| # | Request | Expected result | Actual result |
|---|---|---|---|
| 1 | GET /api/tuning-jobs/details | 200; customer names and vehicle details included | Pending |
| 2 | POST /api/customers with valid fields | 201; customer created | Pending |
| 3 | POST /api/customers with name empty | 400; validation error | Pending |
| 4 | POST /api/tuning-jobs with valid data | 201; job created with Pending status | Pending |
| 5 | POST /api/tuning-jobs with customer_id 99999 | 400; customer does not exist | Pending |
| 6 | PUT /api/tuning-jobs/1 with status Completed | 200; status updated | Pending |
| 7 | PUT /api/tuning-jobs/1 with status Maybe | 400; invalid status | Pending |
| 8 | GET /api/tuning-jobs/99999 | 404; job not found | Pending |
| 9 | GET /api/tuning-jobs?page=2&limit=2 | 200; second page returned | Pending |
| 10 | GET /api/tuning-jobs?sort=cost&order=desc | 200; sorted by cost descending | Pending |
| 11 | GET /api/tuning-jobs?status=Pending&limit=2 | 200; only Pending jobs | Pending |
| 12 | DELETE /api/customers/1 | 409 if customer has jobs | Pending |
| 13 | GET /nothing | 404; route not found | Pending |

## SQL Injection Demo

Command: node unsafe-demo.js

Expected:
- Unsafe query returns every tuning job.
- Safe query returns 0 rows.

Actual result: Pending

## Database Record Counts

- Customers: [Fill in actual count]
- Tuning jobs: [Fill in actual count]

## Known Issues

- [Write any tests that still fail, or write "None" after verifying all tests.]
