/**
 * Middleware to authenticate cron job requests.
 * The external scheduler (cron-job.org) must send the CRON_SECRET
 * in the x-cron-secret header to access protected endpoints.
 */
function cronAuth(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('[CRON_AUTH] CRON_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: 'Server misconfigured',
    });
  }

  if (!secret || secret !== expectedSecret) {
    console.warn('[CRON_AUTH] Unauthorized cron request');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  next();
}

module.exports = { cronAuth };
