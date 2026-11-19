import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.js';
import { brl, CATS, downloadCsv, resizeImage } from '../utils.js';
import OrderList from '../components/OrderList.jsx';
import Chart from '../components/Chart.jsx';

const TABS = [['resumo', 'Resumo'], ['produtos', 'Produtos'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes']];

function ProductForm({ edit, onClose, onSave, flash }) {
  const [img, setImg] = useState(edit.image || null);
  const [changed, setChanged] = useState(false);
  const pick = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { setImg(await resizeImage(f)); setChanged(true); } catch (er) { flash(er.message); }
  };
  const submit = (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    onSave({
      name: f.name, cat: f.cat, price: parseFloat(f.price), stock: parseInt(f.stock, 10), desc: f.desc,
      ...(changed && img ? { image: img } : {}), ...(changed && !img ? { removeImage: true } : {}),
    });
  };
  return (
    <div className="ov" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{edit.id ? 'Editar produto' : 'Novo produto'}</h2>
        {img && <img className="pv" src={img} alt="Prévia" />}
        <label>Foto do produto (JPG, PNG ou WebP)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} /></label>
        {img && <button type="button" className="btn bad sm" onClick={() => { setImg(null); setChanged(true); }}>Remover foto</button>}
        <label>Nome<input name="name" defaultValue={edit.name} required maxLength={80} /></label>
        <label>Categoria<select name="cat" defaultValue={edit.cat}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Preço (R$)<input name="price" type="number" step="0.01" min="0.01" defaultValue={edit.price} required /></label>
        <label>Estoque<input name="stock" type="number" step="1" min="0" defaultValue={edit.stock} required /></label>
        <label>Descrição<textarea name="desc" rows="4" maxLength={1000} defaultValue={edit.desc} /></label>
        <div className="row"><button type="button" className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn">Salvar</button></div>
      </form>
    </div>
  );
}

