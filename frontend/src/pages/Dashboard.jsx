import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await api.getTrackedProducts();
      setProducts(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Stop tracking this product?')) return;
    try {
      await api.deleteTrackedProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    return `₹${Number(price).toLocaleString('en-IN')}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  if (loading) return <div className="loading-state">Loading tracked products...</div>;
  if (error) return <div className="error-banner">{error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Tracked Products</h1>
        <Link to="/search" className="btn btn-primary">+ Track New Product</Link>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <p>No products tracked yet.</p>
          <Link to="/search">Search and track your first product →</Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="card-header">
                <span className="card-category">{product.category}</span>
                <button
                  className="btn-remove"
                  onClick={() => handleDelete(product.id)}
                  title="Stop tracking"
                >×</button>
              </div>
              <Link to={`/product/${product.id}`} className="card-link">
                <h3>{product.product_name}</h3>
              </Link>
              <p className="card-brand">{product.brand} · SKU {product.sku}</p>
              <div className="card-stats">
                <div className="stat">
                  <span className="stat-label">Price</span>
                  <span className="stat-value price">{formatPrice(product.current_price)}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Stock</span>
                  <span className={`stat-value stock ${product.current_stock === 0 ? 'out' : ''}`}>
                    {product.current_stock !== null ? product.current_stock : '—'}
                  </span>
                </div>
              </div>
              <div className="card-footer">
                <span className="last-scrape">Last scrape: {formatDate(product.last_scraped_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
