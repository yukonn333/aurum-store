// Cliente HTTP: guarda o token de login e envia em toda requisição.
let token = localStorage.getItem('token');

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

async function req(method, url, body) {
  const r = await fetch('/api' + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Erro inesperado');
  return data;
}

export const api = {
  get: (u) => req('GET', u),
  post: (u, b) => req('POST', u, b),
  put: (u, b) => req('PUT', u, b),
  patch: (u, b) => req('PATCH', u, b),
  del: (u) => req('DELETE', u),
};
