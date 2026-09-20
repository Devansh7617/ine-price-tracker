/**
 * Playwright-based price and stock scraper for the INE mock store.
 * 
 * WHY Playwright is required:
 * The store's price/stock data is loaded via a complex JS flow involving
 * canvas fingerprinting, WebAssembly challenges, proof-of-work, and
 * encrypted responses. Plain HTTP cannot access this data.
 * 
 * This module handles:
 * 1. Browser lifecycle management
 * 2. Cookie banner dismissal
 * 3. Mouse hover simulation (required to enable price reveal)
 * 4. Price reveal button interaction
 * 5. Waiting for price data to load (with timeout)
 * 6. DOM extraction of price and stock
 * 7. Page structure change detection
 */

const { chromium } = require('playwright');
const { SELECTORS } = require('./selectors');
const { extractVisiblePriceText, parsePrice, parseStock } = require('./parser');
const { ScrapeError } = require('./retryManager');
const { logger } = require('../utils/logger');

const MOCK_STORE_URL = process.env.MOCK_STORE_URL || 'https://demo.inelabteamdev.com';
const NAVIGATION_TIMEOUT = parseInt(process.env.SCRAPE_TIMEOUT_MS) || 30000;
const PRICE_WAIT_TIMEOUT = parseInt(process.env.SCRAPE_PRICE_WAIT_MS) || 15000;

/**
 * Launch a Playwright browser instance.
 * @param {boolean} headed - Whether to show the browser window
 * @returns {Promise<import('playwright').Browser>}
 */
async function launchBrowser(headed = false) {
  logger.info(`Launching browser (headed: ${headed})`);
  return await chromium.launch({
    headless: !headed,
    // Slow down operations in headed mode so they're visible in recordings
    slowMo: headed ? 100 : 0,
  });
}

/**
 * Scrape price and stock for a single product.
 * 
 * @param {import('playwright').Browser} browser - Reusable browser instance
 * @param {Object} product - { store_product_id, product_name, product_url }
 * @param {Object} options - { headed }
 * @returns {Promise<{ price: number, stock: number, productName: string }>}
 * @throws {ScrapeError} with typed error code
 */
