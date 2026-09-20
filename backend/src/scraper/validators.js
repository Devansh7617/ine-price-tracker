/**
 * Data validators for scraped product information.
 * 
 * WHY: The mock store intentionally returns slow responses, errors, and
 * changing prices. We must NEVER store invalid data. Every value must pass
 * validation before being written to the database.
 * 
 * A scraper that returns "success" with incorrect values is WORSE than
 * one that honestly reports failure.
 */

/**
 * Validate a scraped price value.
 * @param {*} price - The parsed price (should be a number)
 * @returns {{ valid: boolean, reason?: string }}
 */
function validatePrice(price) {
  if (price === null || price === undefined) {
    return { valid: false, reason: 'Price is null/undefined' };
  }

  if (typeof price !== 'number') {
    return { valid: false, reason: `Price is not a number: ${typeof price}` };
  }

  if (Number.isNaN(price)) {
    return { valid: false, reason: 'Price is NaN' };
  }

  if (!Number.isFinite(price)) {
    return { valid: false, reason: 'Price is Infinity' };
  }

  if (price < 0) {
    return { valid: false, reason: `Price is negative: ${price}` };
  }

  // Sanity check: INE store prices should be reasonable
  // (fictional products, but typically in range 100 - 500,000 INR)
  if (price > 10000000) {
    return { valid: false, reason: `Price suspiciously high: ${price}` };
  }

  return { valid: true };
}

/**
 * Validate a scraped stock value.
 * @param {*} stock - The parsed stock count (should be a number)
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateStock(stock) {
  if (stock === null || stock === undefined) {
    return { valid: false, reason: 'Stock is null/undefined' };
  }

  if (typeof stock !== 'number') {
    return { valid: false, reason: `Stock is not a number: ${typeof stock}` };
  }

  if (Number.isNaN(stock)) {
    return { valid: false, reason: 'Stock is NaN' };
  }

  if (!Number.isFinite(stock)) {
    return { valid: false, reason: 'Stock is Infinity' };
  }

  if (!Number.isInteger(stock)) {
    return { valid: false, reason: `Stock is not an integer: ${stock}` };
  }

  if (stock < 0) {
    return { valid: false, reason: `Stock is negative: ${stock}` };
  }

  return { valid: true };
}

/**
 * Validate that the scraped page belongs to the expected product.
 * Prevents saving data from wrong product pages.
 * @param {string} expectedName - The product name we expect
 * @param {string} scrapedName - The product name found on the page
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateProductIdentity(expectedName, scrapedName) {
  if (!scrapedName || typeof scrapedName !== 'string') {
    return { valid: false, reason: 'Scraped product name is empty' };
  }

  if (!expectedName || typeof expectedName !== 'string') {
    return { valid: false, reason: 'Expected product name is empty' };
  }

  // Normalize for comparison (trim whitespace, lowercase)
  const normalized = scrapedName.trim().toLowerCase();
  const expected = expectedName.trim().toLowerCase();

  if (normalized !== expected) {
    return {
      valid: false,
      reason: `Product mismatch: expected "${expectedName}", found "${scrapedName}"`,
    };
  }

  return { valid: true };
}

/**
 * Run all validations on scraped data.
 * Returns a combined result indicating whether data is safe to store.
 * @param {Object} data - { price, stock, productName, expectedName }
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateScrapedData({ price, stock, productName, expectedName }) {
  const errors = [];

  const priceResult = validatePrice(price);
  if (!priceResult.valid) errors.push(priceResult.reason);

  const stockResult = validateStock(stock);
  if (!stockResult.valid) errors.push(stockResult.reason);

  const identityResult = validateProductIdentity(expectedName, productName);
  if (!identityResult.valid) errors.push(identityResult.reason);

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validatePrice,
  validateStock,
  validateProductIdentity,
  validateScrapedData,
};
