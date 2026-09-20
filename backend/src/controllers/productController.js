/**
 * Product controller — handles product search and cache refresh endpoints.
 */

const { searchProducts, refreshProductCache, getCacheCount } = require('../services/productService');

/**
 * GET /api/products/search?q=term
 * Search cached products by partial or full name.
 */
async function searchProductsHandler(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [], query: '' });
    }

    // Auto-refresh cache if empty
    const cacheCount = await getCacheCount();
    if (cacheCount === 0) {
      await refreshProductCache();
    }

    const products = await searchProducts(q.trim(), 20);

    res.json({
      success: true,
      data: products,
      query: q.trim(),
      count: products.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/products/refresh-cache
 * Refresh the product cache from the INE store. Protected by cron auth.
 */
async function refreshProductCacheHandler(req, res, next) {
  try {
    const result = await refreshProductCache();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchProducts: searchProductsHandler,
  refreshProductCache: refreshProductCacheHandler,
};
