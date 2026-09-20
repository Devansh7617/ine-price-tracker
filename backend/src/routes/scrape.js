const express = require('express');
const router = express.Router();
const { runBatchScrape } = require('../controllers/scrapeController');
const { cronAuth } = require('../middleware/cronAuth');

// Cron-triggered batch scrape (protected)
router.post('/run', cronAuth, runBatchScrape);

module.exports = router;
