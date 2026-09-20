/**
 * Tracked products controller — CRUD + history + logs + manual scrape.
 */

const { supabase } = require('../database/supabase');
const { scrapeProduct } = require('../scraper/index');
const { launchBrowser } = require('../scraper/priceScraper');
const { logger } = require('../utils/logger');

const MOCK_STORE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

/**
 * GET /api/tracked-products
 * List all tracked products.
 */
async function getTrackedProducts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('tracked_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tracked-products
 * Track a new product. Prevents duplicates via unique constraint.
 */
async function addTrackedProduct(req, res, next) {
  try {
    const { store_product_id, product_name, sku, brand, category } = req.body;

    if (!store_product_id || !product_name) {
      return res.status(400).json({
        success: false,
        error: 'store_product_id and product_name are required',
      });
    }

    const productUrl = `${MOCK_STORE_URL}/product/${store_product_id}`;

    // Use upsert to handle the duplicate case gracefully
    const { data, error } = await supabase
      .from('tracked_products')
      .upsert(
        {
          store_product_id,
          product_name,
          product_url: productUrl,
          sku: sku || null,
          brand: brand || null,
          category: category || null,
          is_active: true,
        },
        { onConflict: 'store_product_id' }
      )
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        // Return existing product
        const { data: existing } = await supabase
          .from('tracked_products')
          .select('*')
          .eq('store_product_id', store_product_id)
          .single();

        return res.status(200).json({
          success: true,
          data: existing,
          message: 'Product is already being tracked',
          duplicate: true,
        });
      }
      throw error;
    }

    logger.db(`Product tracked: ${product_name} (ID: ${store_product_id})`);

    res.status(201).json({
      success: true,
      data,
      message: 'Product is now being tracked',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tracked-products/:id
 * Get a single tracked product with latest info.
 */
async function getTrackedProduct(req, res, next) {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: 'Tracked product not found',
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/tracked-products/:id
 * Remove a product from tracking.
 */
async function deleteTrackedProduct(req, res, next) {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tracked_products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Product untracked' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tracked-products/:id/history
 * Get price and stock history for a tracked product.
 */
async function getProductHistory(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('tracked_product_id', id)
      .order('scraped_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tracked-products/:id/logs
 * Get scrape attempt logs for a tracked product.
 */
async function getProductLogs(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('tracked_product_id', id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tracked-products/:id/scrape
 * Trigger a manual scrape for a single product.
 */
async function triggerManualScrape(req, res, next) {
  try {
    const { id } = req.params;

    // Get the tracked product
    const { data: product, error } = await supabase
      .from('tracked_products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        error: 'Tracked product not found',
      });
    }

    // Launch browser and scrape
    const browser = await launchBrowser(false);
    try {
      const result = await scrapeProduct(browser, product);
      res.json({ success: true, data: result });
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrackedProducts,
  addTrackedProduct,
  getTrackedProduct,
  deleteTrackedProduct,
  getProductHistory,
  getProductLogs,
  triggerManualScrape,
};
