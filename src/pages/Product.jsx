import { Link, useParams } from 'react-router-dom';
import { useApp } from '../ctx.js';
import { brl } from '../utils.js';
import Thumb from '../components/Thumb.jsx';
import ProductCard from '../components/ProductCard.jsx';

export default function Product() {
  const { id } = useParams();
  const { products, canBuy, add, favs, toggleFav } = useApp();
  const p = products.find((x) => x.id === Number(id));

  if (!p) return <div className="panel empty"><h2>Produto não encontrado</h2><Link className="btn" to="/">Voltar à loja</Link></div>;
  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  const fav = favs.includes(p.id);

  return (
    <div>
      <Link to="/" className="mut">← Voltar à loja</Link>
      <div className="detail">
        <Thumb p={p} className="big" />
        <div className="dinfo">
          <small className="gold">{p.cat}</small>
          <h1>{p.name}</h1>
          <b className="price">{brl(p.price)}</b>
          <p className="full">{p.desc || 'Sem descrição.'}</p>
          <p className="mut">{p.stock > 0 ? `${p.stock} em estoque` : 'Esgotado'}</p>
          {canBuy && (
            <div className="row" style={{ justifyContent: 'flex-start' }}>
              <button className="btn" disabled={p.stock === 0} onClick={() => add(p)}>Adicionar ao carrinho</button>
              <button className="btn ghost" onClick={() => toggleFav(p.id)}>{fav ? '♥ Favorito' : '♡ Favoritar'}</button>
            </div>
          )}
        </div>
      </div>
      {related.length > 0 && <><h2>Peças relacionadas</h2><div className="grid" style={{ marginTop: 14 }}>{related.map((r) => <ProductCard key={r.id} p={r} />)}</div></>}
    </div>
  );
}
