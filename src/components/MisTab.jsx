import React, { useState, useEffect } from "react";
import { CHANNELS, OPEX_KEYS, MONTHS, saveMIS, fmt, safeNum } from "../data";

const Accordion = ({ title, icon, defaultExpanded = false, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="glass-card mb-4 overflow-hidden border border-slate-200/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-white/50 hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <span className={`text-slate-500 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      {expanded && (
        <div className="p-5 border-t border-slate-100/50 bg-slate-50/30">
          {children}
        </div>
      )}
    </div>
  );
};

const Input = ({ label, value, onChange, prefix = "₹", highlight = false }) => (
  <div>
    <label className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className={highlight ? "text-accent-blue font-bold" : "text-slate-400"}>{prefix}</span>
      </div>
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white border ${highlight ? "border-accent-blue/50 focus:border-accent-blue" : "border-slate-200 focus:border-slate-400"} rounded-lg py-2 pl-8 pr-3 text-slate-900 text-sm outline-none transition-colors`}
        placeholder="0"
      />
    </div>
  </div>
);

const DisplayBox = ({ label, value, colorClass }) => (
  <div>
    <label className="block text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className={`w-full bg-white/50 border border-slate-100 rounded-lg py-2 px-4 text-sm font-bold ${colorClass}`}>
      {value}
    </div>
  </div>
);

export default function MisTab({ fy, mi, ad, setAd, setDt, setVw, showToast }) {
  const [formData, setFormData] = useState({ ...ad[mi] });

  // When month changes, update local form data
  useEffect(() => {
    setFormData({ ...ad[mi] });
  }, [mi, ad]);

  const updateField = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: safeNum(val) }));
  };

  const handleSave = () => {
    const newAd = [...ad];
    newAd[mi] = { ...formData };
    setAd(newAd);
    setDt({ ...formData });
    saveMIS(fy, newAd);
    
    showToast(`Saved data for ${MONTHS[mi]}`, "success");
  };

  // Keyboard shortcut Cmd/Ctrl + S
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, fy, mi, ad, showToast]);

  // Computations
  const totalRevenue = CHANNELS.reduce((sum, ch) => sum + safeNum(formData[`rev_${ch.id}`]), 0);
  const totalCOGS = (safeNum(formData.units_sold) * safeNum(formData.cost_per_unit));
  const totalOpEx = OPEX_KEYS.reduce((sum, k) => sum + safeNum(formData[k.key]), 0);
  const marketingSpend = safeNum(formData.marketing);
  const roas = marketingSpend > 0 ? totalRevenue / marketingSpend : 0;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">MIS Manual Input</h2>
          <p className="text-slate-500 text-sm">
            Enter overrides and offline data for {MONTHS[mi]} {fy.replace("FY_", "")}.
          </p>
        </div>
      </div>

      {/* SECTION 1: Revenue by channel */}
      <Accordion title="Revenue by Channel" icon="💰" defaultExpanded={true}>
        <div className="grid grid-cols-2 gap-4">
          {CHANNELS.map((ch) => (
            <Input
              key={ch.id}
              label={`${ch.name} Revenue`}
              value={formData[`rev_${ch.id}`]}
              onChange={(val) => updateField(`rev_${ch.id}`, val)}
            />
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-600">Total Offline/Manual Revenue</span>
          <span className="text-xl font-bold text-emerald-400">{fmt(totalRevenue)}</span>
        </div>
      </Accordion>

      {/* SECTION 2: Units & Inventory */}
      <Accordion title="Units & Inventory" icon="📦" defaultExpanded={true}>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Units Sold"
            prefix="#"
            highlight={true}
            value={formData.units_sold}
            onChange={(val) => updateField("units_sold", val)}
          />
          <Input
            label="Cost per Unit"
            value={formData.cost_per_unit}
            onChange={(val) => updateField("cost_per_unit", val)}
          />
          <DisplayBox
            label="Computed Base COGS"
            value={fmt(totalCOGS)}
            colorClass="text-rose-400"
          />
        </div>
      </Accordion>

      {/* SECTION 3: Variable costs */}
      <Accordion title="Variable Costs" icon="🚚" defaultExpanded={true}>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Packaging"
            value={formData.packaging}
            onChange={(val) => updateField("packaging", val)}
          />
          <Input
            label="Marketplace Fees"
            value={formData.marketplace_fees}
            onChange={(val) => updateField("marketplace_fees", val)}
          />
          <Input
            label="Courier"
            value={formData.courier}
            onChange={(val) => updateField("courier", val)}
          />
        </div>
      </Accordion>

      {/* SECTION 4: Marketing */}
      <Accordion title="Marketing" icon="📢" defaultExpanded={true}>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Marketing Spend"
            highlight={true}
            value={formData.marketing}
            onChange={(val) => updateField("marketing", val)}
          />
          <DisplayBox
            label="Computed ROAS"
            value={roas > 0 ? `${roas.toFixed(2)}x` : "0.00x"}
            colorClass={roas >= 5 ? "text-emerald-400" : "text-rose-400"}
          />
        </div>
      </Accordion>

      {/* SECTION 5: Operating expenses */}
      <Accordion title="Operating Expenses (OpEx)" icon="🏢" defaultExpanded={false}>
        <div className="grid grid-cols-3 gap-4">
          {OPEX_KEYS.map((k) => (
            <Input
              key={k.key}
              label={k.label}
              value={formData[k.key]}
              onChange={(val) => updateField(k.key, val)}
            />
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-slate-100/50 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-600">Total Operating Expenses</span>
          <span className="text-xl font-bold text-rose-400">{fmt(totalOpEx)}</span>
        </div>
      </Accordion>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-4 mt-8">
        <button
          onClick={handleSave}
          className="bg-accent-blue hover:bg-blue-600 text-slate-900 font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
        >
          Save {MONTHS[mi]}
        </button>
        <button
          onClick={() => setVw("dashboard")}
          className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-2.5 px-6 rounded-lg transition-colors border border-slate-300"
        >
          Dashboard →
        </button>
      </div>
    </div>
  );
}
