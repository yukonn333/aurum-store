export const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const CATS = ['Relógios', 'Alianças', 'Correntes'];
export const EMO = { Relógios: '⌚', Alianças: '💍', Correntes: '⛓️' };
export const GR = { Relógios: 'g2', Alianças: 'g1', Correntes: 'g0' };
export const STATUS = ['Pendente', 'Em preparo', 'Enviado', 'Entregue', 'Cancelado'];

// Reduz a foto no navegador (máx. 900 px, JPEG) antes de enviar ao servidor
export function resizeImage(file, max = 900) {
  return new Promise((ok, fail) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => fail(new Error('Arquivo de imagem inválido'));
    img.src = url;
  });
}

// CSV com separador ";" e BOM, para abrir direto no Excel em português
export function downloadCsv(name, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = '\ufeff' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
