/**
 * Product service — handles product catalog caching and search.
 * 
 * WHY: The INE store's catalog API does NOT support server-side search
 * (query params like ?q= and ?search= are ignored). So we:
 * 1. Fetch all 1000 products via HTTP (lightweight, no Playwright needed)
 * 2. Cache them in our Supabase products_cache table
 * 3. Perform fuzzy text search server-side
 * 
 * This avoids scraping the entire website on every user search request.
 */

const { supabase } = require('../database/supabase');
const { logger } = require('../utils/logger');

const MOCK_STORE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';
const PAGE_SIZE = 100; // Fetch in larger batches for efficiency

/**
 * Fetch all products from the INE store catalog API and cache in Supabase.
 * Uses plain HTTP — no browser needed for this.
 */
async function refreshProductCache() {
  logger.info('Refreshing product cache from INE store...');
  const uniqueProductsMap = new Map();
  let fetchCount = 0;
  const MAX_FETCHES = 100;
  const EXPECTED_TOTAL = 1000;

  try {
    while (uniqueProductsMap.size < EXPECTED_TOTAL && fetchCount < MAX_FETCHES) {
      fetchCount++;
      const url = `${MOCK_STORE_URL}/api/catalog?page=${(fetchCount % 17) + 1}&pageSize=${PAGE_SIZE}`;
      
      try {
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          logger.warn(`Catalog API returned ${response.status} on fetch ${fetchCount}`);
          await new Promise(r => setTimeout(r, 1000)); // backoff
          continue;
        }

        const text = await response.text();
        if (text.startsWith('<')) {
          // HTML error page (rate limit)
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const data = JSON.parse(text);
        let newItems = 0;
        
        for (const p of data.items) {
          if (!uniqueProductsMap.has(p.id)) {
            uniqueProductsMap.set(p.id, p);
            newItems++;
          }
        }
        
        if (fetchCount % 10 === 0) {
          logger.http(`Fetch ${fetchCount}: got ${uniqueProductsMap.size}/${EXPECTED_TOTAL} unique products`);
        }
        
        // Small delay to prevent rate limits
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        logger.warn(`Fetch ${fetchCount} failed: ${err.message}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    const uniqueProducts = Array.from(uniqueProductsMap.values());
    logger.info(`Finished catalog sync: ${uniqueProducts.length} unique products after ${fetchCount} fetches`);

    // Upsert into products_cache (using store_product_id as unique key)
    // Process in batches to avoid hitting Supabase limits
    const BATCH_SIZE = 200;
    for (let i = 0; i < uniqueProducts.length; i += BATCH_SIZE) {
      const batch = uniqueProducts.slice(i, i + BATCH_SIZE).map(p => ({
        store_product_id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        category: p.category,
        sku: p.sku,
        description: p.description,
        cached_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('products_cache')
        .upsert(batch, { onConflict: 'store_product_id' });

      if (error) {
        logger.error(`Cache upsert batch ${i} failed: ${error.message}`);
        throw error;
      }
    }

    logger.db(`Product cache refreshed: ${uniqueProducts.length} products`);
    return { count: uniqueProducts.length };
  } catch (err) {
    logger.error(`Product cache refresh failed: ${err.message}`);
    throw err;
  }
}

/**
 * Search products by partial or full name.
 * Uses PostgreSQL ILIKE for case-insensitive partial matching.
 * 
 * @param {string} query - Search term
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<Array>} - Matching products
 */
async function searchProducts(query, limit = 20) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('products_cache')
    .select('*')
    .ilike('name', searchTerm)
    .limit(limit)
    .order('name');

  if (error) {
    logger.error(`Search failed: ${error.message}`);
    throw error;
  }

  return data || [];
}

/**
 * Get the count of cached products.
 * Useful to know if the cache needs refreshing.
 */
async function getCacheCount() {
  const { count, error } = await supabase
    .from('products_cache')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count || 0;
}

module.exports = { refreshProductCache, searchProducts, getCacheCount };
