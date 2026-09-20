/**
 * Headed scraper mode — visually demonstrates the scraping process.
 * 
 * Usage: npm run scrape:headed
 * 
 * This script:
 * 1. Opens a visible browser window
 * 2. Navigates to the INE mock store
 * 3. Performs price/stock scraping with visible interactions
 * 4. Shows retry behavior when the store is slow
 * 5. Produces detailed console logs for the recording
 * 
 * Designed for the 2-4 minute screen recording requirement.
 */

require('dotenv').config();
const { launchBrowser, scrapeProductPrice } = require('../src/scraper/priceScraper');
const { withRetry } = require('../src/scraper/retryManager');
const { validateScrapedData } = require('../src/scraper/validators');
const { logger } = require('../src/utils/logger');

async function runHeadedScrape() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  INE Product Price Tracker — Headed Scraper Mode');
  console.log('='.repeat(60));
  console.log('');
  
  // Default test product — can be overridden via CLI args
  const productId = parseInt(process.argv[2]) || 1;
  const productName = process.argv[3] || 'Test Product';
  const MOCK_STORE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';

  const product = {
    store_product_id: productId,
    product_name: productName,
    product_url: `${MOCK_STORE_URL}/product/${productId}`,
  };

  logger.info(`Target product: ID ${productId} at ${product.product_url}`);
  console.log('');

  let browser;
  try {
    // Launch browser in headed mode (visible window)
    browser = await launchBrowser(true);

    // Scrape with retry logic
    const result = await withRetry(
      async (attempt) => {
        return await scrapeProductPrice(browser, product, { headed: true });
      },
      { productName: `Product #${productId}` }
    );

    console.log('');
    console.log('='.repeat(60));

    if (result.success) {
      // Validate the data
      const validation = validateScrapedData({
        price: result.data.price,
        stock: result.data.stock,
        productName: result.data.productName,
        expectedName: result.data.productName, // Use scraped name as expected for demo
      });

      if (validation.valid) {
        console.log('  ✅ SCRAPE SUCCESSFUL');
        console.log(`  Product: ${result.data.productName}`);
        console.log(`  Price:   ${result.data.price}`);
        console.log(`  Stock:   ${result.data.stock}`);
        console.log(`  Attempts: ${result.attempts}`);
        console.log(`  Status:  ${result.finalStatus}`);
      } else {
        console.log('  ❌ VALIDATION FAILED');
        console.log(`  Errors: ${validation.errors.join(', ')}`);
        console.log('  No invalid data would be stored.');
      }
    } else {
      console.log('  ❌ SCRAPE FAILED');
      console.log(`  Attempts: ${result.attempts}`);
      console.log(`  Last error: ${result.lastError}`);
      console.log('  No invalid data stored.');
    }

    console.log('='.repeat(60));
    console.log('');
  } catch (err) {
    console.error('');
    console.error('  ❌ UNEXPECTED ERROR');
    console.error(`  ${err.message}`);
    console.error('');
  } finally {
    if (browser) {
      // Keep browser open for a moment so the recording can show the result
      console.log('Browser will close in 5 seconds...');
      await new Promise(r => setTimeout(r, 5000));
      await browser.close().catch(() => {});
    }
  }
}

runHeadedScrape().catch(console.error);
