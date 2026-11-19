import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const { JWT_SECRET: SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, PORT = 3001 } = process.env;
if (!SECRET || SECRET.length < 16 || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
  console.error('Configure o arquivo .env (copie de .env.example): JWT_SECRET (16+ caracteres), ADMIN_EMAIL e ADMIN_PASSWORD (8+ caracteres).');
  process.exit(1);
}
const COUPONS = { BEMVINDO10: { pct: 10 }, FRETEGRATIS: { freeShip: true } };
const shippingFor = (subtotal) => (subtotal >= 1500 ? 0 : 29.9); // frete simulado
const CATS = ['Relógios', 'Alianças', 'Correntes'];
const STATUS = ['Pendente', 'Em preparo', 'Enviado', 'Entregue', 'Cancelado'];

const SEED = [
  ['Chronos Classic', 'Relógios', 2890, 6, 'Caixa em aço, pulseira de couro italiano.'],
  ['Aviator Steel', 'Relógios', 3450, 4, 'Cronógrafo esportivo, resistente à água.'],
  ['Nocturne Gold', 'Relógios', 5200, 2, 'Banhado a ouro 18k, mostrador preto.'],
  ['Minimal Rosé', 'Relógios', 1980, 8, 'Design fino em ouro rosé para o dia a dia.'],
  ['Eterna Ouro 18k', 'Alianças', 1890, 10, 'Par de alianças em ouro 18k, acabamento polido.'],
  ['Lumi Prata 950', 'Alianças', 950, 12, 'Par em prata 950, levemente abaulado.'],
  ['Clássica Reta', 'Alianças', 1450, 7, 'Aliança reta tradicional, ouro amarelo.'],
  ['Ouro Branco Diamante', 'Alianças', 3200, 3, 'Ouro branco com ponto de diamante.'],
  ['Cartier Ouro 18k', 'Correntes', 2300, 5, 'Elos clássicos, 50 cm, fecho mosquetão.'],
  ['Veneziana Prata', 'Correntes', 690, 15, 'Corrente veneziana em prata 925, 45 cm.'],
  ['Groumet Ouro', 'Correntes', 3900, 2, 'Elos largos em ouro 18k, 60 cm.'],
  ['Singapura Prata', 'Correntes', 420, 20, 'Corrente torcida delicada, prata 925.'],
];

// ---------- "Banco de dados" em arquivo JSON ----------
function loadDb() {
  if (fs.existsSync(DB_FILE)) return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const db = {
    seq: { product: SEED.length + 1, order: 1001, user: 1 },
    users: [],
    products: SEED.map((s, i) => ({ id: i + 1, name: s[0], cat: s[1], price: s[2], stock: s[3], desc: s[4], image: null })),
    orders: [],
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  return db;
}
const db = loadDb();
const save = () => {
  const tmp = DB_FILE + '.tmp'; // grava em arquivo temporário e renomeia, para não corromper o JSON
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
};

// Remove contas de demonstração de versões antigas e garante o administrador definido no .env
db.users = db.users.filter((u) => !['admin@aurum.com', 'cliente@aurum.com'].includes(u.email));
const AE = ADMIN_EMAIL.trim().toLowerCase();
const adm = db.users.find((u) => u.email === AE);
if (!adm) {
  db.users.push({ id: db.seq.user++, name: 'Administrador', email: AE, role: 'admin', hash: bcrypt.hashSync(ADMIN_PASSWORD, 10), createdAt: new Date().toISOString() });
} else {
  adm.role = 'admin';
  if (!bcrypt.compareSync(ADMIN_PASSWORD, adm.hash)) adm.hash = bcrypt.hashSync(ADMIN_PASSWORD, 10); // senha do .env sempre vale
}
save();
console.log(`Administrador ativo: ${AE}`);

// ---------- Utilitários e segurança ----------
const app = express();
app.use(express.json({ limit: '1mb' }));
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
const sign = (u) => jwt.sign({ id: u.id }, SECRET, { expiresIn: '8h' });
const money = (n) => Math.round(Number(n) * 100) / 100;

// Autenticação: o papel (admin/user) é SEMPRE lido do banco, nunca do token.
const auth = (req, res, next) => {
  try {
    const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
    const u = db.users.find((x) => x.id === id);
    if (!u) throw new Error();
    req.user = u;
    next();
  } catch {
    bad(res, 'Não autenticado', 401);
  }
};
const only = (role) => (req, res, next) => (req.user.role === role ? next() : bad(res, 'Acesso negado', 403));

const parseProduct = (b = {}) => {
  const p = { name: String(b.name || '').trim(), cat: b.cat, price: money(b.price), stock: Number(b.stock), desc: String(b.desc || '').trim().slice(0, 1000) };
  return p.name && p.name.length <= 80 && CATS.includes(p.cat) && p.price > 0 && Number.isInteger(p.stock) && p.stock >= 0 ? p : null;
};

// ---------- Autenticação ----------
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const e = String(email || '').trim().toLowerCase();
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 60 || !/^\S+@\S+\.\S+$/.test(e) || typeof password !== 'string' || password.length < 6 || password.length > 100)
    return bad(res, 'Informe nome, e-mail válido e senha com 6+ caracteres');
  if (db.users.some((u) => u.email === e)) return bad(res, 'E-mail já cadastrado', 409);
  const u = { id: db.seq.user++, name: name.trim(), email: e, role: 'user', hash: bcrypt.hashSync(password, 10), createdAt: new Date().toISOString() }; // cadastro público nunca cria admin
  db.users.push(u);
  save();
  res.json({ token: sign(u), user: pub(u) });
});

