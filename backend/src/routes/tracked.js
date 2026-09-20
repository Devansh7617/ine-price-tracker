const express = require('express');
const router = express.Router();
const {
  getTrackedProducts,
  addTrackedProduct,
  getTrackedProduct,
  deleteTrackedProduct,
  getProductHistory,
  getProductLogs,
  triggerManualScrape,
} = require('../controllers/trackedController');

router.get('/', getTrackedProducts);
router.post('/', addTrackedProduct);
router.get('/:id', getTrackedProduct);
router.delete('/:id', deleteTrackedProduct);
router.get('/:id/history', getProductHistory);
router.get('/:id/logs', getProductLogs);
router.post('/:id/scrape', triggerManualScrape);

module.exports = router;
