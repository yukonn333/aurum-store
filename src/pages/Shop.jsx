import { useState } from 'react';
import { useApp } from '../ctx.js';
import { CATS } from '../utils.js';
import ProductCard from '../components/ProductCard.jsx';

// Vitrine (e também a página de favoritos, com onlyFavs)
export default function Shop({ onlyFavs }) {
  const { products, favs, canBuy } = useApp();
  const [cat, setCat] = useState('Todos');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('rel');

  let list = products.filter((p) => (!onlyFavs || favs.includes(p.id)) && (cat === 'Todos' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  if (sort === 'asc') list = [...list].sort((a, b) => a.price - b.price);
  if (sort === 'desc') list = [...list].sort((a, b) => b.price - a.price);
  if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <section className="hero">
        <h1>{onlyFavs ? 'Seus favoritos' : 'Peças que contam histórias.'}</h1>
        <p>{onlyFavs ? 'As peças que você marcou com ♥.' : canBuy ? 'Coleção de relógios, alianças e correntes com acabamento artesanal.' : 'Visualização da vitrine. Administradores não realizam compras.'}</p>
      </section>
      <div className="tools">
        {['Todos', ...CATS].map((c) => <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
        <select className="sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
          <option value="rel">Ordenar: padrão</option>
          <option value="asc">Menor preço</option>
          <option value="desc">Maior preço</option>
          <option value="az">Nome (A-Z)</option>
        </select>
        <input placeholder="Buscar peça…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!list.length && <p className="mut">{onlyFavs ? 'Você ainda não favoritou nenhuma peça.' : 'Nenhuma peça encontrada.'}</p>}
    </div>
  );
}
