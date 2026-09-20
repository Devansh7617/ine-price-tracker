/**
 * Scraper orchestrator — coordinates the scraping pipeline.
 * 
 * This is the main entry point for scraping operations.
 * It handles:
 * 1. Browser lifecycle (launch once, reuse across products)
 * 2. Per-product scraping with retry logic
 * 3. Data validation before database writes
 * 4. Database operations (price_history, scrape_logs, tracked_products)
 * 5. Idempotent batch processing
 * 
 * KEY PRINCIPLE: Never store invalid data. Failures are logged honestly.
 */

const { launchBrowser, scrapeProductPrice } = require('./priceScraper');
const { withRetry } = require('./retryManager');
const { validateScrapedData } = require('./validators');
const { logger } = require('../utils/logger');
const { supabase } = require('../database/supabase');

// Track whether a batch scrape is currently running to prevent overlaps
let isBatchRunning = false;

/**
 * Scrape a single product with retry logic and database persistence.
 * 
 * @param {import('playwright').Browser} browser - Shared browser instance
 * @param {Object} product - Tracked product record from database
 * @param {Object} options - { headed }
 * @returns {Promise<Object>} - Result summary
 */
async function scrapeProduct(browser, product, options = {}) {
  const startTime = Date.now();
  
  logger.scrape(product.product_name, 'Starting scrape');

  // Execute scraping with retry logic
  const result = await withRetry(
    async (attempt) => {
      return await scrapeProductPrice(browser, {
        store_product_id: product.store_product_id,
        product_name: product.product_name,
        product_url: product.product_url,
      }, options);
    },
    { productName: product.product_name }
  );

  const totalDuration = Date.now() - startTime;

  if (result.success) {
    // Validate scraped data before storing
    const validation = validateScrapedData({
      price: result.data.price,
      stock: result.data.stock,
      productName: result.data.productName,
      expectedName: product.product_name,
    });

    if (!validation.valid) {
      // Data extracted but failed validation — treat as failure
      logger.fail(product.product_name, `Validation failed: ${validation.errors.join(', ')}`);
      
      await recordScrapeLog(product.id, {
        status: 'FAILED',
        attempt_number: result.attempts,
        duration_ms: totalDuration,
        error_message: `Validation failed: ${validation.errors.join(', ')}`,
        details: { errors: validation.errors, rawData: result.data },
      });

      return { success: false, product: product.product_name, reason: 'validation_failed' };
    }

    // Data is valid — store it
    logger.db(`Saving price: ${result.data.price}, stock: ${result.data.stock}`);

    // Update tracked product's current values
    await updateTrackedProduct(product.id, result.data.price, result.data.stock);
    
    // Insert price history
    await insertPriceHistory(product.id, result.data.price, result.data.stock);
    
    // Log success
    await recordScrapeLog(product.id, {
      status: result.finalStatus, // 'SUCCESS' or 'RETRIED'
      attempt_number: result.attempts,
      duration_ms: totalDuration,
      details: { price: result.data.price, stock: result.data.stock },
    });

    logger.success(product.product_name, 
      `Price: ${result.data.price}, Stock: ${result.data.stock} (${result.attempts} attempt(s), ${totalDuration}ms)`
    );

    return { success: true, product: product.product_name, price: result.data.price, stock: result.data.stock };
  } else {
    // All retries failed — log the failure
    logger.fail(product.product_name, 
      `All ${result.attempts} attempts failed. Last error: ${result.lastError}. No invalid data stored.`
    );

    await recordScrapeLog(product.id, {
      status: 'FAILED',
      attempt_number: result.attempts,
      duration_ms: totalDuration,
      error_message: result.lastError,
      details: { errors: result.errors },
    });

    return { success: false, product: product.product_name, reason: result.lastError };
  }
}

/**
 * Run a batch scrape for all active tracked products.
 * Prevents overlapping runs (idempotent).
 * 
 * @param {Object} options - { headed }
 * @returns {Promise<Object>} - Batch results summary
 */
async function runBatchScrape(options = {}) {
  if (isBatchRunning) {
    logger.warn('Batch scrape already running, skipping');
    return { skipped: true, reason: 'already_running' };
  }

  isBatchRunning = true;
  const batchStart = Date.now();
  let browser = null;

  try {
    // Get all active tracked products
    const { data: products, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch tracked products: ${error.message}`);
    }

    if (!products || products.length === 0) {
      logger.info('No active tracked products to scrape');
      return { success: true, scraped: 0, results: [] };
    }

    logger.info(`Starting batch scrape for ${products.length} product(s)`);

    // Launch browser once, reuse across products
    browser = await launchBrowser(options.headed || false);
    const results = [];

    // Process products sequentially to avoid overwhelming the store
    for (const product of products) {
      try {
        const result = await scrapeProduct(browser, product, options);
        results.push(result);
      } catch (err) {
        // Catch unexpected errors so one product doesn't crash the batch
        logger.error(`Unexpected error scraping ${product.product_name}: ${err.message}`);
        results.push({
          success: false,
          product: product.product_name,
          reason: `Unexpected: ${err.message}`,
        });
      }

      // Small delay between products to be respectful
      if (products.indexOf(product) < products.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const batchDuration = Date.now() - batchStart;
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(
      `Batch scrape complete: ${succeeded} succeeded, ${failed} failed, ${batchDuration}ms total`
    );

    return {
      success: true,
      scraped: products.length,
      succeeded,
      failed,
      duration_ms: batchDuration,
      results,
    };
  } catch (err) {
    logger.error(`Batch scrape failed: ${err.message}`);
    throw err;
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close().catch(() => {});
    }
    isBatchRunning = false;
  }
}

// === Database operations ===

async function updateTrackedProduct(trackedProductId, price, stock) {
  const { error } = await supabase
    .from('tracked_products')
    .update({
      current_price: price,
      current_stock: stock,
      last_scraped_at: new Date().toISOString(),
      last_successful_scrape_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', trackedProductId);

  if (error) {
    logger.error(`Failed to update tracked product ${trackedProductId}: ${error.message}`);
    throw new Error(`Database update failed: ${error.message}`);
  }
}

async function insertPriceHistory(trackedProductId, price, stock) {
  const { error } = await supabase
    .from('price_history')
    .insert({
      tracked_product_id: trackedProductId,
      price,
      stock,
      scraped_at: new Date().toISOString(),
    });

  if (error) {
    logger.error(`Failed to insert price history: ${error.message}`);
    throw new Error(`Price history insert failed: ${error.message}`);
  }

  logger.db('Price history inserted');
}

async function recordScrapeLog(trackedProductId, logData) {
  const { error } = await supabase
    .from('scrape_logs')
    .insert({
      tracked_product_id: trackedProductId,
      status: logData.status,
      attempt_number: logData.attempt_number,
      max_attempts: parseInt(process.env.SCRAPE_MAX_RETRIES) || 3,
      duration_ms: logData.duration_ms,
      error_message: logData.error_message || null,
      http_status: logData.http_status || null,
      details: logData.details || null,
      created_at: new Date().toISOString(),
    });

  if (error) {
    // Log insertion failure is serious but shouldn't crash the scraper
    logger.error(`Failed to insert scrape log: ${error.message}`);
  }
}

module.exports = { scrapeProduct, runBatchScrape };
