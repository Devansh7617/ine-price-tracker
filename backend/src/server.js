require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const productRoutes = require('./routes/products');
const trackedRoutes = require('./routes/tracked');
const scrapeRoutes = require('./routes/scrape');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/tracked-products', trackedRoutes);
app.use('/api/scrape', scrapeRoutes);

// Centralized error handler - must be last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
});

module.exports = app;
