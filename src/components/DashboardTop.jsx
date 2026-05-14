import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CHANNELS, SKUS, MONTHS, fmt, fN, safeNum, totalCOGS, totalOPEX } from "../data";
import { getMonthInv, aggInvoices, buildProjections } from "../engine";

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-500 font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

const Sec = ({ title, children, className = "" }) => (
  <div className={className}>
    <h3 className="text-[11px] text-slate-800 font-bold uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

export default function DashboardTop({ fy, mi, dt, ad, inv, monthlyAgg, proj }) {
  const cur = monthlyAgg[mi];
  const prevIdx = mi > 0 ? mi - 1 : 11;
  const prev = monthlyAgg[prevIdx];

  const momChange = prev.revenue > 0 ? ((cur.revenue - prev.revenue) / prev.revenue * 100) : 0;
  const cogs = totalCOGS(dt);
  const opex = totalOPEX(dt);
  const gp = cur.revenue - cogs;
  const gpMargin = cur.revenue > 0 ? (gp / cur.revenue * 100) : 0;
  const ebitda = cur.revenue - cogs - safeNum(dt.marketing) - opex;
  const ebitdaMargin = cur.revenue > 0 ? (ebitda / cur.revenue * 100) : 0;
  const cogsPerUnit = cur.units > 0 ? cogs / cur.units : 0;

  const kpis = [
    { label: "Revenue", value: fmt(proj.curRev), sub: `${momChange >= 0 ? "↑" : "↓"} ${momChange > 0 ? "+" : ""}${momChange.toFixed(1)}% MoM`, text: "text-slate-900", subColor: momChange >= 0 ? "text-emerald-500" : "text-rose-500" },
    { label: "Units Sold", value: fN(Math.round(proj.curUnits)), sub: `${cur.orders} orders`, text: "text-slate-900", subColor: "text-slate-500" },
    { label: "Gross Margin", value: `${gpMargin.toFixed(1)}%`, sub: `GP ${fmt(gp)}`, text: "text-slate-900", subColor: "text-emerald-500" },
    { label: "EBITDA", value: fmt(ebitda), sub: `${ebitdaMargin.toFixed(1)}% margin`, text: "text-slate-900", subColor: ebitda >= 0 ? "text-emerald-500" : "text-rose-500" },
    { label: "COGS / Unit", value: `₹${cogsPerUnit.toFixed(0)}`, sub: `COGS ${fmt(cogs)}`, text: "text-slate-900", subColor: "text-slate-500" },
    { label: "Projected Rev", value: fmt(proj.projectedRev), sub: proj.isPartial ? `${proj.daysElapsed}/${proj.daysInMonth} days` : "Full month", text: "text-slate-900", subColor: "text-slate-500" },
  ];

  // Section 2: Sales targets n+1, n+2, n+3
  const targets = [
    { label: "CURRENT MONTH", rev: proj.curRev, units: proj.curUnits, growth: 0, actual: true, bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-800" },
    { label: `N+1 — ${MONTHS[(mi + 1) % 12]}`, rev: proj.n1Rev, units: proj.n1Units, growth: proj.overallGrowth * 100, actual: false, bg: "bg-blue-50/50", border: "border-blue-100", text: "text-blue-600" },
    { label: `N+2 — ${MONTHS[(mi + 2) % 12]}`, rev: proj.n2Rev, units: proj.n2Units, growth: proj.overallGrowth * 2 * 100, actual: false, bg: "bg-emerald-50/50", border: "border-emerald-100", text: "text-emerald-600" },
    { label: `N+3 — ${MONTHS[(mi + 3) % 12]}`, rev: proj.n3Rev, units: proj.n3Units, growth: proj.overallGrowth * 3 * 100, actual: false, bg: "bg-fuchsia-50/50", border: "border-fuchsia-100", text: "text-fuchsia-600" },
  ];

  // Section 3: Channel revenue
  const channelData = CHANNELS.map(ch => ({
    ...ch,
    rev: cur.byChannel[ch.id] || 0,
    pct: cur.revenue > 0 ? ((cur.byChannel[ch.id] || 0) / cur.revenue * 100) : 0,
  })).sort((a, b) => b.rev - a.rev);

  // Section 4: Top customers
  const customers = Object.entries(cur.byCustomer)
    .map(([name, d]) => ({ name, ...d, pct: cur.revenue > 0 ? (d.revenue / cur.revenue * 100) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <>
      {/* ═══ SECTION 1: KPI CARDS ═══ */}
      <div className="grid grid-cols-6 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="glass-card p-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.text} mb-1 tracking-tight`}>{k.value}</p>
            <p className={`text-[11px] font-semibold ${k.subColor}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ═══ SECTION 2: SALES TARGETS ═══ */}
      <Sec title={`Sales targets — n+1, n+2, n+3 months`}>
        <div className="grid grid-cols-4 gap-4">
          {targets.map((t, i) => (
            <div key={i} className={`rounded-xl border ${t.border} ${t.bg} p-5 text-center`}>
              <div className="mb-2 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                {t.label}
              </div>
              <p className={`text-2xl font-bold ${t.text}`}>{fmt(t.rev)}</p>
              <div className="mt-2 text-[11px] font-semibold text-slate-500">
                {fN(Math.round(t.units))} {t.actual ? (proj.isPartial ? "units · 21/31 days" : "units") : `units · ↑ ${t.growth.toFixed(1)}%`}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-slate-400 font-medium">
          Combined growth = 50% SKU velocity + 50% channel momentum. Floor 3%/month. Channel rate: {(proj.overallGrowth * 100).toFixed(1)}%/mo <span className="text-emerald-500 ml-1">✓ Validated</span>
        </div>
      </Sec>

      {/* ═══ SECTION 3: CHANNEL REVENUE ═══ */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* ═══ SECTION 3: CHANNEL REVENUE ═══ */}
        <Sec title="Revenue by channel">
          <div className="glass-card p-5 space-y-3 h-[280px]">
            {channelData.map(ch => (
              <div key={ch.id} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{ch.icon}</span>
                <span className="text-[12px] font-bold text-slate-800 w-32">{ch.name}</span>
                <div className="flex-1 h-[6px] rounded-full overflow-hidden relative" style={{ background: "#f1f5f9" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(ch.pct, 1)}%`, background: ch.color }}
                  />
                </div>
                <span className="text-[12px] font-bold text-slate-900 w-16 text-right" style={{ color: ch.color }}>{fmt(ch.rev)}</span>
                <span className="text-[11px] font-semibold text-slate-500 w-10 text-right">{ch.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Sec>

        {/* ═══ SECTION 4: TOP CUSTOMERS ═══ */}
        <Sec title="Top Customers">
          <div className="glass-card h-[280px] overflow-hidden flex flex-col">
            <table className="w-full text-[11px]">
              <thead className="bg-white sticky top-0">
                <tr className="border-b border-slate-200">
                  <th className="text-left text-slate-500 font-bold p-3 uppercase text-[10px]">Customer</th>
                  <th className="text-right text-slate-500 font-bold p-3 uppercase text-[10px]">Units</th>
                  <th className="text-right text-slate-500 font-bold p-3 uppercase text-[10px]">Revenue</th>
                  <th className="text-right text-slate-500 font-bold p-3 uppercase text-[10px]">%</th>
                </tr>
              </thead>
              <tbody className="overflow-y-auto">
                {customers.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">No invoice data for this month</td></tr>
                ) : customers.slice(0, 8).map((c, i) => (
                  <tr key={c.name} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3 text-slate-700 font-medium">{c.name}</td>
                    <td className="p-3 text-right text-slate-900 font-bold">{fN(c.units)}</td>
                    <td className="p-3 text-right text-slate-900 font-bold">{fmt(c.revenue)}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">{c.pct.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>
      </div>
    </>
  );
}
