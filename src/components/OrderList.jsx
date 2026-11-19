import { brl, STATUS } from '../utils.js';

// onStatus (admin) mostra o seletor de status; onCancel (cliente) mostra o botão cancelar nos pendentes
export default function OrderList({ orders, onStatus, onCancel }) {
  return orders.map((o) => (
    <div className="panel" key={o.id}>
      <div className="row">
        <b>Pedido #{o.id}</b>
        {onStatus ? (
          <select style={{ width: 'auto' }} value={o.status} disabled={o.status === 'Cancelado'} onChange={(e) => onStatus(o.id, e.target.value)}>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : <span className="badge">{o.status}</span>}
      </div>
      <p className="mut">{new Date(o.date).toLocaleString('pt-BR')}{onStatus ? ` · ${o.userName}` : ''}</p>
      {o.items.map((i) => <div className="ci" key={i.id}><span>{i.qty}× {i.name}</span><span>{brl(i.price * i.qty)}</span></div>)}
      <div className="sum">
        <span>Subtotal</span><span>{brl(o.subtotal ?? o.total)}</span>
        {o.discount > 0 && <><span>Desconto ({o.coupon})</span><span>− {brl(o.discount)}</span></>}
        {o.shipping !== undefined && <><span>Frete</span><span>{o.shipping ? brl(o.shipping) : 'Grátis'}</span></>}
        <b>Total</b><b>{brl(o.total)}</b>
      </div>
      {o.address && <p className="mut">Entrega: {o.address.street}, {o.address.number} · {o.address.district} · {o.address.city}/{o.address.state} · CEP {o.address.cep}</p>}
      {onCancel && o.status === 'Pendente' && <button className="btn bad sm" onClick={() => onCancel(o.id)}>Cancelar pedido</button>}
    </div>
  ));
}
