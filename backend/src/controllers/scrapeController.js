/**
 * Scrape controller — handles cron-triggered batch scraping.
 */

const { runBatchScrape } = require('../scraper/index');
const { logger } = require('../utils/logger');

/**
 * POST /api/scrape/run
 * Triggered by cron-job.org every 2 hours.
 * Protected by cronAuth middleware.
 */
async function runBatchScrapeHandler(req, res, next) {
  try {
    logger.info('Cron-triggered batch scrape started');

    const result = await runBatchScrape();

    if (result.skipped) {
      return res.status(409).json({
        success: false,
        message: 'Batch scrape already running',
      });
    }

    res.json({
      success: true,
      message: 'Batch scrape completed',
      ...result,
    });
  } catch (err) {
    logger.error(`Batch scrape endpoint error: ${err.message}`);
    next(err);
  }
}

module.exports = { runBatchScrape: runBatchScrapeHandler };
