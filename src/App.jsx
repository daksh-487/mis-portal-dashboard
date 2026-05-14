import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FY_OPTIONS,
  MONTHS,
  CHANNELS,
  emptyMonth,
  loadMIS,
  saveMIS,
  loadSales,
  saveSales,
  loadMaps,
  saveMaps,
  SKUS,
  fmt,
} from "./data";
import * as XLSX from "xlsx";
import DashboardTop from "./components/DashboardTop";
import DashboardMid from "./components/DashboardMid";
import DashboardBottom from "./components/DashboardBottom";
import UploadTab from "./components/UploadTab";
import MisTab from "./components/MisTab";
import PnLTab from "./components/PnLTab";
import { getMonthInv, aggInvoices, buildProjections } from "./engine";

// ── Tab definitions ──
const TABS = [
  { id: "dashboard",  label: "Dashboard",   icon: "📊" },
  { id: "upload",     label: "Upload Data",  icon: "📤" },
  { id: "sales",      label: "Sales Ops",    icon: "💰" },
  { id: "mis",        label: "MIS Input",    icon: "📝" },
  { id: "pnl",        label: "P&L",          icon: "📈" },
];

export default function App() {
  // ── Core state ──
  const [fy, setFy]   = useState(FY_OPTIONS[0]);
  const [mi, setMi]   = useState(9);               // default Jan (index 9)
  const [vw, setVw]   = useState("dashboard");      // active tab
  const [ad, setAd]   = useState([]); // all 12 months
  const [dt, setDt]   = useState({}); // current month data
  const [inv, setInv] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── FY change → reload everything ──
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([loadMIS(fy), loadSales(fy)]).then(([months, invoices]) => {
      if (!mounted) return;
      setAd(months);
      setDt({ ...emptyMonth(), ...months[mi] });
      setInv(invoices);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [fy]);

  // ── Month change → load that month's data ──
  useEffect(() => {
    if (ad.length > mi) {
      setDt({ ...emptyMonth(), ...ad[mi] });
    }
  }, [mi, ad]);

  // ── Determine which months have invoice data ──
  const monthsWithData = useMemo(() => {
    const set = new Set();
    inv.forEach((invoice) => {
      if (!invoice.date) return;
      const d = new Date(invoice.date);
      const calMonth = d.getMonth(); // 0=Jan
      // Map calendar month to FY index: Apr(3)→0, May(4)→1, ... Mar(2)→11
      const fyIdx = (calMonth - 3 + 12) % 12;
      set.add(fyIdx);
    });
    // Also mark months that have non-zero revenue in MIS data
    ad.forEach((m, i) => {
      const hasRevenue = CHANNELS.some(
        (ch) => (m[`rev_${ch.id}`] || 0) > 0
      );
      if (hasRevenue) set.add(i);
    });
    return set;
  }, [inv, ad]);

  // ── JSON EXPORT ──
  const handleExportJson = useCallback(() => {
    const data = {
      fy,
      mis: loadMIS(fy),
      invoices: loadSales(fy),
      maps: loadMaps()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis_backup_${fy}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fy]);

  // ── JSON IMPORT ──
  const handleImportJson = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.fy && parsed.mis && parsed.invoices) {
          saveMIS(parsed.fy, parsed.mis);
          saveSales(parsed.fy, parsed.invoices);
          if (parsed.maps) saveMaps(parsed.maps);
          if (parsed.fy !== fy) setFy(parsed.fy);
          else {
            setAd(parsed.mis);
            setDt({ ...emptyMonth(), ...parsed.mis[mi] });
            setInv(parsed.invoices);
          }
          showToast("Import successful!", "success");
        } else {
          showToast("Invalid backup file structure.", "error");
        }
      } catch (err) {
        showToast("Error reading JSON file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  }, [fy, mi]);

  // ── EXCEL EXPORT ──
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const monthlyAgg = Array.from({ length: 12 }, (_, i) => {
      const monthInv = getMonthInv(inv, fy, i);
      return aggInvoices(monthInv);
    });
    const proj = buildProjections(monthlyAgg, mi, fy);

    // 1. Summary
    const ws1Data = [
      ["Metric", "Value"],
      ["Current Month", MONTHS[mi]],
      ["Fiscal Year", fy],
      ["Revenue (Actual)", proj.curRev],
      ["Revenue (Projected)", proj.projectedRev],
      ["Units Sold", proj.curUnits],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // 2. SKU Data
    const ws2Data = [["SKU", "Avg Price", ...MONTHS, "Proj n+1", "Proj n+2", "Proj n+3", "Growth"]];
    SKUS.forEach(sku => {
      const p = proj.skuProjections[sku] || { avgPrice: 0, n1: 0, n2: 0, n3: 0, growth: 0 };
      ws2Data.push([
        sku, p.avgPrice,
        ...MONTHS.map((_, i) => monthlyAgg[i].bySku[sku]?.units || 0),
        p.n1, p.n2, p.n3, p.growth
      ]);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
    XLSX.utils.book_append_sheet(wb, ws2, "SKU Data");

    // 3. By Channel
    const ws3Data = [["Channel", ...MONTHS, "Proj n+1", "Proj n+2", "Proj n+3", "Growth"]];
    CHANNELS.forEach(ch => {
      const p = proj.chProjections[ch.id] || { n1: 0, n2: 0, n3: 0, growth: 0 };
      ws3Data.push([
        ch.name,
        ...MONTHS.map((_, i) => monthlyAgg[i].byChannel[ch.id] || 0),
        p.n1, p.n2, p.n3, p.growth
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(ws3Data);
    XLSX.utils.book_append_sheet(wb, ws3, "By Channel");

    // 4. By Location
    const curAgg = monthlyAgg[mi];
    const ws4Data = [["City", "Region", "Units", "Revenue"]];
    Object.entries(curAgg.byCity).forEach(([city, d]) => {
      ws4Data.push([city, d.region, d.units, d.revenue]);
    });
    const ws4 = XLSX.utils.aoa_to_sheet(ws4Data);
    XLSX.utils.book_append_sheet(wb, ws4, "Location");

    // 5. Raw Data
    const ws5Data = [["Date", "Channel", "Invoice ID", "SKU", "Customer", "City", "Region", "Qty", "Price", "Subtotal"]];
    inv.forEach(iv => {
      iv.items.forEach(it => {
        ws5Data.push([iv.date, iv.channel, iv.id, it.sku, it.custName, it.city, it.region, it.qty, it.price, it.qty * it.price]);
      });
    });
    const ws5 = XLSX.utils.aoa_to_sheet(ws5Data);
    XLSX.utils.book_append_sheet(wb, ws5, "Raw Data");

    XLSX.writeFile(wb, `MIS_Export_${fy}.xlsx`);
  }, [fy, mi, inv]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-600">
        <div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Loading...</h2>
        <p className="text-sm mt-2">Reading from local storage</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* ── Gradient accent line ── */}
      <div className="header-glow w-full" />

      {/* ═══════════ HEADER BAR ═══════════ */}
      <header className="bg-[#0a0e17] text-white border-b border-[#1f2937]">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-accent-blue/20">
              P
            </div>
            <div>
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">
                Plant Essentials
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Investor MIS — Executive Dashboard
              </p>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-3">
            {/* FY Selector */}
            <select
              className="fy-select"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
            >
              {FY_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f.replace("_", " ")}
                </option>
              ))}
            </select>

            {/* JSON Export/Import */}
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={handleExportJson}>
                <span className="text-sm">📥</span> Export JSON
              </button>
              <label className="btn-ghost cursor-pointer flex items-center gap-1.5">
                <span className="text-sm">📤</span> Import JSON
                <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
              </label>
            </div>

            {/* Excel export — only on Dashboard */}
            {vw === "dashboard" && (
              <button className="btn-primary" onClick={handleExportExcel}>
                <span className="text-sm">📊</span>
                Excel
              </button>
            )}

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[11px] text-slate-400 font-medium">
                Local
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ TAB NAVIGATION ═══════════ */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setVw(tab.id)}
              className={`
                relative px-4 py-3 text-[13px] font-medium transition-all duration-200
                flex items-center gap-2
                ${
                  vw === tab.id
                    ? "text-slate-900 border-b-2 border-accent-blue"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }
              `}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ═══════════ MONTH SELECTOR ═══════════ */}
      <div className="bg-white border-b border-slate-200 mb-6">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center gap-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Period:
          </span>
            {MONTHS.map((month, idx) => (
              <button
                key={month}
                onClick={() => setMi(idx)}
                className={`month-pill px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide ${
                  mi === idx ? "active" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {month}
                {monthsWithData.has(idx) && mi !== idx && (
                  <span className="dot-indicator" />
                )}
              </button>
            ))}

            {/* Current period summary */}
            <div className="ml-auto flex items-center gap-3 text-[12px]">
              <span className="text-navy-500">
                {MONTHS[mi]} {fy.replace("FY_", "")}
              </span>
              <span className="text-navy-700">|</span>
              <span className="text-navy-400">
                Revenue:{" "}
                <span className="text-accent-cyan font-semibold">
                  {fmt(
                    CHANNELS.reduce(
                      (s, ch) => s + (dt[`rev_${ch.id}`] || 0),
                      0
                    )
                  )}
                </span>
              </span>
            </div>
          </div>
        </div>

      {/* ═══════════ MAIN CONTENT AREA ═══════════ */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 animate-fade-in">
        {vw === "dashboard" && (
          <Dashboard fy={fy} mi={mi} dt={dt} ad={ad} inv={inv} />
        )}
        {vw === "upload" && (
          <UploadTab
            fy={fy}
            setFy={setFy}
            setMi={setMi}
            setVw={setVw}
            inv={inv}
            setInv={setInv}
            showToast={showToast}
          />
        )}
        {vw === "sales" && <TabPlaceholder name="Sales Ops" icon="💰" />}
        {vw === "mis" && (
          <MisTab
            fy={fy}
            mi={mi}
            ad={ad}
            setAd={setAd}
            setDt={setDt}
            setVw={setVw}
            showToast={showToast}
          />
        )}
        {vw === "pnl" && <PnLTab fy={fy} mi={mi} dt={dt} />}
      </main>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-[#0a0e17] border-t border-[#1f2937] py-3 mt-auto">
        <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Plant Essentials Pvt Ltd</span>
          <div className="flex gap-4">
            <span>Invoices: {inv.length}</span>
            <span className="text-slate-300">{fy.replace("_", " ")}</span>
          </div>
        </div>
      </footer>

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-xl border ${
            toast.type === "error" 
              ? "bg-rose-950/80 border-rose-500/50 text-rose-200" 
              : "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
          }`}>
            <span className="text-lg">
              {toast.type === "error" ? "⚠️" : "✓"}
            </span>
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Component ──
function Dashboard({ fy, mi, dt, ad, inv }) {
  const monthlyAgg = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthInv = getMonthInv(inv, fy, i);
      return aggInvoices(monthInv);
    });
  }, [inv, fy]);

  const proj = useMemo(() => {
    return buildProjections(monthlyAgg, mi, fy);
  }, [monthlyAgg, mi, fy]);

  return (
    <div className="space-y-6">
      <DashboardTop
        fy={fy}
        mi={mi}
        dt={dt}
        ad={ad}
        inv={inv}
        monthlyAgg={monthlyAgg}
        proj={proj}
      />
      <DashboardMid mi={mi} monthlyAgg={monthlyAgg} proj={proj} />
      <DashboardBottom fy={fy} mi={mi} dt={dt} inv={inv} monthlyAgg={monthlyAgg} />
    </div>
  );
}

// ── Generic tab placeholder ──
function TabPlaceholder({ name, icon }) {
  return (
    <div className="flex items-center justify-center h-[400px]">
      <div className="text-center space-y-3">
        <div className="text-5xl">{icon}</div>
        <h2 className="text-xl font-semibold text-navy-200">{name}</h2>
        <p className="text-navy-500 text-sm">
          This section will be built next.
        </p>
      </div>
    </div>
  );
}
