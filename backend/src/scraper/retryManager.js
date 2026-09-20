/**
 * Retry manager with exponential backoff.
 * 
 * WHY: The INE mock store intentionally has slow responses and errors.
 * A single attempt is not reliable enough for unattended operation.
 * 
 * Strategy:
 * - Max 3 attempts (configurable via env)
 * - Exponential backoff: 2s → 4s → 8s
 * - Differentiate retryable vs non-retryable errors
 * - Log every attempt honestly
 */

const { logger } = require('../utils/logger');

// Error types that should NOT be retried
// (retrying won't help because the fundamental problem won't change)
const NON_RETRYABLE_ERRORS = [
  'VALIDATION_FAILED',      // Page returned wrong product
  'PRODUCT_NOT_FOUND',      // Product page doesn't exist (404)
  'PAGE_STRUCTURE_CHANGED', // DOM structure is fundamentally different
];

/**
 * Execute a function with retry logic and exponential backoff.
 * 
 * @param {Function} fn - Async function to execute
 * @param {Object} options
 * @param {string} options.productName - Product name for logging
 * @param {number} options.maxRetries - Max number of attempts (default: 3)
 * @param {number} options.baseDelayMs - Base delay in ms (default: 2000)
 * @returns {Promise<Object>} - { success, data, attempts, errors }
 */
async function withRetry(fn, {
  productName = 'Unknown',
  maxRetries = parseInt(process.env.SCRAPE_MAX_RETRIES) || 3,
  baseDelayMs = parseInt(process.env.SCRAPE_RETRY_BASE_MS) || 2000,
} = {}) {
  const errors = [];
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      logger.attempt(productName, attempt, maxRetries, 'Starting');
      const result = await fn(attempt);
      const duration = Date.now() - startTime;

      logger.success(productName, `Completed in ${duration}ms (attempt ${attempt})`);

      return {
        success: true,
        data: result,
        attempts: attempt,
        finalStatus: attempt > 1 ? 'RETRIED' : 'SUCCESS',
        duration,
        errors,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorInfo = {
        attempt,
        message: error.message,
        code: error.code,
        duration,
      };
      errors.push(errorInfo);
      lastError = error;

      logger.fail(productName, `Attempt ${attempt}: ${error.message} (${duration}ms)`);

      // Don't retry non-retryable errors
      if (NON_RETRYABLE_ERRORS.includes(error.code)) {
        logger.warn(`${productName}: Non-retryable error (${error.code}), stopping`);
        break;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        logger.retry(productName, attempt + 1, `Waiting ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  // All attempts failed
  return {
    success: false,
    data: null,
    attempts: errors.length,
    finalStatus: 'FAILED',
    duration: errors.reduce((sum, e) => sum + e.duration, 0),
    errors,
    lastError: lastError?.message || 'Unknown error',
  };
}

/**
 * Create a typed scraper error with a code for retry classification.
 */
class ScrapeError extends Error {
  constructor(message, code = 'UNKNOWN', details = {}) {
    super(message);
    this.name = 'ScrapeError';
    this.code = code;
    this.details = details;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { withRetry, ScrapeError, sleep };
