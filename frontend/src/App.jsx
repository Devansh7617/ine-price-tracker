import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="app-header">
          <NavLink to="/" className="app-brand" end>
            <span className="brand-icon">◧</span> INE Price Tracker
          </NavLink>
          <nav className="app-nav">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
              Dashboard
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Search
            </NavLink>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/product/:id" element={<ProductDetail />} />
          </Routes>
        </main>
        <footer className="app-footer">
          INE Product Price Tracker · Scraping every 2 hours via cron-job.org
        </footer>
      </div>
    </BrowserRouter>
  );
}
