# Final QA Checklist

This checklist must be fully verified before calling the assignment complete.

## 1. Web Scraping Reliability
- [ ] Cookie banner is successfully dismissed (test multiple times as it appears randomly).
- [ ] Mouse hover successfully triggers the "Reveal price" button unlocking.
- [ ] Price correctly loads within 15 seconds.
- [ ] `parsePrice` correctly handles standard Indian format (`₹12,999`).
- [ ] `parsePrice` correctly handles euro-style format (`₹12.999,00`).
- [ ] `parseStock` correctly extracts the integer from strings like "Hurry, just 2 left".

## 2. Failure Handling & Honest Logging
- [ ] Simulating a network error results in a `RETRIED` log and subsequent retry.
- [ ] Simulating invalid data (e.g., negative price) results in a `FAILED` log.
- [ ] `price_history` table DOES NOT contain any invalid/NaN/null prices.
- [ ] Concurrent scrape attempts (e.g., cron + manual click) correctly returns a 409 Conflict.

## 3. Database Constraints
- [ ] Adding the same product twice returns the existing track record (UNIQUE constraint).
- [ ] Deleting a tracked product correctly cascades and deletes its price history and logs (`ON DELETE CASCADE`).

## 4. Frontend UI
- [ ] Search input accurately debounces (waits for typing to stop before querying).
- [ ] Empty state UI is shown if search returns no products.
- [ ] `Dashboard.jsx` correctly shows current price and stock.
- [ ] Price chart gracefully handles lack of history.
- [ ] All network errors (e.g., backend down) manifest as visible error banners in the UI, not raw crashes.

## 5. Security & Deployment Readiness
- [ ] The `CRON_SECRET` is required and enforced for the `/api/scrape/run` endpoint.
- [ ] All sensitive keys are loaded via `process.env` (No hardcoded secrets).
- [ ] CORS is configured to only allow requests from the designated frontend domain.
- [ ] Application does not expose stack traces in `NODE_ENV=production`.
