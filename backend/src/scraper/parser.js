/**
 * Price and stock text parser.
 * 
 * WHY: The INE mock store displays prices in multiple formats:
 * - Standard: ₹12,999
 * - Spaced: ₹12 999
 * - Euro-style: ₹12.999,00
 * - Trailing: ₹12,999/- (incl. of all taxes)
 * - Unicode fullwidth digits: ₹１２,９９９
 * - NBSP-separated: ₹1​2​,​9​9​9 (with zero-width spaces)
 * - Lakh format: Rs. 12,999.00
 * 
 * We must handle ALL of these reliably.
 */

const { STOCK_PATTERNS, OUT_OF_STOCK_TEXT } = require('./selectors');

/**
 * Parse a price string from the store into a numeric value.
 * Handles all known INE store price formats.
 * 
 * @param {string} priceText - Raw price text from the DOM
 * @returns {number|null} - Parsed price as a number, or null if unparsable
 */
function parsePrice(priceText) {
  if (!priceText || typeof priceText !== 'string') {
    return null;
  }

  // Remove zero-width spaces (U+200B) and non-breaking spaces (U+00A0)
  let cleaned = priceText
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\u00A0/g, ' ')                      // NBSP → space
    .trim();

  // Convert Unicode fullwidth digits (０-９ = U+FF10-U+FF19) to ASCII
  cleaned = cleaned.replace(/[\uFF10-\uFF19]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 48);
  });

  // Remove currency symbols and text prefixes
  cleaned = cleaned
    .replace(/^[₹$€£¥Rs\.]+\s*/i, '')  // Currency symbols at start
    .replace(/\/-.*$/, '')               // Remove "/- (incl. of all taxes)"
    .replace(/,00$/, '')                 // Remove euro-style ",00" suffix
    .trim();

  // Remove spaces used as thousand separators (spaced format)
  cleaned = cleaned.replace(/\s/g, '');

  // Handle period as thousand separator (euro-style: 12.999 → 12999)
  // If the string has both dots and commas, determine which is the decimal separator.
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Euro style: dots are thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Standard style: commas are thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    // Pattern like 12.999 or 1.23.456 - dots are thousand separators
    cleaned = cleaned.replace(/\./g, '');
  }

  // Remove remaining commas (standard thousand separators)
  cleaned = cleaned.replace(/,/g, '');

  // Parse the final numeric string
  const price = parseFloat(cleaned);

  if (Number.isNaN(price) || !Number.isFinite(price)) {
    return null;
  }

  return price;
}

/**
 * Parse stock text from the store into a numeric count.
 * 
 * Known patterns:
 * - "In stock · 42 left"
 * - "Only 7 left"
 * - "15 in stock"
 * - "Selling fast — 3 left"
 * - "Hurry, just 2 left"
 * - "Out of stock"
 * 
 * @param {string} stockText - Raw stock text from the DOM
 * @returns {number|null} - Stock count (0 for out of stock), or null if unparsable
 */
function parseStock(stockText) {
  if (!stockText || typeof stockText !== 'string') {
    return null;
  }

  const trimmed = stockText.trim();

  // Check for out-of-stock first
  if (trimmed.toLowerCase().includes('out of stock')) {
    return 0;
  }

  // Try each known pattern
  for (const pattern of STOCK_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const stock = parseInt(match[1], 10);
      if (!Number.isNaN(stock) && stock >= 0) {
        return stock;
      }
    }
  }

  // Fallback: try to extract any number from the text
  const fallbackMatch = trimmed.match(/(\d+)/);
  if (fallbackMatch) {
    const stock = parseInt(fallbackMatch[1], 10);
    if (!Number.isNaN(stock) && stock >= 0) {
      return stock;
    }
  }

  return null;
}

/**
 * Extract the real price from the price block's visible content.
 * 
 * WHY this is complex: The store renders multiple price-like elements,
 * some hidden (decoys), some visible (real). We need the visible one.
 * The real price is in a dynamically-classed span inside .price-main
 * that has large font and is NOT display:none.
 * 
 * @param {Object} page - Playwright page object
 * @returns {Promise<string|null>} - Raw price text or null
 */
async function extractVisiblePriceText(page) {
  return await page.evaluate(() => {
    const priceMain = document.querySelector('.price-main');
    if (!priceMain) return null;

    // Get all child elements of .price-main
    const children = priceMain.children;
    
    for (const child of children) {
      const style = window.getComputedStyle(child);
      
      // Skip hidden elements (the decoy prices have display:none)
      if (style.display === 'none') continue;
      
      // Skip elements with line-through (MRP/strikethrough price)
      if (style.textDecoration.includes('line-through')) continue;
      
      // Skip small elements (badges like "X% off")
      const fontSize = parseFloat(style.fontSize);
      if (fontSize < 20) continue;
      
      // This should be the real price element - large, visible, no strikethrough
      const text = child.textContent?.trim();
      if (text && /[₹$€£¥]?\s*[\d,.\s\uFF10-\uFF19\u00A0\u200B]/.test(text)) {
        return text;
      }
    }

    // Fallback: look for any visible text with currency symbols in price-main
    const allSpans = priceMain.querySelectorAll('span');
    for (const span of allSpans) {
      const style = window.getComputedStyle(span);
      if (style.display === 'none') continue;
      if (style.textDecoration.includes('line-through')) continue;
      
      const text = span.textContent?.trim();
      if (text && text.length > 3 && /[₹$€£¥R]/.test(text) && /\d/.test(text)) {
        const fontSize = parseFloat(style.fontSize);
        if (fontSize >= 20) return text;
      }
    }

    return null;
  });
}

module.exports = { parsePrice, parseStock, extractVisiblePriceText };