export default function Admin() {
  const { products, reload, flash } = useApp();
  const { tab = 'resumo' } = useParams();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [mode, setMode] = useState('dia');

  const loadAll = () => {
    api.get('/orders').then(setOrders).catch((e) => flash(e.message));
    api.get('/customers').then(setCustomers).catch((e) => flash(e.message));
  };
  useEffect(() => { loadAll(); }, []);

  const valid = orders.filter((o) => o.status !== 'Cancelado');
  const revenue = valid.reduce((s, o) => s + o.total, 0);
  const low = products.filter((p) => p.stock <= 3);
  const sold = {};
  valid.forEach((o) => o.items.forEach((i) => { sold[i.name] = (sold[i.name] || 0) + i.qty; }));
  const top = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const dkey = (d) => d.toLocaleDateString('pt-BR');
  const byDay = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return [dkey(d).slice(0, 5), valid.filter((o) => dkey(new Date(o.date)) === dkey(d)).reduce((s, o) => s + o.total, 0)];
  });
  const byCat = CATS.map((c) => [c, valid.reduce((s, o) => s + o.items.filter((i) => i.cat === c).reduce((a, i) => a + i.price * i.qty, 0), 0)]);

  const save = async (body) => {
    try {
      if (edit.id) await api.put('/products/' + edit.id, body); else await api.post('/products', body);
      setEdit(null); await reload(); flash('Produto salvo');
    } catch (err) { flash(err.message); }
  };
  const del = async (id) => {
    if (!confirm('Excluir este produto?')) return;
    try { await api.del('/products/' + id); await reload(); } catch (e) { flash(e.message); }
  };
  const setStatus = async (id, status) => {
    try { await api.patch(`/orders/${id}/status`, { status }); loadAll(); reload(); } catch (e) { flash(e.message); }
  };
  const exportCsv = () => downloadCsv('pedidos-aurum.csv', [
    ['Pedido', 'Data', 'Cliente', 'Status', 'Itens', 'Subtotal', 'Desconto', 'Cupom', 'Frete', 'Total', 'Entrega'],
    ...orders.map((o) => [o.id, new Date(o.date).toLocaleString('pt-BR'), o.userName, o.status, o.items.map((i) => `${i.qty}x ${i.name}`).join(' | '),
      o.subtotal, o.discount, o.coupon || '', o.shipping, o.total, o.address ? `${o.address.street}, ${o.address.number} - ${o.address.city}/${o.address.state}` : '']),
  ]);

  return (
    <div>
      <h2>Administração</h2>
      <div className="tools">{TABS.map(([k, l]) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => nav('/admin/' + k)}>{l}</button>)}</div>

      {tab === 'resumo' && (
        <div>
          <div className="kpis">
            <div className="panel kpi">Pedidos<b>{orders.length}</b></div>
            <div className="panel kpi">Faturamento<b>{brl(revenue)}</b></div>
            <div className="panel kpi">Clientes<b>{customers.length}</b></div>
            <div className="panel kpi">Estoque baixo<b>{low.length}</b></div>
          </div>
          <div className="panel">
            <div className="row" style={{ marginTop: 0 }}>
              <b>Vendas {mode === 'dia' ? '(últimos 7 dias)' : 'por categoria'}</b>
              <span><button className={'chip' + (mode === 'dia' ? ' on' : '')} onClick={() => setMode('dia')}>Por dia</button> <button className={'chip' + (mode === 'cat' ? ' on' : '')} onClick={() => setMode('cat')}>Por categoria</button></span>
            </div>
            <Chart data={mode === 'dia' ? byDay : byCat} />
          </div>
          <div className="two">
            <div className="panel"><b>Atenção ao estoque</b>{low.length ? low.map((p) => <div className="ci" key={p.id}><span>{p.name}</span><span className="badge">{p.stock} un.</span></div>) : <p className="mut">Tudo em dia.</p>}</div>
            <div className="panel"><b>Mais vendidos</b>{top.length ? top.map(([n, q]) => <div className="ci" key={n}><span>{n}</span><span className="badge">{q} un.</span></div>) : <p className="mut">Ainda sem vendas.</p>}</div>
          </div>
        </div>
      )}

      {tab === 'produtos' && (
        <div>
          <button className="btn" onClick={() => setEdit({ name: '', cat: CATS[0], price: '', stock: '', desc: '' })}>+ Novo produto</button>
          <div className="panel scroll" style={{ marginTop: 14 }}>
            <table>
              <thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th></th></tr></thead>
              <tbody>{products.map((p) => (
                <tr key={p.id}>
                  <td>{p.image ? <img className="tn" src={p.image} alt="" /> : '—'}</td><td>{p.name}</td><td>{p.cat}</td><td>{brl(p.price)}</td><td>{p.stock}</td>
                  <td><button className="btn ghost sm" onClick={() => setEdit(p)}>Editar</button> <button className="btn bad sm" onClick={() => del(p.id)}>Excluir</button></td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pedidos' && (
        <div>
          <button className="btn ghost" disabled={!orders.length} onClick={exportCsv}>Exportar CSV</button>
          <div style={{ marginTop: 14 }}>{orders.length ? <OrderList orders={orders} onStatus={setStatus} /> : <p className="mut">Nenhum pedido ainda.</p>}</div>
        </div>
      )}

      {tab === 'clientes' && (customers.length ? customers.map((c) => (
        <details className="panel" key={c.id}>
          <summary><b>{c.name}</b> · {c.email} · {c.orders.length} pedido(s) · {brl(c.spent)}</summary>
          <p className="mut">Cadastro em {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—'}</p>
          {c.orders.length ? <OrderList orders={c.orders} /> : <p className="mut">Sem pedidos.</p>}
        </details>
      )) : <p className="mut">Nenhum cliente cadastrado ainda.</p>)}

      {edit && <ProductForm edit={edit} onClose={() => setEdit(null)} onSave={save} flash={flash} />}
    </div>
  );
}
