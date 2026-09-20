# INE Product Price Tracker - README

## Overview
A production-quality Product Price Tracker built for the INE mock store. The system reliably tracks prices and stock over time using a hybrid scraping architecture that bypasses obfuscation and fingerprinting.

## Features
- **Hybrid Scraping Architecture**: Uses lightweight HTTP for product search and Playwright strictly for price/stock decryption.
- **Idempotent Batch Scraping**: Prevents overlapping cron jobs from crashing the server.
- **Honest Logging**: Validation failures are cleanly logged rather than corrupting the database.
- **Exponential Backoff**: Resilient retry strategies (2s -> 4s -> 8s) for network anomalies.
- **Full-Text Server-Side Search**: A local cache of all 1000 store products allows instantaneous search.

## Tech Stack
- **Frontend**: React, Vite, Recharts, React Router
- **Backend**: Node.js, Express, Playwright
- **Database**: PostgreSQL (Supabase)

## Local Setup

### Prerequisites
- Node.js >= 18
- A Supabase project

### 1. Database Setup
Execute the SQL found in `database/schema.sql` in your Supabase SQL editor.

### 2. Backend Setup
```bash
cd backend
npm install
npx playwright install chromium
```
Create a `.env` file in the `backend` directory based on `.env.example`.
Start the server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Start the frontend:
```bash
npm run dev
```

## Running the Scraper Visually
To record the scraping process for QA:
```bash
cd backend
npm run scrape:headed
```
This will launch a visible browser and log the real-time extraction process.
