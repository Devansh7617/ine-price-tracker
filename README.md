# INE Product Price Tracker

A full-stack price tracking application built to monitor products on a highly protected e-commerce store. It uses a React frontend, a Node.js/Express backend, and PostgreSQL (Supabase) for the database. 

The core feature is a resilient Playwright scraper that bypasses bot protections using simulated human behavior and exponential backoff.

## Scraping Schedule
The automated scraper is scheduled to run **every 2 hours**. 
This is handled externally via a cron job (using cron-job.org) that sends a secure `POST` request to the backend's `/api/scrape/run` endpoint, authenticated via a custom header.

## Required Environment Variables
To run this project locally, create a `.env` file in the `backend` directory with the following variables:

```env
# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
CRON_SECRET=your_secret_cron_string_here

# Target URL
MOCK_STORE_URL=https://demo.inelabteamdev.com

# Scraper Settings (Required for bot bypass tuning)
SCRAPE_TIMEOUT_MS=30000
SCRAPE_MAX_RETRIES=3
SCRAPE_RETRY_BASE_MS=2000
SCRAPE_PRICE_WAIT_MS=15000
```
For the `frontend`, create a `.env` file with:
```env
VITE_API_URL=http://localhost:3001/api
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Devansh7617/ine-price-tracker.git
   cd ine-price-tracker
   ```

2. **Database Setup:**
   Run the SQL commands found in `database/schema.sql` in your Supabase SQL editor to create the necessary tables and fuzzy-search extensions.

3. **Backend Setup:**
   ```bash
   cd backend
   npm install
   npm start
   ```
   *Note: To run the visual scraper for debugging, use `npm run scrape:headed`.*

4. **Frontend Setup:**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
