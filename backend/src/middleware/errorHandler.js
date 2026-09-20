/**
 * Centralized error handler.
 * Catches all unhandled errors and returns safe JSON responses.
 * Never exposes internal stack traces in production.
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);
  
  // Don't expose stack traces in production
  if (process.env.NODE_ENV !== 'development') {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: err.stack,
  });
}

module.exports = { errorHandler };
