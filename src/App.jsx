import { useCallback, useEffect, useState } from 'react';
import './App.css';
import ProductGrid from './components/ProductGrid';
import ResiInput   from './components/ResiInput';
import Riwayat     from './components/Riwayat';
import { fetchProducts } from './lib/api';

const TABS = ['📦 Stock', '📝 Input Resi', '📋 Riwayat'];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errMsg,   setErrMsg]   = useState('');
  const [tab,      setTab]      = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      setErrMsg('❌ Gagal koneksi ke database. Cek .env dan pastikan Supabase sudah di-setup. (' + e.message + ')');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="app">
      <header>
        <div>
          <h1>Stock Opname Kimia</h1>
          <p className="subtitle">Aba Mandiri Sejahtera Kimia — Divisi Online</p>
        </div>
        <div className="header-stat">
          <span>{products.length} Produk</span>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            {t}
          </button>
        ))}
      </nav>

      {errMsg && <div className="error-banner">{errMsg}</div>}

      {tab === 0 && <ProductGrid products={products} loading={loading} onRefresh={load} />}
      {tab === 1 && <ResiInput onRefresh={load} />}
      {tab === 2 && <Riwayat />}
    </div>
  );
}
