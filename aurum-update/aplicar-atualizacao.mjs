// Atualização Aurum Joalheria
//  1. Fotos reais e catálogo novo (server/uploads + server/db.json)
//  2. Administrador sincronizado com o .env a cada inicialização (server/index.js)
//  3. Fotos quadradas nos cartões (src/styles.css)
// Seguro para rodar mais de uma vez. Faz backup (.bak) de tudo que altera.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();
const payload = path.join(here, 'payload', 'server');
const log = (m) => console.log(m);
const die = (m) => { console.error('\nERRO: ' + m); process.exit(1); };

if (!fs.existsSync(path.join(root, 'package.json')) || !fs.existsSync(path.join(root, 'server', 'index.js')))
  die('Execute este comando dentro da pasta do projeto (a que contém package.json e a pasta server).');

function patch(rel, { done, from, to, check }) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) die(`Arquivo não encontrado: ${rel}`);
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  if (text.includes(done)) return log(`[ok] ${rel}: já estava atualizado`);
  if (!text.includes(from)) die(`${rel}: o trecho esperado não foi encontrado (o arquivo foi alterado?). Nada foi modificado.`);
  if (!fs.existsSync(file + '.bak')) fs.writeFileSync(file + '.bak', raw);
  const out = text.replace(from, () => to);
  fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out);
  if (check) {
    try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); }
    catch { fs.writeFileSync(file, raw); die(`${rel}: erro de sintaxe após a alteração. O arquivo original foi restaurado.`); }
  }
  log(`[ok] ${rel}: atualizado (backup em ${rel}.bak)`);
}

// 1) Administrador sempre sincronizado com o .env
patch('server/index.js', {
  done: 'Administrador ativo:',
  check: true,
  from: `const AE = ADMIN_EMAIL.trim().toLowerCase();
if (!db.users.some((u) => u.role === 'admin' && u.email === AE)) {
  db.users.push({ id: db.seq.user++, name: 'Administrador', email: AE, role: 'admin', hash: bcrypt.hashSync(ADMIN_PASSWORD, 10), createdAt: new Date().toISOString() });
}
save();`,
  to: `const AE = ADMIN_EMAIL.trim().toLowerCase();
const adm = db.users.find((u) => u.email === AE);
if (!adm) {
  db.users.push({ id: db.seq.user++, name: 'Administrador', email: AE, role: 'admin', hash: bcrypt.hashSync(ADMIN_PASSWORD, 10), createdAt: new Date().toISOString() });
} else {
  adm.role = 'admin';
  if (!bcrypt.compareSync(ADMIN_PASSWORD, adm.hash)) adm.hash = bcrypt.hashSync(ADMIN_PASSWORD, 10); // senha do .env sempre vale
}
save();
console.log(\`Administrador ativo: \${AE}\`);`,
});

// 2) Fotos quadradas nos cartões de produto
patch('src/styles.css', { done: '.thumb{aspect-ratio:1/1;', from: '.thumb{aspect-ratio:4/3;', to: '.thumb{aspect-ratio:1/1;' });

// 3) Fotos e catálogo
const upDir = path.join(root, 'server', 'uploads');
fs.mkdirSync(upDir, { recursive: true });
let copied = 0;
for (const f of fs.readdirSync(path.join(payload, 'uploads'))) {
  const dest = path.join(upDir, f);
  if (!fs.existsSync(dest)) { fs.copyFileSync(path.join(payload, 'uploads', f), dest); copied++; }
}
log(`[ok] server/uploads: ${copied} foto(s) copiada(s)`);

const dbFile = path.join(root, 'server', 'db.json');
const fresh = JSON.parse(fs.readFileSync(path.join(payload, 'db.json'), 'utf8'));
let old = null;
if (fs.existsSync(dbFile)) {
  try { old = JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
  catch { die('server/db.json atual está corrompido. Renomeie-o e rode o script de novo.'); }
}
if (old?.products?.some((p) => p.image === '/uploads/orient-aco.jpg')) {
  log('[ok] server/db.json: catálogo já atualizado (seus preços e estoques foram mantidos)');
} else {
  if (old) {
    fs.copyFileSync(dbFile, dbFile + '.bak');
    // mantém os cadastros de clientes reais; descarta contas de demonstração antigas e pedidos de teste
    fresh.users = (old.users || []).filter((u) => !['admin@aurum.com', 'cliente@aurum.com'].includes(u.email));
    fresh.seq.user = old.seq?.user ?? fresh.seq.user;
    fresh.seq.order = old.seq?.order ?? fresh.seq.order;
  }
  fs.writeFileSync(dbFile, JSON.stringify(fresh, null, 2));
  log(`[ok] server/db.json: catálogo com ${fresh.products.length} produtos${old ? ` (${fresh.users.length} cliente(s)/usuário(s) preservado(s); backup em server/db.json.bak)` : ''}`);
}

log('\nPronto. Agora rode: npm run dev');
log('Depois confira os preços em Administração > Produtos.');
