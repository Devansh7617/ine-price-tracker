-- INE Product Price Tracker - Database Schema
-- Run this in your Supabase SQL editor

-- Enable the pg_trgm extension for fuzzy text search (must be done before creating the index)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Products cache: stores all 1000 store products for server-side search
CREATE TABLE IF NOT EXISTS products_cache (
  id SERIAL PRIMARY KEY,
  store_product_id INTEGER UNIQUE NOT NULL,
  slug TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  sku TEXT,
  description TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index on product name for fast search
CREATE INDEX IF NOT EXISTS idx_products_cache_name_trgm ON products_cache USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_cache_store_id ON products_cache(store_product_id);

-- Tracked products: user-selected products being monitored
CREATE TABLE IF NOT EXISTS tracked_products (
  id SERIAL PRIMARY KEY,
  store_product_id INTEGER UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  sku TEXT,
  brand TEXT,
  category TEXT,
  current_price NUMERIC(10,2),
  current_stock INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  last_successful_scrape_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price and stock history: ONLY from validated successful scrapes
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  tracked_product_id INTEGER NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  stock INTEGER NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(tracked_product_id, scraped_at DESC);

-- Scrape logs: every scrape attempt recorded honestly
CREATE TABLE IF NOT EXISTS scrape_logs (
  id SERIAL PRIMARY KEY,
  tracked_product_id INTEGER NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'RETRIED', 'FAILED')),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  duration_ms INTEGER,
  error_message TEXT,
  http_status INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product ON scrape_logs(tracked_product_id, created_at DESC);
