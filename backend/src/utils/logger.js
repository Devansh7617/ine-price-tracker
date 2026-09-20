/**
 * Structured logger for scraper operations.
 * Produces human-readable, timestamped log lines.
 * Never logs secrets or sensitive data.
 */

function formatTimestamp() {
  return new Date().toISOString();
}

const logger = {
  scrape(productName, message) {
    console.log(`[${formatTimestamp()}] [SCRAPE] Product: ${productName} | ${message}`);
  },

  attempt(productName, attempt, maxAttempts, message) {
    console.log(`[${formatTimestamp()}] [ATTEMPT ${attempt}/${maxAttempts}] ${productName} | ${message}`);
  },

  http(message) {
    console.log(`[${formatTimestamp()}] [HTTP] ${message}`);
  },

  parse(message) {
    console.log(`[${formatTimestamp()}] [PARSE] ${message}`);
  },

  db(message) {
    console.log(`[${formatTimestamp()}] [DATABASE] ${message}`);
  },

  success(productName, message) {
    console.log(`[${formatTimestamp()}] [SUCCESS] ${productName} | ${message}`);
  },

  fail(productName, message) {
    console.error(`[${formatTimestamp()}] [FAILED] ${productName} | ${message}`);
  },

  retry(productName, attempt, reason) {
    console.warn(`[${formatTimestamp()}] [RETRY] ${productName} | Attempt ${attempt} | Reason: ${reason}`);
  },

  warn(message) {
    console.warn(`[${formatTimestamp()}] [WARN] ${message}`);
  },

  info(message) {
    console.log(`[${formatTimestamp()}] [INFO] ${message}`);
  },

  error(message) {
    console.error(`[${formatTimestamp()}] [ERROR] ${message}`);
  },
};

module.exports = { logger };