// Limite de tentativas: 5 erros bloqueiam o par IP+e-mail por 10 minutos
const fails = new Map();
app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const mail = String(email || '').trim().toLowerCase();
  const key = req.ip + '|' + mail;
  const f = fails.get(key) || { n: 0, until: 0 };
  if (f.until > Date.now()) return bad(res, 'Muitas tentativas. Tente novamente em alguns minutos.', 429);
  const u = db.users.find((x) => x.email === mail);
  if (!u || typeof password !== 'string' || !bcrypt.compareSync(password, u.hash)) {
    f.n += 1;
    if (f.n >= 5) { f.n = 0; f.until = Date.now() + 10 * 60 * 1000; }
    fails.set(key, f);
    return bad(res, 'E-mail ou senha inválidos', 401);
  }
  fails.delete(key);
  res.json({ token: sign(u), user: pub(u) });
});

app.get('/api/me', auth, (req, res) => res.json(pub(req.user)));

// ---------- Imagens (enviadas já reduzidas pelo navegador, salvas em server/uploads) ----------
const removeImage = (img) => { if (img?.startsWith('/uploads/')) fs.rm(path.join(UPLOADS, path.basename(img)), () => {}); };
function saveImage(dataUrl, old) {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 700 * 1024) return null;
  const name = `p${Date.now()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOADS, name), buf);
  removeImage(old);
  return '/uploads/' + name;
}
const BAD_IMG = 'Imagem inválida (use JPG, PNG ou WebP de até 700 KB)';
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }));

// ---------- Produtos ----------
app.get('/api/products', (_req, res) => res.json(db.products));

app.post('/api/products', auth, only('admin'), (req, res) => {
  const p = parseProduct(req.body);
  if (!p) return bad(res, 'Dados do produto inválidos');
  let image = null;
  if (req.body.image && !(image = saveImage(req.body.image))) return bad(res, BAD_IMG);
  const novo = { id: db.seq.product++, ...p, image };
  db.products.push(novo);
  save();
  res.json(novo);
});

app.put('/api/products/:id', auth, only('admin'), (req, res) => {
  const i = db.products.findIndex((p) => p.id === Number(req.params.id));
  const p = parseProduct(req.body);
  if (i < 0) return bad(res, 'Produto não encontrado', 404);
  if (!p) return bad(res, 'Dados do produto inválidos');
  let image = db.products[i].image || null;
  if (req.body.image) {
    const n = saveImage(req.body.image, image);
    if (!n) return bad(res, BAD_IMG);
    image = n;
  } else if (req.body.removeImage) { removeImage(image); image = null; }
  db.products[i] = { id: db.products[i].id, ...p, image };
  save();
  res.json(db.products[i]);
});

app.delete('/api/products/:id', auth, only('admin'), (req, res) => {
  const p = db.products.find((x) => x.id === Number(req.params.id));
  if (!p) return bad(res, 'Produto não encontrado', 404);
  removeImage(p.image);
  db.products = db.products.filter((x) => x !== p);
  save();
  res.json({ ok: true });
});

// ---------- Pedidos ----------
// Monta o orçamento no servidor: preços, cupom e frete nunca vêm do navegador.
function buildQuote(rawItems, code) {
  const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
  if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 50) throw err('Carrinho vazio');
  const items = [];
  for (const r of rawItems) {
    const p = db.products.find((x) => x.id === r.id);
    const q = Number(r.qty);
    if (!p || !Number.isInteger(q) || q < 1) throw err('Item inválido');
    if (items.some((i) => i.id === p.id)) throw err('Item repetido');
    if (p.stock < q) throw err(`Estoque insuficiente: ${p.name}`, 409);
    items.push({ id: p.id, name: p.name, cat: p.cat, price: p.price, qty: q });
  }
  const subtotal = money(items.reduce((s, i) => s + i.price * i.qty, 0));
  const key = code ? String(code).trim().toUpperCase() : '';
  const c = key ? COUPONS[key] : null;
  if (key && !c) throw err('Cupom inválido');
  const discount = c?.pct ? money((subtotal * c.pct) / 100) : 0;
  const shipping = c?.freeShip ? 0 : shippingFor(subtotal);
  return { items, subtotal, discount, shipping, coupon: c ? key : null, total: money(subtotal - discount + shipping) };
}
const fail = (res, e) => bad(res, e.message, e.status || 400);

const parseAddress = (a) => {
  const t = (v, m) => String(v ?? '').trim().slice(0, m);
  const r = { cep: t(a?.cep, 9), street: t(a?.street, 100), number: t(a?.number, 10), district: t(a?.district, 60), city: t(a?.city, 60), state: t(a?.state, 2).toUpperCase() };
  return Object.values(r).every(Boolean) && /^\d{5}-?\d{3}$/.test(r.cep) && /^[A-Z]{2}$/.test(r.state) ? r : null;
};
const restock = (o) => o.items.forEach((i) => { const p = db.products.find((x) => x.id === i.id); if (p) p.stock += i.qty; });

// Somente CLIENTES compram. O administrador não pode criar pedidos.
app.post('/api/quote', auth, only('user'), (req, res) => {
  try { res.json(buildQuote(req.body?.items, req.body?.coupon)); } catch (e) { fail(res, e); }
});

app.post('/api/orders', auth, only('user'), (req, res) => {
  const address = parseAddress(req.body?.address);
  if (!address) return bad(res, 'Endereço inválido: confira CEP (00000-000), rua, número, bairro, cidade e UF');
  let q;
  try { q = buildQuote(req.body?.items, req.body?.coupon); } catch (e) { return fail(res, e); }
  q.items.forEach((i) => (db.products.find((p) => p.id === i.id).stock -= i.qty));
  const order = { id: db.seq.order++, userId: req.user.id, userName: req.user.name, ...q, address, status: 'Pendente', date: new Date().toISOString() };
  db.orders.unshift(order);
  save();
  res.json(order);
});

app.get('/api/orders/mine', auth, (req, res) => res.json(db.orders.filter((o) => o.userId === req.user.id)));
app.get('/api/orders', auth, only('admin'), (_req, res) => res.json(db.orders));

// O cliente só cancela o PRÓPRIO pedido e apenas enquanto estiver "Pendente"
app.patch('/api/orders/:id/cancel', auth, (req, res) => {
  const o = db.orders.find((x) => x.id === Number(req.params.id) && x.userId === req.user.id);
  if (!o) return bad(res, 'Pedido não encontrado', 404);
  if (o.status !== 'Pendente') return bad(res, 'Só é possível cancelar pedidos pendentes', 409);
  restock(o);
  o.status = 'Cancelado';
  save();
  res.json(o);
});

app.patch('/api/orders/:id/status', auth, only('admin'), (req, res) => {
  const o = db.orders.find((x) => x.id === Number(req.params.id));
  const st = req.body?.status;
  if (!o) return bad(res, 'Pedido não encontrado', 404);
  if (!STATUS.includes(st)) return bad(res, 'Status inválido');
  if (o.status === 'Cancelado') return bad(res, 'Pedido cancelado não pode ser alterado', 409);
  if (st === 'Cancelado') restock(o);
  o.status = st;
  save();
  res.json(o);
});

// ---------- Clientes (admin) ----------
app.get('/api/customers', auth, only('admin'), (_req, res) =>
  res.json(db.users.filter((u) => u.role === 'user').map((u) => {
    const orders = db.orders.filter((o) => o.userId === u.id);
    const spent = money(orders.filter((o) => o.status !== 'Cancelado').reduce((s, o) => s + o.total, 0));
    return { ...pub(u), createdAt: u.createdAt, orders, spent };
  })));

// ---------- Produção: serve o front-end compilado (npm run build) ----------
const dist = path.join(__dirname, '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`API Aurum rodando em http://localhost:${PORT}`));
