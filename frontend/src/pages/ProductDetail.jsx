import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import PriceChart from '../components/PriceChart';
import ScrapeLogTable from '../components/ScrapeLogTable';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chart');

  const loadData = useCallback(async () => {
    try {
      const [productRes, historyRes, logsRes] = await Promise.all([
        api.getTrackedProduct(id),
        api.getProductHistory(id),
        api.getProductLogs(id),
      ]);
      setProduct(productRes.data);
      setHistory(historyRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleScrape() {
    setScraping(true);
    setError(null);
    try {
      await api.triggerScrape(id);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setScraping(false);
    }
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN');
  }

  if (loading) return <div className="loading-state">Loading product...</div>;
  if (error && !product) return <div className="error-banner">{error}</div>;
  if (!product) return <div className="error-banner">Product not found</div>;

  return (
    <div className="product-detail">
      <Link to="/" className="back-link">← Back to Dashboard</Link>

      <div className="detail-header">
        <div>
          <span className="detail-category">{product.category}</span>
          <h1>{product.product_name}</h1>
          <p className="detail-meta">{product.brand} · SKU {product.sku}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleScrape}
          disabled={scraping}
        >
          {scraping ? 'Scraping...' : 'Scrape Now'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-card-label">Current Price</span>
          <span className="stat-card-value">{formatPrice(product.current_price)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Current Stock</span>
          <span className="stat-card-value">
            {product.current_stock !== null ? product.current_stock : '—'}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Last Successful Scrape</span>
          <span className="stat-card-value small">
            {formatDate(product.last_successful_scrape_at)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Tracking Since</span>
          <span className="stat-card-value small">
            {formatDate(product.created_at)}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >Price & Stock History</button>
        <button
          className={`tab ${activeTab === 'table' ? 'active' : ''}`}
          onClick={() => setActiveTab('table')}
        >History Table</button>
        <button
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >Scrape Logs ({logs.length})</button>
      </div>

      <div className="tab-content">
        {activeTab === 'chart' && (
          history.length === 0 ?
            <div className="empty-state">No price history yet. Trigger a scrape to start collecting data.</div> :
            <PriceChart history={history} />
        )}
        {activeTab === 'table' && (
          history.length === 0 ?
            <div className="empty-state">No history data available.</div> :
            <div className="history-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Price</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map(h => (
                    <tr key={h.id}>
                      <td>{formatDate(h.scraped_at)}</td>
                      <td>{formatPrice(h.price)}</td>
                      <td>{h.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}
        {activeTab === 'logs' && (
          logs.length === 0 ?
            <div className="empty-state">No scrape logs yet.</div> :
            <ScrapeLogTable logs={logs} />
        )}
      </div>
    </div>
  );
}
