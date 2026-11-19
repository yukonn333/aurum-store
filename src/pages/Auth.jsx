import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onAuth }) {
  const [mode, setMode] = useState('in');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      onAuth(await api.post(mode === 'in' ? '/login' : '/register', f));
    } catch (error) {
      setErr(error.message);
    }
  };

  return (
    <form className="auth" onSubmit={submit}>
      <h1>AURUM</h1>
      <p className="mut" style={{ textAlign: 'center' }}>Relógios, alianças e correntes</p>
      {mode === 'up' && <label>Nome<input name="name" required /></label>}
      <label>E-mail<input name="email" type="email" required /></label>
      <label>Senha<input name="password" type="password" required /></label>
      {err && <div className="err">{err}</div>}
      <button className="btn">{mode === 'in' ? 'Entrar' : 'Criar conta'}</button>
      <button type="button" className="btn ghost" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); }}>
        {mode === 'in' ? 'Criar uma conta' : 'Já tenho conta'}
      </button>
    </form>
  );
}
