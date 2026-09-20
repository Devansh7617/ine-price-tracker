const express = require('express');
const router = express.Router();
const { searchProducts, refreshProductCache } = require('../controllers/productController');
const { cronAuth } = require('../middleware/cronAuth');

// Search cached products by name
router.get('/search', searchProducts);

// Refresh the product cache from the INE store (protected)
router.post('/refresh-cache', cronAuth, refreshProductCache);

module.exports = router;
