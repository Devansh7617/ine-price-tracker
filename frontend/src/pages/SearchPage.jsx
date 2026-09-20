import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import './SearchPage.css';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const debouncedQuery = useDebounce(query, 400);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    api.searchProducts(debouncedQuery)
      .then(res => setResults(res.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  async function handleTrack(product) {
    setTrackingId(product.store_product_id);
    try {
      const res = await api.addTrackedProduct({
        store_product_id: product.store_product_id,
        product_name: product.name,
        sku: product.sku,
        brand: product.brand,
        category: product.category,
      });
      if (res.data?.id) {
        navigate(`/product/${res.data.id}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingId(null);
    }
  }

  return (
    <div className="search-page">
      <h1>Search Products</h1>
      <p className="search-subtitle">Search the INE mock store by product name</p>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by product name (e.g., headphones, laptop)..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
        {loading && <span className="search-spinner">Searching...</span>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && debouncedQuery && results.length === 0 && (
        <div className="empty-state">No products found for "{debouncedQuery}"</div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map(product => (
            <div key={product.store_product_id} className="search-result-card">
              <div className="result-info">
                <h3>{product.name}</h3>
                <p className="result-meta">
                  {product.brand} · {product.category} · SKU {product.sku}
                </p>
              </div>
              <button
                className="btn btn-track"
                onClick={() => handleTrack(product)}
                disabled={trackingId === product.store_product_id}
              >
                {trackingId === product.store_product_id ? 'Tracking...' : 'Track Product'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
