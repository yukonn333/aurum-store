import { Link } from 'react-router-dom';
import { useApp } from '../ctx.js';
import { brl } from '../utils.js';
import Thumb from './Thumb.jsx';

export default function ProductCard({ p }) {
  const { canBuy, add, favs, toggleFav } = useApp();
  const fav = favs.includes(p.id);
  return (
    <article className="card">
      <Link to={`/produto/${p.id}`}>
        <Thumb p={p}>{p.stock === 0 ? <em className="tag out">Esgotado</em> : p.stock <= 3 && <em className="tag">Últimas {p.stock}</em>}</Thumb>
      </Link>
      {canBuy && <button className="heart" aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'} onClick={() => toggleFav(p.id)}>{fav ? '♥' : '♡'}</button>}
      <div className="cb">
        <small>{p.cat}</small>
        <Link to={`/produto/${p.id}`}><h3>{p.name}</h3></Link>
        <p>{p.desc}</p>
        <div className="row">
          <b>{brl(p.price)}</b>
          {canBuy && <button className="btn sm" disabled={p.stock === 0} onClick={() => add(p)}>Adicionar</button>}
        </div>
      </div>
    </article>
  );
}
