import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, Line, PieChart, Pie, Cell, LineChart, ReferenceLine,
} from "recharts";
import { CHANNELS, MONTHS, fmt, fN } from "../data";
import { buildRepeatCustomers, buildMovingAverages } from "../engine";
import PnLTab from "./PnLTab";

const TT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-navy-300 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {typeof p.value === "number" && p.value > 100 ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
};

const Sec = ({ title, children }) => (
  <div className="mt-6">
    <h3 className="text-[11px] text-slate-800 font-bold uppercase tracking-wider mb-3">{title}</h3>
    {children}
  </div>
);

const REGION_COLORS = { North: "#2563EB", South: "#059669", East: "#D97706", West: "#7C3AED", Unknown: "#64748b" };

export default function DashboardBottom({ fy, mi, dt, inv, monthlyAgg }) {
  const cur = monthlyAgg[mi];

  // Section 8: Repeat customers
  const repeatCusts = useMemo(() => buildRepeatCustomers(monthlyAgg), [monthlyAgg]);
  const repeatData = repeatCusts.slice(0, 15).map(c => ({
    name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
    months: c.months,
    revenue: c.revenue,
    fill: c.months >= 4 ? "#059669" : c.months >= 3 ? "#2563EB" : "#D97706",
  }));

  // Section 9: Moving averages
  const maData = useMemo(() => buildMovingAverages(inv, fy), [inv, fy]);

  // Section 10: Geography
  const cities = Object.entries(cur.byCity)
    .map(([city, d]) => ({ city, ...d }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxCityRev = cities[0]?.revenue || 1;

  const regionData = Object.entries(cur.byRegion)
    .filter(([, v]) => v > 0)
    .map(([region, revenue]) => ({ name: region, value: revenue }));

  return (
    <>
      {/* ═══ SECTION 8: REPEATING CUSTOMERS ═══ */}
      <Sec title="Repeat Customers (2+ Months Active)">
        {repeatData.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500">No repeat customers found across months</div>
        ) : (
          <div className="glass-card p-4">
            <ResponsiveContainer width="100%" height={Math.max(200, repeatData.length * 32)}>
              <BarChart data={repeatData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fill: "#475569", fontSize: 11 }} />
                <Tooltip content={<TT />} />
                <Bar dataKey="months" radius={[0, 4, 4, 0]} barSize={18}>
                  {repeatData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 2 months</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 3 months</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> 4+ months</span>
            </div>
          </div>
        )}
      </Sec>

      {/* ═══ SECTION 9: MOVING AVERAGES ═══ */}
      {maData && (
        <Sec title="Moving Averages & Trend Analysis">
          {/* Mini KPI cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            {[
              { label: "7-Day MA (STMA)", value: fmt(maData.ma7Last), color: "text-slate-900", sub: "Short-term trend", subColor: "text-emerald-500" },
              { label: "30-Day MA (LTMA)", value: fmt(maData.ma30Last), color: "text-slate-900", sub: "Long-term baseline", subColor: "text-slate-500" },
              { label: "MA RATIO", value: maData.ratio.toFixed(3), color: "text-slate-900", sub: maData.ratio > 1 ? "↑ Accelerating" : "↓ Decelerating", subColor: maData.ratio > 1 ? "text-emerald-500" : "text-rose-500" },
              { label: "DATA POINTS", value: maData.dataPoints, color: "text-slate-900", sub: "Invoice days tracked", subColor: "text-slate-500" },
            ].map(k => (
              <div key={k.label} className="glass-card p-4">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">{k.label}</p>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className={`text-[10px] font-semibold mt-1 ${k.subColor}`}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Daily revenue + MA lines */}
          <div className="glass-card p-4 mb-4">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={maData.combined} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 9 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={v => fmt(v)} />
                <Tooltip content={<TT />} />
                <Bar dataKey="revenue" fill="#e2e8f0" barSize={6} radius={[2, 2, 0, 0]} name="Daily Rev" />
                <Line type="monotone" dataKey="ma7" stroke="#059669" strokeWidth={2} dot={false} name="7-Day MA" />
                <Line type="monotone" dataKey="ma30" stroke="#DC2626" strokeWidth={2} strokeDasharray="6 3" dot={false} name="30-Day MA" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-4 justify-start text-[11px] font-medium text-slate-500 ml-12">
              <span className="flex items-center gap-2"><span className="w-3 h-1 bg-emerald-600 rounded-full" /> 7-day MA (STMA)</span>
              <span className="flex items-center gap-2"><span className="w-3 h-1 bg-rose-600 rounded-full border-dashed" /> 30-day MA (LTMA)</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-200 rounded-sm" /> Daily revenue</span>
            </div>
          </div>



          {/* Per-channel MA grid */}
          {Object.keys(maData.channelMA).length > 0 && (
            <>
              <p className="text-[10px] text-navy-500 font-semibold uppercase mb-2">Per-Channel Moving Averages</p>
              <div className="grid grid-cols-2 gap-3">
                {CHANNELS.filter(ch => maData.channelMA[ch.id]).map(ch => (
                  <div key={ch.id} className="glass-card p-3">
                    <p className="text-[11px] text-navy-300 font-medium mb-2">{ch.icon} {ch.name}</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={maData.channelMA[ch.id]} margin={{ left: 0, right: 5, top: 5, bottom: 5 }}>
                        <XAxis dataKey="date" tick={false} />
                        <YAxis tick={{ fill: "#4a6291", fontSize: 9 }} tickFormatter={v => fmt(v)} width={50} />
                        <Line type="monotone" dataKey="ma7" stroke="#059669" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="ma30" stroke="#DC2626" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            </>
          )}
        </Sec>
      )}

      {/* ═══ SECTION 10: GEOGRAPHY & P&L ═══ */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        {/* Top cities */}
        <Sec title="Top cities by revenue">
          <div className="glass-card p-5 h-full">
            {cities.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No geography data</p>
            ) : (
              <div className="space-y-3">
                {cities.slice(0, 8).map((c, i) => (
                  <div key={c.city} className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 w-4 text-right font-bold">{i + 1}</span>
                    <span className="text-[12px] text-slate-800 font-bold w-32 truncate">{c.city}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold text-center w-14`}
                      style={{ color: REGION_COLORS[c.region], background: REGION_COLORS[c.region] + "10", borderColor: REGION_COLORS[c.region] + "30" }}>
                      {c.region}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${(c.revenue / maxCityRev) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-900 font-bold w-16 text-right">{fmt(c.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Sec>

        {/* P&L Embed */}
        <Sec title={`P&L — ${MONTHS[mi]} ${fy.replace("_", " ")}`}>
          <div className="glass-card overflow-hidden h-full">
            <PnLTab fy={fy} mi={mi} dt={dt} inline={true} />
          </div>
        </Sec>
      </div>
    </>
  );
}
