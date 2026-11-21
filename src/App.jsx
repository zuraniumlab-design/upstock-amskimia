import { useCallback, useEffect, useState } from 'react';
import './App.css';
import ProductGrid from './components/ProductGrid';
import ResiInput   from './components/ResiInput';
import BarangMasuk from './components/BarangMasuk';
import Riwayat     from './components/Riwayat';
import Kelola      from './components/Kelola';
import { fetchProducts } from './lib/api';
import { getActor, setActor } from './lib/actor';

const TABS = [
  { icon: '🧪', label: 'Stock Kimia'  },
  { icon: '🍶', label: 'Botol'        },
  { icon: '📝', label: 'Input Resi'   },
  { icon: '📥', label: 'Barang Masuk' },
  { icon: '📋', label: 'Riwayat'      },
  { icon: '🛠️', label: 'Kelola'       },
];

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [errMsg,   setErrMsg]   = useState('');
  const [tab,      setTab]      = useState(0);
  const [actor,    setActorState] = useState(getActor() ?? '');

  // Muat ulang data tanpa mengedipkan layar (hanya pertama kali "loading")
  const refresh = useCallback(async () => {
    setErrMsg('');
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      setErrMsg('Gagal koneksi ke database. Cek .env dan Supabase. (' + e.message + ')');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const chemCount  = products.filter(p => (p.kind ?? 'chemical') === 'chemical').length;
  const bottleSkus = products.filter(p => p.kind === 'bottle').reduce((s, p) => s + p.skus.length, 0);
  const emptyCount = products
    .flatMap(p => p.skus.map(s => ({ ...s, kind: p.kind })))
    .filter(s => !s.is_bulk && Number(s.qty ?? 0) === 0).length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>AMS Kimia</h1>
          <p className="subtitle">Stock Opname · Divisi Online</p>
        </div>
        <div className="header-right">
          <input
            className="actor-input"
            type="text"
            value={actor}
            onChange={e => { setActorState(e.target.value); setActor(e.target.value); }}
            placeholder="👤 Nama kamu"
            title="Nama ini dicatat di Riwayat setiap kamu mengubah stock"
          />
          <div className="header-stats">
            <div className="stat-chip"><span className="stat-num">{chemCount}</span><span className="stat-lbl">Produk</span></div>
            <div className="stat-chip"><span className="stat-num">{bottleSkus}</span><span className="stat-lbl">Botol</span></div>
            {emptyCount > 0 && (
              <div className="stat-chip warn"><span className="stat-num">{emptyCount}</span><span className="stat-lbl">Kosong ⚠️</span></div>
            )}
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((t, i) => (
          <button key={i} className={`tab-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {errMsg && <div className="banner-error" style={{ margin: '14px 24px 0' }}>{errMsg}</div>}

      <main>
        {tab === 0 && <ProductGrid kind="chemical" products={products} loading={loading} onRefresh={refresh} />}
        {tab === 1 && <ProductGrid kind="bottle"   products={products} loading={loading} onRefresh={refresh} />}
        {tab === 2 && <ResiInput onRefresh={refresh} />}
        {tab === 3 && <BarangMasuk products={products} onRefresh={refresh} />}
        {tab === 4 && <Riwayat />}
        {tab === 5 && <Kelola products={products} onRefresh={refresh} />}
      </main>
    </div>
  );
}
