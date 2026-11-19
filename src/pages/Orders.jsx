import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../ctx.js';
import OrderList from '../components/OrderList.jsx';

export default function Orders() {
  const { flash, reload } = useApp();
  const [orders, setOrders] = useState(null);
  const load = () => api.get('/orders/mine').then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm('Cancelar este pedido?')) return;
    try { await api.patch(`/orders/${id}/cancel`); await load(); reload(); flash('Pedido cancelado'); }
    catch (e) { flash(e.message); }
  };

  if (!orders) return <p className="mut">Carregando…</p>;
  return (
    <div>
      <h2>Meus pedidos</h2>
      {orders.length ? <OrderList orders={orders} onCancel={cancel} /> : <p className="mut">Você ainda não fez pedidos.</p>}
    </div>
  );
}
