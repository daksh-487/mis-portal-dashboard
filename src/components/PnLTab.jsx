import React from "react";
import { CHANNELS, OPEX_KEYS, fmt, safeNum, MONTHS } from "../data";

const formatVal = (v) => {
  if (v === 0) return "0";
  const str = fmt(Math.abs(v));
  if (v < 0) return `(₹${str})`;
  return `₹${str}`;
};

const PnLRow = ({ label, amount, pct, isSubtotal, indent, bgClass, valColorClass = "text-slate-900" }) => {
  const isNeg = amount < 0;
  const finalValStr = formatVal(amount);
  const color = isNeg ? "text-rose-600" : valColorClass;
  const bg = bgClass ? bgClass : isNeg ? "bg-rose-50/50 hover:bg-rose-50" : "bg-white hover:bg-slate-50";
  
  return (
    <div className={`flex items-center justify-between py-2 px-4 ${bg} ${isSubtotal ? "font-bold border-y border-slate-200" : "border-b border-slate-100"} transition-colors`}>
      <div className={`text-[11px] ${indent ? "pl-4 text-slate-500" : "text-slate-800 font-bold"}`}>
        {label}
      </div>
      <div className="flex gap-4 w-40 justify-end items-center">
        <div className={`w-24 text-right text-[11px] font-bold ${color}`}>
          {finalValStr}
        </div>
        <div className={`w-12 text-right text-[10px] font-semibold ${isNeg ? "text-rose-500" : "text-slate-500"}`}>
          {pct}%
        </div>
      </div>
    </div>
  );
};

export default function PnLTab({ fy, mi, dt, inline = false }) {
  const rev = CHANNELS.reduce((sum, ch) => sum + safeNum(dt[`rev_${ch.id}`]), 0);
  const activeChannels = CHANNELS.map(ch => ({
    name: ch.name,
    val: safeNum(dt[`rev_${ch.id}`])
  })).filter(c => c.val > 0);

  const cogsAmt = safeNum(dt.units_sold) * safeNum(dt.cost_per_unit);
  const gp = rev - cogsAmt;

  const pkg = safeNum(dt.packaging);
  const mpf = safeNum(dt.marketplace_fees);
  const cour = safeNum(dt.courier);
  const cm1 = gp - pkg - mpf - cour;

  const mkt = safeNum(dt.marketing);
  const cm2 = cm1 - mkt;

  const opexLines = OPEX_KEYS.map(k => ({
    label: k.label,
    val: safeNum(dt[k.key])
  })).filter(k => k.val > 0);
  
  const totalOpex = opexLines.reduce((s, k) => s + k.val, 0);
  const ebitda = cm2 - totalOpex;

  const getPct = (val) => rev === 0 ? "0.0" : ((Math.abs(val) / rev) * 100).toFixed(1);

  return (
    <div className={`${inline ? "h-full flex flex-col" : "max-w-4xl mx-auto pb-10 animate-fade-in"}`}>
      {!inline && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Profit & Loss Statement</h2>
            <p className="text-slate-500 text-sm">
              For the month of {MONTHS[mi]} {fy.replace("FY_", "")}
            </p>
          </div>
        </div>
      )}

      <div className={`glass-card overflow-hidden flex flex-col ${inline ? "border-0 shadow-none rounded-none h-full" : ""}`}>
        {/* Header Row */}
        <div className="flex items-center justify-between py-2 px-4 bg-slate-50 border-b border-slate-200">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Particulars</div>
          <div className="flex gap-4 w-40 justify-end items-center text-[10px] text-slate-500 font-bold uppercase">
            <div className="w-24 text-right">Amount</div>
            <div className="w-12 text-right">% Rev</div>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* REVENUE */}
          <PnLRow label="REVENUE" amount={rev} pct={getPct(rev)} isSubtotal valColorClass="text-slate-900" bgClass="bg-white" />
          {/* Active channels aren't shown in the dashboard P&L summary in the picture, but we'll show them if not inline or if requested */}
          {!inline && activeChannels.map(ch => (
            <PnLRow key={ch.name} label={ch.name} amount={ch.val} pct={getPct(ch.val)} indent />
          ))}

          {/* COGS */}
          <PnLRow label="COGS" amount={-cogsAmt} pct={getPct(cogsAmt)} />

          {/* GROSS PROFIT */}
          <PnLRow label="GROSS PROFIT" amount={gp} pct={getPct(gp)} isSubtotal bgClass="bg-emerald-50/60" valColorClass={gp >= 0 ? "text-emerald-700" : "text-rose-700"} />
          
          {/* VARIABLE COSTS */}
          {pkg > 0 && <PnLRow label="Packaging" amount={-pkg} pct={getPct(pkg)} indent />}
          {mpf > 0 && <PnLRow label="Marketplace fees" amount={-mpf} pct={getPct(mpf)} indent />}
          {cour > 0 && <PnLRow label="Courier" amount={-cour} pct={getPct(cour)} indent />}

          {/* CM1 */}
          <PnLRow label="CM1" amount={cm1} pct={getPct(cm1)} isSubtotal bgClass="bg-amber-50/60" valColorClass={cm1 >= 0 ? "text-emerald-700" : "text-rose-700"} />
          
          {/* MARKETING */}
          <PnLRow label="Marketing" amount={-mkt} pct={getPct(mkt)} indent />

          {/* CM2 */}
          <PnLRow label="CM2" amount={cm2} pct={getPct(cm2)} isSubtotal bgClass="bg-amber-50/60" valColorClass={cm2 >= 0 ? "text-emerald-700" : "text-rose-700"} />
          
          {/* OPEX */}
          <PnLRow label="Total OpEx" amount={-totalOpex} pct={getPct(totalOpex)} isSubtotal={false} bgClass="bg-rose-50/50" />

          {/* EBITDA */}
          <PnLRow 
            label="EBITDA" 
            amount={ebitda} 
            pct={getPct(ebitda)} 
            isSubtotal 
            bgClass={ebitda >= 0 ? "bg-emerald-50" : "bg-rose-50"} 
            valColorClass={ebitda >= 0 ? "text-emerald-700 text-sm" : "text-rose-700 text-sm"} 
          />
        </div>
      </div>
    </div>
  );
}