async function scrapeProductPrice(browser, product, { headed = false } = {}) {
  const { store_product_id, product_name, product_url } = product;
  const url = product_url || `${MOCK_STORE_URL}/product/${store_product_id}`;

  const context = await browser.newContext({
    // Use a realistic viewport and user agent
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to product page
    logger.http(`Navigating to ${url}`);
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: NAVIGATION_TIMEOUT,
    });

    if (!response) {
      throw new ScrapeError('No response received', 'NETWORK_ERROR');
    }

    const httpStatus = response.status();
    if (httpStatus >= 400) {
      throw new ScrapeError(
        `HTTP ${httpStatus}`,
        httpStatus === 404 ? 'PRODUCT_NOT_FOUND' : 'HTTP_ERROR',
        { httpStatus }
      );
    }

    // Step 2: Wait for the detail page to render
    logger.parse('Waiting for product detail section');
    try {
      await page.waitForSelector(SELECTORS.detailSection, { timeout: 10000 });
    } catch {
      // Check if this is an error page
      const errorEl = await page.$(SELECTORS.gridError);
      if (errorEl) {
        const errorText = await errorEl.textContent();
        throw new ScrapeError(`Store error: ${errorText}`, 'STORE_ERROR');
      }
      throw new ScrapeError('Product detail section not found', 'PAGE_STRUCTURE_CHANGED');
    }

    // Step 3: Verify product identity
    const scrapedName = await page.$eval(
      SELECTORS.productName,
      el => el.textContent?.trim()
    ).catch(() => null);

    if (!scrapedName) {
      throw new ScrapeError('Could not find product name on page', 'MISSING_SELECTOR');
    }

    logger.parse(`Product found: "${scrapedName}"`);

    // Step 4: Dismiss cookie banner if present
    await dismissCookieBanner(page);

    // Step 5: Locate the price block
    const priceBlock = await page.$(SELECTORS.priceBlock);
    if (!priceBlock) {
      throw new ScrapeError('Price block not found', 'PAGE_STRUCTURE_CHANGED');
    }

    // Step 6: Simulate mouse hover over price area
    // The store requires minimum 8 mouse moves and 600ms dwell time
    logger.parse('Simulating mouse hover over price area');
    await simulateMouseHover(page, priceBlock);

    // Step 7: Click "Reveal price" button
    logger.parse('Clicking Reveal price');
    const revealBtn = await page.$(SELECTORS.revealPriceBtn + ':not([disabled])');
    if (!revealBtn) {
      // Button might still be disabled - wait a bit more
      await page.waitForTimeout(500);
      const retryBtn = await page.$(SELECTORS.revealPriceBtn + ':not([disabled])');
      if (!retryBtn) {
        throw new ScrapeError('Reveal price button is disabled', 'INTERACTION_FAILED');
      }
      await retryBtn.click({ force: true });
    } else {
      await revealBtn.click({ force: true });
    }

    // Step 8: Wait for price to load
    // The price block transitions: idle → loading → (retrying)* → success|error
    logger.parse('Waiting for price to load...');
    const priceLoaded = await waitForPriceLoad(page);

    if (!priceLoaded) {
      // Check if the price block shows an error state
      const errorBlock = await page.$(SELECTORS.priceBlockError);
      if (errorBlock) {
        const errorText = await errorBlock.$eval(
          SELECTORS.priceStatus,
          el => el.textContent
        ).catch(() => 'Unknown error');
        throw new ScrapeError(`Store price error: ${errorText}`, 'PRICE_LOAD_FAILED');
      }
      throw new ScrapeError('Price did not load within timeout', 'TIMEOUT');
    }

    // Step 9: Extract price from rendered DOM
    logger.parse('Extracting price');
    const rawPriceText = await extractVisiblePriceText(page);
    if (!rawPriceText) {
      throw new ScrapeError('Could not extract price text from DOM', 'MISSING_PRICE');
    }

    const price = parsePrice(rawPriceText);
    if (price === null) {
      throw new ScrapeError(
        `Could not parse price from text: "${rawPriceText}"`,
        'INVALID_PRICE'
      );
    }
    logger.parse(`Price extracted: ${price} (raw: "${rawPriceText}")`);

    // Step 10: Extract stock from rendered DOM
    logger.parse('Extracting stock');
    const stockBadge = await page.$(SELECTORS.stockBadge);
    if (!stockBadge) {
      throw new ScrapeError('Stock badge not found', 'MISSING_STOCK');
    }

    const rawStockText = await stockBadge.textContent();
    const stock = parseStock(rawStockText);
    if (stock === null) {
      throw new ScrapeError(
        `Could not parse stock from text: "${rawStockText}"`,
        'INVALID_STOCK'
      );
    }
    logger.parse(`Stock extracted: ${stock} (raw: "${rawStockText}")`);

    return {
      price,
      stock,
      productName: scrapedName,
    };
  } finally {
    // Always clean up the page and context to prevent memory leaks
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

/**
 * Dismiss the cookie consent banner if present.
 * The store shows this randomly (~75% of page loads).
 */
async function dismissCookieBanner(page) {
  try {
    const banner = await page.$(SELECTORS.cookieOverlay);
    if (banner) {
      logger.parse('Cookie banner detected, dismissing');
      const acceptBtn = await page.$(SELECTORS.cookieAcceptBtn);
      if (acceptBtn) {
        await acceptBtn.click({ force: true });
        // May need multiple clicks (store's banner has click-count requirement)
        await page.waitForTimeout(300);
        const stillVisible = await page.$(SELECTORS.cookieOverlay);
        if (stillVisible) {
          const declineBtn = await page.$(SELECTORS.cookieDeclineBtn);
          if (declineBtn) await declineBtn.click({ force: true });
          await page.waitForTimeout(300);
          // Try accept again if banner is still showing
          const btn = await page.$(SELECTORS.cookieAcceptBtn);
          if (btn) await btn.click({ force: true });
        }
      }
      await page.waitForTimeout(500);
    }
  } catch (err) {
    // Cookie banner dismissal is non-critical
    logger.warn(`Cookie banner dismissal issue: ${err.message}`);
  }
}

/**
 * Simulate realistic mouse hover over the price block area.
 * The store requires minimum 8 mouse moves and 600ms dwell time
 * before enabling the "Reveal price" button.
 */
async function simulateMouseHover(page, element) {
  const box = await element.boundingBox();
  if (!box) {
    throw new ScrapeError('Cannot get price block bounding box', 'INTERACTION_FAILED');
  }

  // Enter the element area first
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  
  // Perform 12 natural-looking mouse movements across the price area
  for (let i = 0; i < 12; i++) {
    const x = box.x + 10 + Math.random() * (box.width - 20);
    const y = box.y + 5 + Math.random() * (box.height - 10);
    await page.mouse.move(x, y, { steps: 2 });
    // Small random delay between moves (40-100ms)
    await page.waitForTimeout(40 + Math.random() * 60);
  }

  // Ensure we've met the 600ms minimum dwell time
  await page.waitForTimeout(700);
}

/**
 * Wait for the price to finish loading.
 * Handles the loading → retrying → success/error state transitions.
 * 
 * @returns {Promise<boolean>} - true if price loaded successfully
 */
async function waitForPriceLoad(page) {
  const deadline = Date.now() + PRICE_WAIT_TIMEOUT;

  while (Date.now() < deadline) {
    // Check for success state
    const successBlock = await page.$(SELECTORS.priceBlockSuccess);
    if (successBlock) {
      return true;
    }

    // Check for error state
    const errorBlock = await page.$(SELECTORS.priceBlockError);
    if (errorBlock) {
      return false;
    }

    // Check if still loading/retrying
    const loadingBlock = await page.$(SELECTORS.priceBlockLoading);
    const statusText = await page.$eval(
      SELECTORS.priceStatus,
      el => el.textContent
    ).catch(() => '');

    if (statusText.includes('Retrying')) {
      logger.parse(`Store is retrying: ${statusText}`);
    }

    // Wait a bit before checking again
    await page.waitForTimeout(500);
  }

  return false;
}

module.exports = {
  launchBrowser,
  scrapeProductPrice,
  dismissCookieBanner,
  simulateMouseHover,
  waitForPriceLoad,
};
