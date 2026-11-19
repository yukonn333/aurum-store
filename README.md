# Aurum Joalheria

Loja de relógios, alianças e correntes. Front-end em React (Vite + React Router) e API em Node/Express
que grava tudo em `server/db.json`. Fotos dos produtos ficam em `server/uploads`. Não há pagamento: o pedido apenas é registrado.

## Como rodar (VS Code, Node 18+)
1. `npm install`
2. Copie `.env.example` para `.env` e preencha (o `.env` não vai para o Git):
   - `JWT_SECRET`: segredo longo e aleatório. Gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD` (8+ caracteres): login do administrador
3. `npm run dev` e abra http://localhost:5173

O administrador é criado a partir do `.env` na primeira execução. Não existem contas de teste, e nenhuma senha aparece no front-end.
Se já usou a versão anterior, apague `server/db.json` para começar limpo (as contas de demonstração antigas também são removidas automaticamente).
Para trocar a senha do admin depois: apague o usuário dele no `db.json`, ajuste o `.env` e reinicie.

Produção local: `npm run build` e depois `npm start` (tudo em http://localhost:3001).

## Recursos
- Cliente: catálogo com busca, filtro e ordenação; página do produto; favoritos; carrinho salvo no navegador;
  cupom (`BEMVINDO10` = 10%, `FRETEGRATIS`), frete simulado (grátis a partir de R$ 1.500); endereço de entrega;
  cancelamento de pedidos "Pendente".
- Admin: gráfico de vendas, produtos com upload de foto, pedidos com exportação CSV e mudança de status, lista de clientes.

## Segurança (validada no servidor)
- Só clientes criam pedidos; o admin não compra. Cliente só lê e cancela os próprios pedidos.
- Papel lido do banco a cada requisição; preço, cupom e frete calculados no servidor.
- Senhas com bcrypt, token JWT, bloqueio de 10 min após 5 logins errados (por IP + e-mail).
- Upload limitado a JPG/PNG/WebP de até 700 KB.
