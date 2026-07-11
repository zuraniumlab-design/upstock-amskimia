import { useCallback, useEffect, useState } from 'react';
import './App.css';
import ProductGrid from './components/ProductGrid';
import ResiInput   from './components/ResiInput';
import BarangMasuk from './components/BarangMasuk';
import Riwayat     from './components/Riwayat';
import { fetchProducts } from './lib/api';

const TABS = [
  { icon: '📦', label: 'Stock'        },
  { icon: '📝', label: 'Input Resi'   },
  { icon: '📥', label: 'Barang Masuk' },
  { icon: '📋', label: 'Riwayat'      },
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errMsg,   setErrMsg]   = useState('');
  const [tab,      setTab]      = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setErrMsg('');
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      setErrMsg('Gagal koneksi ke database. Cek .env dan Supabase. (' + e.message + ')');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSkus = products.reduce((s, p) => s + p.skus.length, 0);
  const lowStock  = products.flatMap(p => p.skus).filter(s => !s.is_bulk && (s.qty ?? 0) === 0).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>AMS Kimia</h1>
          <p className="subtitle">Stock Opname · Divisi Online</p>
        </div>
        <div className="header-stats">
          <div className="stat-chip">
            <span className="stat-num">{products.length}</span>
            <span className="stat-lbl">Produk</span>
          </div>
          <div className="stat-chip">
            <span className="stat-num">{totalSkus}</span>
            <span className="stat-lbl">SKU</span>
          </div>
          {lowStock > 0 && (
            <div className="stat-chip warn">
              <span className="stat-num">{lowStock}</span>
              <span className="stat-lbl">Habis ⚠️</span>
            </div>
          )}
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((t, i) => (
          <button
            key={i}
            className={`tab-btn ${tab === i ? 'active' : ''}`}
            onClick={() => setTab(i)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {errMsg && <div className="banner-error">{errMsg}</div>}

      <main>
        {tab === 0 && <ProductGrid products={products} loading={loading} onRefresh={load} />}
        {tab === 1 && <ResiInput onRefresh={load} />}
        {tab === 2 && <BarangMasuk products={products} onRefresh={load} />}
        {tab === 3 && <Riwayat />}
      </main>
    </div>
  );
}
