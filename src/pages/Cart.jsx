import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useApp } from '../ctx.js';
import { brl } from '../utils.js';
import Thumb from '../components/Thumb.jsx';

export default function Cart() {
  const { cart, products, setQty, clearCart, flash, reload } = useApp();
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState('');
  const [msg, setMsg] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);

  const items = cart.map((c) => ({ ...c, p: products.find((p) => p.id === c.id) })).filter((i) => i.p);
  const payload = items.map(({ id, qty }) => ({ id, qty }));

  // O servidor calcula subtotal, cupom, frete e total
  useEffect(() => {
    if (!payload.length) return setQuote(null);
    api.post('/quote', { items: payload, coupon: applied })
      .then((q) => { setQuote(q); if (applied) setMsg(`Cupom ${q.coupon} aplicado`); })
      .catch((e) => { setQuote(null); if (applied) { setApplied(''); setMsg(e.message); } else setMsg(e.message); });
  }, [cart, applied, products]);

  const submit = async (e) => {
    e.preventDefault();
    const address = Object.fromEntries(new FormData(e.target));
    setBusy(true);
    try {
      await api.post('/orders', { items: payload, coupon: applied, address });
      clearCart();
      await reload();
      flash('Pedido realizado!');
      nav('/pedidos');
    } catch (err) { flash(err.message); reload(); }
    finally { setBusy(false); }
  };

  if (!items.length)
    return <div className="panel empty"><h2>Seu carrinho está vazio</h2><p className="mut">Adicione peças na loja para montar seu pedido.</p><Link className="btn" to="/">Ver a loja</Link></div>;

  return (
    <div>
      <h2>Carrinho</h2>
      <div className="panel">
        {items.map(({ p, qty }) => (
          <div className="ci" key={p.id}>
            <div className="cinfo"><Thumb p={p} className="mini" /><div>{p.name}<br /><span className="mut">{brl(p.price)}</span></div></div>
            <div className="qty">
              <button className="btn ghost sm" onClick={() => setQty(p.id, -1)}>−</button><b>{qty}</b>
              <button className="btn ghost sm" disabled={qty >= p.stock} onClick={() => setQty(p.id, 1)}>+</button>
            </div>
            <b>{brl(p.price * qty)}</b>
          </div>
        ))}
      </div>

      <div className="panel">
        <label>Cupom de desconto
          <span className="row" style={{ marginTop: 0 }}>
            <input value={code} onChange={(e) => { setCode(e.target.value); setMsg(''); }} placeholder="Digite o cupom" />
            <button type="button" className="btn ghost" onClick={() => setApplied(code.trim())}>Aplicar</button>
          </span>
        </label>
        {msg && <p className="mut">{msg}</p>}
        {quote && (
          <div className="sum">
            <span>Subtotal</span><span>{brl(quote.subtotal)}</span>
            {quote.discount > 0 && <><span>Desconto</span><span>− {brl(quote.discount)}</span></>}
            <span>Frete (simulado)</span><span>{quote.shipping ? brl(quote.shipping) : 'Grátis'}</span>
            <b>Total</b><b>{brl(quote.total)}</b>
          </div>
        )}
        <p className="mut">Frete grátis em compras a partir de R$ 1.500,00. Nenhum pagamento é processado.</p>
      </div>

      <form className="panel addr" onSubmit={submit}>
        <b>Endereço de entrega</b>
        <label>CEP<input name="cep" required placeholder="00000-000" pattern="\d{5}-?\d{3}" /></label>
        <label>Rua<input name="street" required maxLength={100} /></label>
        <label>Número<input name="number" required maxLength={10} /></label>
        <label>Bairro<input name="district" required maxLength={60} /></label>
        <label>Cidade<input name="city" required maxLength={60} /></label>
        <label>UF<input name="state" required maxLength={2} minLength={2} placeholder="PE" style={{ textTransform: 'uppercase' }} /></label>
        <button className="btn full" disabled={busy || !quote}>Finalizar pedido</button>
      </form>
    </div>
  );
}
