/**
 * Centralized CSS selectors for the INE mock store.
 * 
 * All selectors are derived from actual inspection of the live site
 * (see implementation_plan.md Phase 1 findings).
 * 
 * WHY centralized: If the store's DOM changes, we only update selectors here
 * rather than hunting through the entire codebase.
 */

const SELECTORS = {
  // === Product listing page ===
  productTile: 'article.tile',
  tileName: '.tile-name',
  tileBrand: '.tile-brand',
  tileCategory: '.tile-category',
  tileSku: '.tile-sku',
  tileCta: '.tile-cta',

  // === Product detail page ===
  detailSection: 'section.detail',
  productName: '.detail-info h1',
  productBrand: '.detail-brand',
  productCategory: '.detail-info .tile-category',
  productDescription: '.detail-desc',

  // === Price block (key scraping targets) ===
  priceBlock: '.price-block',
  priceBlockIdle: '.price-idle',
  priceBlockSuccess: '.price-success',
  priceBlockError: '.price-error',
  priceBlockLoading: '.price-block[aria-busy="true"]',
  revealPriceBtn: '.price-block .btn-primary',
  priceStatus: '.price-status',
  priceSubstatus: '.price-substatus',

  // === Price data (visible after successful reveal) ===
  priceMain: '.price-main',
  priceValue: '.price-value', // hidden span with decoy price
  dataPriceAttr: '[data-price="true"]', // hidden span with another decoy
  amountEl: '.amount', // another hidden element
  // The REAL price is in a dynamically-classed span inside .price-main
  // It's the visible, large-font element that is NOT display:none
  
  // === Stock ===
  stockBadge: '.stock-badge',
  stockInStock: '.stock-badge.in-stock',
  stockOutOfStock: '.stock-badge.out-stock',

  // === Price facets (additional info) ===
  priceFacets: '.price-facets',
  priceMeta: '.price-meta',
  refreshBtn: '.price-meta .btn-ghost',

  // === Cookie banner (appears randomly ~75% of page loads) ===
  cookieOverlay: '.cookie-overlay',
  cookieBanner: '.cookie-banner',
  cookieAcceptBtn: '.cookie-banner .btn-primary',
  cookieDeclineBtn: '.cookie-banner .btn-ghost',

  // === Pagination ===
  pagination: '.pagination',
  paginationStatus: '.pagination-status',

  // === General ===
  appRoot: '#root',
  siteMain: '.site-main',
  gridEmpty: '.grid-empty',
  gridError: '.grid-error',
  spinner: '.spinner',
};

/**
 * Stock text patterns used by the store.
 * The store uses 5 different patterns (identified from JS bundle analysis).
 * Each pattern contains the stock count as a number within the text.
 */
const STOCK_PATTERNS = [
  /In stock\s*[·•]\s*(\d+)\s*left/i,
  /Only\s+(\d+)\s+left/i,
  /(\d+)\s+in\s+stock/i,
  /Selling fast\s*[—–-]\s*(\d+)\s*left/i,
  /Hurry,?\s*just\s+(\d+)\s+left/i,
];

const OUT_OF_STOCK_TEXT = 'Out of stock';

module.exports = { SELECTORS, STOCK_PATTERNS, OUT_OF_STOCK_TEXT };
