// Gráfico de barras em SVG. data = [[rótulo, valor], ...]
export default function Chart({ data }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  const slot = 320 / data.length;
  const fmt = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v));
  return (
    <svg viewBox="0 0 320 160" className="chart" role="img" aria-label="Gráfico de vendas">
      {data.map(([l, v], i) => {
        const h = (v / max) * 100, x = i * slot + 8, w = slot - 16;
        return (
          <g key={l}>
            <rect x={x} y={120 - h} width={w} height={Math.max(h, 1)} rx="4" fill="var(--gold)" />
            {v > 0 && <text x={x + w / 2} y={114 - h} textAnchor="middle" fontSize="9" fill="var(--ink)">{fmt(v)}</text>}
            <text x={x + w / 2} y="140" textAnchor="middle" fontSize="9" fill="var(--mut)">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}
