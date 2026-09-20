# INE Product Price Tracker - Design Note

## Architecture Overview

The INE Product Price Tracker employs a **hybrid scraping architecture** designed to maximize reliability and efficiency while minimizing the load on the target mock store.

### The Problem

The target store (`https://demo.inelabteamdev.com/`) utilizes a bifurcated data delivery system:
1. **Catalog & Product Metadata**: Delivered via standard JSON APIs (`/api/catalog`, `/api/product/:id`) accessible without JavaScript execution.
2. **Pricing & Stock Data**: Delivered via a heavily obfuscated JavaScript flow requiring canvas fingerprinting, WebGL verification, proof-of-work, WebAssembly challenges, and symmetric key decryption (XOR). Furthermore, the UI requires strict user interaction (minimum 8 mouse movements over a 600ms dwell time) before the "Reveal price" button becomes actionable.

### The Hybrid Solution

We implemented a two-pronged approach:

1. **Server-Side Cache for Search (HTTP Fetch)**
   Since the store's `/api/catalog` ignores query parameters (meaning server-side search is not supported by the store natively), we fetch all 1000 products using lightweight HTTP requests and cache them in our PostgreSQL database (`products_cache` table). We then provide fast, fuzzy text search over this local cache. This avoids launching a browser just to search for products.

2. **Targeted DOM Extraction (Playwright)**
   To retrieve the actual price and stock, we use Playwright. The scraper navigates to the specific product page, dismisses the cookie banner, simulates the required human mouse movements to unlock the reveal button, clicks it, and waits for the asynchronous decryption to finish.

### Core Components

- **Frontend**: React + Vite single-page application. Features debounced searching, real-time dashboard updates, and historical charting using `recharts`.
- **Backend**: Node.js + Express API. Exposes endpoints for tracking products, fetching history, and triggering manual scrapes.
- **Scraper Service**: Built on Playwright. Employs an exponential backoff retry manager (2s -> 4s -> 8s) that distinguishes between retryable network/timeout errors and fatal validation errors.
- **Database**: PostgreSQL (via Supabase). Segregates configuration data (`tracked_products`) from timeseries data (`price_history`), ensuring an immutable audit log (`scrape_logs`).
- **Cron Architecture**: Designed to be triggered by an external scheduler (cron-job.org) via the `/api/scrape/run` endpoint, protected by a shared secret (`CRON_SECRET`).

## Key Engineering Decisions

### 1. Honest Logging
A failing scraper that logs its failures is vastly superior to a scraper that silently stores corrupt data. Our validation layer (`validators.js`) ensures that extracted DOM text is rigorously checked before it ever touches the `price_history` table. If validation fails, the attempt is logged as `FAILED` in the `scrape_logs`, providing transparency into the failure mode without polluting the historical dataset.

### 2. Idempotent Scrape Orchestration
The `/api/scrape/run` endpoint maintains an `isBatchRunning` state lock in memory. If the cron scheduler triggers the endpoint while a batch is still running, the new request immediately returns a 409 Conflict (skipped), preventing cascading failures or duplicate browser instances from overwhelming the server memory.

### 3. Centralized Selectors
All CSS selectors and RegExp patterns used to parse the DOM are isolated in `selectors.js`. If the target store updates its DOM structure, the maintenance burden is localized to a single configuration object.

### 4. Resilient Parsing
The store returns prices in multiple formats (e.g., `₹12,999`, `₹12 999`, `₹12.999,00`, fullwidth unicode). The `parser.js` module strips zero-width spaces, normalizes currency symbols, handles euro-style decimal switching, and safely parses the numeric value across all known edge cases.
