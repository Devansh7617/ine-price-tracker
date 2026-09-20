const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'TypeError') throw new Error('Network error: cannot reach backend');
    throw err;
  }
}

export const api = {
  searchProducts: (q) => request(`/products/search?q=${encodeURIComponent(q)}`),
  getTrackedProducts: () => request('/tracked-products'),
  addTrackedProduct: (product) => request('/tracked-products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  deleteTrackedProduct: (id) => request(`/tracked-products/${id}`, { method: 'DELETE' }),
  getTrackedProduct: (id) => request(`/tracked-products/${id}`),
  getProductHistory: (id) => request(`/tracked-products/${id}/history`),
  getProductLogs: (id) => request(`/tracked-products/${id}/logs`),
  triggerScrape: (id) => request(`/tracked-products/${id}/scrape`, { method: 'POST' }),
};
