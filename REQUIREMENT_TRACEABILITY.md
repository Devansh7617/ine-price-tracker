# Requirement Traceability Matrix

This document maps the user's initial requirements to their specific implementation in the codebase.

## 1. Core Web Scraping Architecture
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Target mock store accurately | Configured `MOCK_STORE_URL=https://demo.inelabteamdev.com` | ✅ Done |
| Do not invent HTML structure | Playwright script extensively tested against live site; selectors centralized in `selectors.js` | ✅ Done |
| Playwright for complex pages | `priceScraper.js` uses Playwright to navigate, hover, and wait for JS execution on product pages | ✅ Done |
| Lightweight HTTP if possible | `productService.js` uses lightweight `fetch` against the `/api/catalog` for product lists (caching 1000 items) | ✅ Done |

## 2. Robustness & Anti-Bot Bypassing
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Handle price reveal flow | `simulateMouseHover` in `priceScraper.js` generates 12 random mouse moves with required 600ms dwell time | ✅ Done |
| Handle cookie banner | `dismissCookieBanner` in `priceScraper.js` detects banner, forces clicks, and verifies removal | ✅ Done |
| Scrape loading/retrying logic | `waitForPriceLoad` loops until `.price-success` or `.price-error` is rendered, acknowledging loading states | ✅ Done |

## 3. Data Integrity & Validation
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Handle 7 price formats | `parsePrice` in `parser.js` normalizes euro-style commas/dots, trims zero-width spaces, and converts unicode fullwidth chars | ✅ Done |
| Handle 5 stock text variants | `parseStock` uses 5 RegExp patterns (`STOCK_PATTERNS`) mapped against known stock phrases | ✅ Done |
| Strict Validation before Save | `validateScrapedData` ensures prices > 0, stock >= 0, and product names match the expected name | ✅ Done |
| Honest logging | `scrape_logs` table records every attempt (SUCCESS/RETRIED/FAILED). Invalid data triggers a FAILED log and aborts DB write | ✅ Done |

## 4. Resilient Scrape Orchestration
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Exponential Backoff Retry | `retryManager.js` implements a 3-attempt backoff (2s -> 4s -> 8s) for retryable errors | ✅ Done |
| Non-retryable error handling | `NON_RETRYABLE_ERRORS` prevents retrying 404s, page structure changes, and validation failures | ✅ Done |
| Idempotency during cron jobs | `runBatchScrape` lock (`isBatchRunning`) prevents overlapping cron jobs from crashing the server | ✅ Done |

## 5. Backend APIs & Database
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Supabase PostgreSQL | Tables structured in `database/schema.sql` separating configuration from timeseries | ✅ Done |
| Search & Tracking APIs | `/api/products/search`, `/api/tracked-products` implemented in Express routes | ✅ Done |
| Cron Authentication | `cronAuth.js` middleware secures `/api/scrape/run` with `CRON_SECRET` header | ✅ Done |

## 6. Frontend Dashboard
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| React + Vite Setup | `frontend` scaffolded using `create-vite`, `react-router-dom` for navigation | ✅ Done |
| Search View | `SearchPage.jsx` implements debounced server-side search querying local cache | ✅ Done |
| Detail View + Charting | `ProductDetail.jsx` visualizes history using `recharts` `<LineChart>` | ✅ Done |
| Scrape Logs Table | `ScrapeLogTable.jsx` surfaces honest status logs directly to the user | ✅ Done |

## 7. QA & Demonstrability
| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Headed Mode Script | `scrape-headed.js` script allows user to record the scraper bypassing anti-bot measures live | ✅ Done |
| Console output | Clean, structured terminal output via `logger.js` | ✅ Done |
