import { CHANNELS, SKUS, MONTHS, fmt, fN } from "../data";

const Sec = ({ title, children }) => (
  <div className="mt-6">
    <h3 className="text-[11px] text-slate-800 font-bold uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

export default function DashboardMid({ mi, monthlyAgg, proj }) {
  // Section 5: Revenue trend matrix — last 3 actuals + n+1,n+2,n+3
  const actualIdxs = [Math.max(0, mi - 2), Math.max(0, mi - 1), mi];
  const projIdxs = [(mi + 1) % 12, (mi + 2) % 12, (mi + 3) % 12];
  const matrixCols = [
    ...actualIdxs.map(i => ({ label: MONTHS[i], idx: i, projected: false })),
    ...projIdxs.map((i, n) => ({ label: `${MONTHS[i]}*`, idx: i, projected: true, nIdx: n })),
  ];

  // Section 6: SKU performance — last 6 months + current + projections
  const skuHistIdxs = [];
  for (let i = Math.max(0, mi - 5); i <= mi; i++) skuHistIdxs.push(i);
  const skuRows = SKUS.map(sku => {
    const p = proj.skuProjections[sku];
    const hist = skuHistIdxs.map(i => monthlyAgg[i].bySku[sku]?.units || 0);
    const growthPct = (p.growth * 100).toFixed(1);
    return { sku, hist, ...p, growthPct };
  }).filter(r => r.current > 0 || r.hist.some(h => h > 0));

  // Section 7: SKU velocity cards
  const activeSkus = SKUS.map(sku => ({ sku, ...proj.skuProjections[sku] })).filter(s => s.current > 0 || s.n1 > 0);
  const velColor = { Fast: "text-emerald-700 bg-emerald-50 border-emerald-200", Medium: "text-amber-700 bg-amber-50 border-amber-200", Slow: "text-rose-700 bg-rose-50 border-rose-200" };

  return (
    <>
      {/* ═══ SECTION 5: REVENUE TREND MATRIX ═══ */}
      <Sec title="Revenue trend — channel × month matrix">
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left text-slate-500 font-bold p-3 uppercase text-[10px] sticky left-0 bg-white">Channel</th>
                {matrixCols.map(c => (
                  <th key={c.label} className={`text-right p-3 font-bold text-[10px] uppercase ${c.projected ? "text-slate-400" : "text-slate-500"}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map(ch => (
                <tr key={ch.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 sticky left-0 bg-white">
                    <span className="text-slate-600 font-medium">{ch.name}</span>
                  </td>
                  {matrixCols.map(c => {
                    const val = c.projected
                      ? (proj.chProjections[ch.id]?.[`n${c.nIdx + 1}`] || 0)
                      : (monthlyAgg[c.idx].byChannel[ch.id] || 0);
                    return (
                      <td key={c.label} className={`p-3 text-right font-bold ${c.projected ? "text-slate-500" : "text-slate-900"}`}>
                        {fmt(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-slate-300 bg-slate-50">
                <td className="p-3 sticky left-0 bg-slate-50 text-slate-900 font-bold uppercase tracking-wider text-[10px]">Total</td>
                {matrixCols.map(c => {
                  const total = c.projected
                    ? CHANNELS.reduce((s, ch) => s + (proj.chProjections[ch.id]?.[`n${c.nIdx + 1}`] || 0), 0)
                    : CHANNELS.reduce((s, ch) => s + (monthlyAgg[c.idx].byChannel[ch.id] || 0), 0);
                  return <td key={c.label} className={`p-3 text-right font-bold ${c.projected ? "text-slate-500" : "text-slate-900"}`}>{fmt(total)}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </Sec>

      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* ═══ SECTION 6: SKU PERFORMANCE TABLE ═══ */}
        <Sec title="SKU performance — actual + projected (units)">
          <div className="glass-card overflow-x-auto h-[320px]">
            <table className="w-full text-[11px]">
              <thead className="bg-white sticky top-0">
                <tr className="border-b border-slate-200">
                  <th className="text-left text-slate-500 font-bold p-2.5 text-[10px] uppercase">SKU</th>
                  <th className="text-center text-slate-500 font-bold p-2.5 text-[10px] uppercase">Vel</th>
                  <th className="text-right text-slate-500 font-bold p-2.5 text-[10px] uppercase">Price</th>
                  {skuHistIdxs.slice(-3).map(i => (
                    <th key={i} className="text-right text-slate-500 font-bold p-2.5 text-[10px]">{MONTHS[i]}</th>
                  ))}
                  <th className="text-right text-slate-500 font-bold p-2.5 text-[10px]">N+1</th>
                  <th className="text-right text-slate-500 font-bold p-2.5 text-[10px]">N+2</th>
                  <th className="text-right text-slate-500 font-bold p-2.5 text-[10px] uppercase">Growth</th>
                </tr>
              </thead>
              <tbody>
                {skuRows.length === 0 ? (
                  <tr><td colSpan={20} className="p-6 text-center text-slate-400">No SKU data available</td></tr>
                ) : skuRows.map(r => (
                  <tr key={r.sku} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2.5 text-slate-800 font-bold">{r.sku}</td>
                    <td className="p-2.5 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${velColor[r.velocity]}`}>{r.velocity}</span>
                    </td>
                    <td className="p-2.5 text-right text-slate-800 font-bold">₹{r.avgPrice.toFixed(0)}</td>
                    {r.hist.slice(-3).map((h, i) => (
                      <td key={i} className="p-2.5 text-right text-slate-600 font-bold">{fN(h)}</td>
                    ))}
                    <td className="p-2.5 text-right text-slate-500 font-bold">{fN(r.n1)}</td>
                    <td className="p-2.5 text-right text-slate-500 font-bold">{fN(r.n2)}</td>
                    <td className="p-2.5 text-right">
                      <span className={`font-bold ${r.growth > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {r.growth > 0 ? "+" : ""}{r.growthPct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        {/* ═══ SECTION 7: SKU VELOCITY CARDS ═══ */}
        <Sec title="SKU velocity cards">
          {activeSkus.length === 0 ? (
            <div className="glass-card p-8 text-center text-slate-500">No active SKUs this period</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 h-[320px] overflow-y-auto content-start">
              {activeSkus.map(s => (
                <div key={s.sku} className="glass-card p-4 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[13px] font-bold text-slate-900 block">{s.sku}</span>
                      <span className="text-[18px] font-bold text-slate-800">{fN(s.current)}</span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-bold ${velColor[s.velocity]}`}>{s.velocity}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    Next: {fN(s.n1)} → {fN(s.n2)} → {fN(s.n3)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sec>
      </div>


    </>
  );
}
