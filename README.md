# Engine Tuning Shop — Week 16 starter

## Included
- `server.js`: your uploaded backend with a new `/api/vehicle-lookup` route added before the existing 404 handler.
- `public/index.html`, `public/styles.css`, `public/app.js`: responsive dashboard frontend.
- Existing customer and tuning-job APIs are used as-is.

## Run it
1. Back up your current `server.js`.
2. Copy the included `server.js` into your project, replacing the current file.
3. Copy the included `public` folder into your project root (the same folder that contains `server.js` and `db.js`).
4. Ensure your project already has its dependencies installed and your `.env` contains `JWT_SECRET=your_long_random_secret`.
5. Use Node.js 18 or newer (the vehicle lookup route uses built-in `fetch` and `AbortSignal.timeout`).
6. Start your server with your usual command, for example `node server.js`.
7. Open `http://localhost:3000` in your browser.

## Third-party API
The vehicle lookup route calls the NHTSA vPIC VIN decoder:
https://vpic.nhtsa.dot.gov/api/

This public API generally does not require an API key. It may have limited coverage for vehicles outside the US market, including some vehicles in the Philippines. If your instructor specifically requires a third-party API key stored in `.env`, confirm that requirement and use a keyed automotive API instead.

## Week 16 checks still needed
- Test a valid VIN, an invalid VIN, a VIN with no decoded details, an external service failure/timeout, and repeated lookups (cache/rate limit).
- Ask a classmate to use the page without coaching.
- Record what they struggled with, make at least two usability improvements, retest, and document the results in `usability-report.md`. Do not claim the usability test was completed until you actually run it.
