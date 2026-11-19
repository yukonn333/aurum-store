import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, setToken } from './api.js';
import { Ctx } from './ctx.js';
import Auth from './pages/Auth.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';
import Admin from './pages/Admin.jsx';

const CartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.6 12.4a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6" />
  </svg>
);
const load = (k, id) => { try { return JSON.parse(localStorage.getItem(`${k}:${id}`)) || []; } catch { return []; } };
const store = (k, id, v) => { try { localStorage.setItem(`${k}:${id}`, JSON.stringify(v)); } catch { /* ignora */ } };
const tab = ({ isActive }) => 'tab' + (isActive ? ' on' : '');

export default function App() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [favs, setFavs] = useState([]);
  const [toast, setToast] = useState('');

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const reload = () => api.get('/products').then(setProducts).catch((e) => flash(e.message));

  useEffect(() => {
    reload();
    api.get('/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  // Carrinho e favoritos ficam salvos no navegador, separados por usuário
  useEffect(() => { if (user) { setCart(load('cart', user.id)); setFavs(load('fav', user.id)); } }, [user?.id]);
  useEffect(() => { if (user) store('cart', user.id, cart); }, [cart]);
  useEffect(() => { if (user) store('fav', user.id, favs); }, [favs]);

  if (!ready) return <p className="mut" style={{ padding: 24 }}>Carregando…</p>;
  const onAuth = ({ token, user }) => { setToken(token); setUser(user); nav(user.role === 'admin' ? '/admin' : '/'); };
  const logout = () => { setToken(null); setUser(null); setCart([]); setFavs([]); nav('/'); };
  if (!user) return <Auth onAuth={onAuth} />;

  const isAdmin = user.role === 'admin';
  const count = cart.reduce((s, c) => s + c.qty, 0);
  const add = (p) => {
    if (isAdmin) return;
    const c = cart.find((x) => x.id === p.id);
    const q = (c ? c.qty : 0) + 1;
    if (q > p.stock) return flash('Estoque máximo atingido');
    setCart(c ? cart.map((x) => (x.id === p.id ? { ...x, qty: q } : x)) : [...cart, { id: p.id, qty: 1 }]);
    flash(`${p.name} adicionado ao carrinho`);
  };
  const setQty = (id, d) => {
    const p = products.find((x) => x.id === id);
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: Math.min(p ? p.stock : c.qty, c.qty + d) } : c)).filter((c) => c.qty > 0));
  };
  const toggleFav = (id) => setFavs(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]);
  const guard = (ok, el) => (ok ? el : <Navigate to="/" replace />);

  const ctx = { user, products, cart, favs, canBuy: !isAdmin, add, setQty, clearCart: () => setCart([]), toggleFav, flash, reload };
  return (
    <Ctx.Provider value={ctx}>
      <header>
        <div className="wrap bar">
          <span className="brand">AURUM</span>
          <nav>
            {isAdmin ? <><NavLink to="/admin" className={tab}>Administração</NavLink><NavLink to="/" end className={tab}>Vitrine</NavLink></>
              : <><NavLink to="/" end className={tab}>Loja</NavLink><NavLink to="/favoritos" className={tab}>Favoritos</NavLink><NavLink to="/pedidos" className={tab}>Meus pedidos</NavLink></>}
          </nav>
          {!isAdmin && (
            <NavLink to="/carrinho" className={({ isActive }) => 'ico' + (isActive ? ' on' : '')} aria-label={`Carrinho, ${count} itens`}>
              <CartIcon />{count > 0 && <span className="bdg">{count}</span>}
            </NavLink>
          )}
          <span className="mut user">{user.name}{isAdmin ? ' · admin' : ''}</span>
          <button className="btn ghost sm" onClick={logout}>Sair</button>
        </div>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/produto/:id" element={<Product />} />
          <Route path="/favoritos" element={guard(!isAdmin, <Shop onlyFavs />)} />
          <Route path="/carrinho" element={guard(!isAdmin, <Cart />)} />
          <Route path="/pedidos" element={guard(!isAdmin, <Orders />)} />
          <Route path="/admin/:tab?" element={guard(isAdmin, <Admin />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </Ctx.Provider>
  );
}
