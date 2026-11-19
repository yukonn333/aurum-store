import { EMO, GR } from '../utils.js';

// Foto do produto; sem foto, mostra o ícone da categoria
export default function Thumb({ p, className = '', children }) {
  return (
    <div className={`thumb ${GR[p.cat]} ${className}`}>
      {p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <span>{EMO[p.cat]}</span>}
      {children}
    </div>
  );
}
