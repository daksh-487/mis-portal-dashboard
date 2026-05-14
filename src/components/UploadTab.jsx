import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  CHANNELS,
  SKUS,
  detSKU,
  normCity,
  emptyInvoice,
  emptyItem,
  fmt,
  saveSales,
  loadSales,
  pDate,
  FY_OPTIONS,
} from "../data";

// ── Patterns for auto-mapping columns ──
const COL_PATTERNS = {
  date: ["date", "ordered", "timestamp", "created"],
  sku: ["sku", "product", "item", "description", "title"],
  qty: ["qty", "quantity", "units"],
  price: ["price", "rate", "unit price", "base price"],
  customer: ["customer", "buyer", "name", "client"],
  city: ["city", "location", "shipping city"],
  tax: ["tax", "total tax", "gst"],
  cgst: ["cgst"],
  sgst: ["sgst"],
  igst: ["igst"],
  orderId: ["order id", "invoice id", "order number", "invoice number"],
};

export default function UploadTab({ fy, setFy, setMi, setVw, inv, setInv, showToast }) {
  const [step, setStep] = useState(1);
  const [channel, setChannel] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [summary, setSummary] = useState({
    totalRows: 0,
    matched: 0,
    unmatched: 0,
    revenue: 0,
    invoiceCount: 0,
    targetFy: fy,
    targetMi: 0,
  });

  const fileInputRef = useRef(null);

  // ── Step 1: Select Channel & Upload File ──
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary", cellDates: true });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        setColumns(headers);
        setParsedRows(data);
        autoMapColumns(headers, channel);
        setStep(2);
      } else {
        showToast("File is empty or could not be parsed.", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = (headers, selectedChannel) => {
    // Try to load saved mapping from localStorage for this channel
    const saved = localStorage.getItem(`oatey-mapping-${selectedChannel}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMapping(parsed);
        return;
      } catch (e) {
        // ignore
      }
    }

    // Auto-map by patterns
    const newMapping = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    for (const [key, patterns] of Object.entries(COL_PATTERNS)) {
      for (const pattern of patterns) {
        const matchIdx = lowerHeaders.findIndex((h) => h.includes(pattern));
        if (matchIdx !== -1) {
          newMapping[key] = headers[matchIdx];
          break;
        }
      }
    }
    setMapping(newMapping);
  };

  // ── Step 2: Map Columns ──
  const handleMapChange = (key, val) => {
    setMapping((prev) => ({ ...prev, [key]: val }));
  };

  const processPreview = () => {
    if (!mapping.date || !mapping.sku || !mapping.qty || !mapping.price) {
      showToast("Please map Date, SKU, Quantity, and Unit Price to proceed.", "error");
      return;
    }

    // Save mapping to localStorage
    localStorage.setItem(`oatey-mapping-${channel}`, JSON.stringify(mapping));

    const processed = parsedRows.map((row, idx) => {
      const rawDate = row[mapping.date];
      const rawSku = row[mapping.sku] || "";
      const matchedSku = detSKU(rawSku);
      const qty = parseFloat(row[mapping.qty]) || 0;
      const price = parseFloat(row[mapping.price]) || 0;
      const rawCity = row[mapping.city] || "";
      const normC = normCity(rawCity);
      const dateStr = pDate(rawDate) || "";
      const customer = row[mapping.customer] || "Walk-in";

      let tax = 0;
      if (mapping.tax) tax += parseFloat(row[mapping.tax]) || 0;
      if (mapping.cgst) tax += parseFloat(row[mapping.cgst]) || 0;
      if (mapping.sgst) tax += parseFloat(row[mapping.sgst]) || 0;
      if (mapping.igst) tax += parseFloat(row[mapping.igst]) || 0;

      return {
        _id: idx,
        date: dateStr,
        rawSku,
        sku: matchedSku,
        qty,
        price,
        customer,
        city: normC.city,
        region: normC.region,
        tax,
        total: qty * price,
        orderId: row[mapping.orderId] || "",
        unmatched: matchedSku === "Others",
      };
    });

    // Valid rows have a date and qty > 0
    const valid = processed.filter((r) => r.date && r.qty > 0);
    const matchedCnt = valid.filter((r) => !r.unmatched).length;
    const rev = valid.reduce((sum, r) => sum + r.total, 0);

    setPreviewData(valid);
    setSummary((prev) => ({
      ...prev,
      totalRows: valid.length,
      matched: matchedCnt,
      unmatched: valid.length - matchedCnt,
      revenue: rev,
    }));
    setStep(3);
  };

  // ── Step 3: Preview & Generate Invoices ──
  const updateSku = (id, newSku) => {
    setPreviewData((prev) => {
      const nd = prev.map((r) => {
        if (r._id === id) {
          return { ...r, sku: newSku, unmatched: newSku === "Others" };
        }
        return r;
      });
      const matchedCnt = nd.filter((r) => !r.unmatched).length;
      setSummary((s) => ({ ...s, matched: matchedCnt, unmatched: nd.length - matchedCnt }));
      return nd;
    });
  };

  const generateInvoices = () => {
    if (previewData.length === 0) return;

    // Group by date to create one invoice per date
    const byDate = {};
    previewData.forEach((r) => {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    });

    const newInvoices = [];
    let detectedFy = fy;
    let detectedMi = 0;

    for (const [dtStr, rows] of Object.entries(byDate)) {
      const invObj = emptyInvoice();
      invObj.date = dtStr;
      invObj.channel = channel;
      invObj.source = "upload";

      let subtotal = 0;
      let units = 0;
      let totalTax = 0;

      rows.forEach((r) => {
        const item = emptyItem();
        item.sku = r.sku;
        item.qty = r.qty;
        item.price = r.price;
        item.custName = r.customer;
        item.city = r.city;
        item.region = r.region;
        item.orderId = r.orderId;

        subtotal += r.total;
        units += r.qty;
        totalTax += r.tax;
        invObj.items.push(item);
      });

      invObj.subtotal = subtotal;
      invObj.units = units;
      invObj.gst = totalTax;

      newInvoices.push(invObj);

      // Auto-detect FY and Month from the first valid date
      if (newInvoices.length === 1) {
        const d = new Date(dtStr);
        const calMonth = d.getMonth() + 1; // 1-12
        const calYear = d.getFullYear();
        // Determine FY string
        let startYear = calMonth >= 4 ? calYear : calYear - 1;
        const fyStr = `FY_${startYear}-${(startYear + 1).toString().slice(2)}`;
        if (FY_OPTIONS.includes(fyStr)) {
          detectedFy = fyStr;
        }
        detectedMi = calMonth >= 4 ? calMonth - 4 : calMonth + 8;
      }
    }

    // Load existing invoices for the detected FY, append, and save
    const existing = loadSales(detectedFy);
    const merged = [...existing, ...newInvoices];
    saveSales(detectedFy, merged);

    // If we're currently on this FY, immediately update the App's inv state
    if (detectedFy === fy) {
      setInv(merged);
    }

    setSummary((prev) => ({
      ...prev,
      invoiceCount: newInvoices.length,
      targetFy: detectedFy,
      targetMi: detectedMi,
      revenue: newInvoices.reduce((s, i) => s + i.subtotal, 0),
      totalUnits: newInvoices.reduce((s, i) => s + i.units, 0),
    }));

    setStep(4);
  };

  // ── Step 4: Finish ──
  const finishUpload = (navTo) => {
    // If target FY or month changed, update App state so it switches
    if (summary.targetFy !== fy) {
      setFy(summary.targetFy);
    }
    setMi(summary.targetMi);

    // If staying in upload, reset
    if (navTo === "upload") {
      setStep(1);
      setChannel(null);
      setFile(null);
      setFileName("");
      setParsedRows([]);
      setColumns([]);
      setPreviewData([]);
    } else {
      setVw(navTo);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Wizard Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Upload Sales Data</h2>
          <p className="text-slate-500 text-sm">
            Import channel sales via Excel/CSV. Step {step} of 4.
          </p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-accent-blue"
                  : s < step
                  ? "w-4 bg-accent-emerald"
                  : "w-4 bg-slate-100"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        {/* ════ STEP 1: Select Channel ════ */}
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              1. Select Channel
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {CHANNELS.map((ch) => {
                const isSelected = channel === ch.id;
                const hasMapping = !!localStorage.getItem(`oatey-mapping-${ch.id}`);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setChannel(ch.id)}
                    className={`
                      relative p-4 rounded-xl border text-left transition-all duration-200
                      ${
                        isSelected
                          ? "bg-slate-100/80 border-accent-blue shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                          : "bg-white/40 border-slate-200/50 hover:bg-slate-100/40 hover:border-slate-300/50"
                      }
                    `}
                  >
                    {hasMapping && (
                      <span className="absolute top-3 right-3 text-[9px] bg-slate-100 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                        MAPPED
                      </span>
                    )}
                    <span className="text-2xl mb-2 block">{ch.icon}</span>
                    <p className={`font-semibold text-sm ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                      {ch.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ch.desc}</p>
                  </button>
                );
              })}
            </div>

            <div
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                ${
                  channel
                    ? "border-accent-blue/40 bg-accent-blue/5"
                    : "border-slate-200 bg-white/30 opacity-50 pointer-events-none"
                }
              `}
            >
              <div className="text-4xl mb-3">📁</div>
              <p className="text-slate-700 font-medium mb-1">
                {channel ? "Upload .xlsx, .xls, or .csv" : "Select a channel first"}
              </p>
              <p className="text-slate-400 text-xs mb-4">
                Drag & drop or click to browse
              </p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                className="btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={!channel}
              >
                Browse File
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2: Map Columns ════ */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                2. Map Columns for {CHANNELS.find((c) => c.id === channel)?.name}
              </h3>
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded">
                File: {fileName}
              </span>
            </div>

            <div className="bg-white/50 rounded-xl p-5 border border-slate-200/50 mb-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {/* Required Fields */}
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-3 border-b border-slate-100 pb-1">
                    Required Fields
                  </h4>
                  {[
                    { key: "date", label: "Date" },
                    { key: "sku", label: "Product / SKU" },
                    { key: "qty", label: "Quantity" },
                    { key: "price", label: "Unit Price (excl. GST)" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-700">{f.label} *</label>
                      <select
                        className="bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-md px-3 py-1.5 w-48 focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none"
                        value={mapping[f.key] || ""}
                        onChange={(e) => handleMapChange(f.key, e.target.value)}
                      >
                        <option value="">-- Select Column --</option>
                        {columns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* Optional Fields */}
                <div>
                  <h4 className="text-xs text-slate-500 font-semibold mb-3 border-b border-slate-100 pb-1">
                    Optional Fields
                  </h4>
                  {[
                    { key: "customer", label: "Customer Name" },
                    { key: "city", label: "City / Location" },
                    { key: "tax", label: "Total Tax / GST" },
                    { key: "cgst", label: "CGST" },
                    { key: "sgst", label: "SGST" },
                    { key: "igst", label: "IGST" },
                    { key: "orderId", label: "Order / Invoice ID" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between mb-3">
                      <label className="text-sm text-slate-600">{f.label}</label>
                      <select
                        className="bg-slate-50 border border-slate-100 text-sm text-slate-700 rounded-md px-3 py-1.5 w-48 focus:border-slate-400 outline-none"
                        value={mapping[f.key] || ""}
                        onChange={(e) => handleMapChange(f.key, e.target.value)}
                      >
                        <option value="">-- Select Column --</option>
                        {columns.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button className="btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="btn-primary" onClick={processPreview}>
                Preview Data ➔
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 3: Preview Data ════ */}
        {step === 3 && (
          <div className="animate-fade-in flex flex-col h-[600px]">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
              3. Preview & Fix SKUs
            </h3>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-3 mb-4 shrink-0">
              <div className="bg-white/50 rounded-lg p-3 border border-slate-200/50">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Valid Rows</p>
                <p className="text-xl font-bold text-slate-900">{summary.totalRows}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3 border border-emerald-500/20">
                <p className="text-[10px] text-emerald-400/80 uppercase font-bold">Matched SKUs</p>
                <p className="text-xl font-bold text-emerald-400">{summary.matched}</p>
              </div>
              <div className={`bg-white/50 rounded-lg p-3 border ${summary.unmatched > 0 ? "border-rose-500/40" : "border-slate-200/50"}`}>
                <p className={`text-[10px] uppercase font-bold ${summary.unmatched > 0 ? "text-rose-400/80" : "text-slate-500"}`}>Unmatched SKUs</p>
                <p className={`text-xl font-bold ${summary.unmatched > 0 ? "text-rose-400" : "text-slate-900"}`}>{summary.unmatched}</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3 border border-blue-500/20">
                <p className="text-[10px] text-blue-400/80 uppercase font-bold">Total Revenue</p>
                <p className="text-xl font-bold text-blue-400">{fmt(summary.revenue)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-white sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="p-2.5 font-semibold text-slate-600">Date</th>
                    <th className="p-2.5 font-semibold text-slate-600">Raw Product</th>
                    <th className="p-2.5 font-semibold text-slate-600 w-40">Matched SKU</th>
                    <th className="p-2.5 font-semibold text-slate-600">Customer</th>
                    <th className="p-2.5 font-semibold text-slate-600">City</th>
                    <th className="p-2.5 font-semibold text-slate-600 text-right">Qty</th>
                    <th className="p-2.5 font-semibold text-slate-600 text-right">Rate</th>
                    <th className="p-2.5 font-semibold text-slate-600 text-right">Tax</th>
                    <th className="p-2.5 font-semibold text-slate-900 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {previewData.slice(0, 100).map((r) => (
                    <tr
                      key={r._id}
                      className={`hover:bg-slate-100/40 ${
                        r.unmatched ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="p-2.5 text-slate-700 whitespace-nowrap">{r.date}</td>
                      <td className="p-2.5 text-slate-500 truncate max-w-[150px]" title={r.rawSku}>
                        {r.rawSku}
                      </td>
                      <td className="p-2.5">
                        <select
                          className={`w-full text-xs rounded border px-1.5 py-1 outline-none ${
                            r.unmatched
                              ? "bg-rose-900/30 border-rose-500/50 text-rose-200"
                              : "bg-white border-slate-200 text-emerald-400"
                          }`}
                          value={r.sku}
                          onChange={(e) => updateSku(r._id, e.target.value)}
                        >
                          {SKUS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5 text-slate-600 truncate max-w-[120px]">{r.customer}</td>
                      <td className="p-2.5 text-slate-600">{r.city}</td>
                      <td className="p-2.5 text-right font-medium text-slate-700">{r.qty}</td>
                      <td className="p-2.5 text-right text-slate-500">₹{r.price.toFixed(1)}</td>
                      <td className="p-2.5 text-right text-slate-400">₹{r.tax.toFixed(1)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-900">₹{r.total.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 100 && (
                <div className="p-3 text-center text-xs text-slate-400 bg-white/30">
                  Showing first 100 of {previewData.length} rows...
                </div>
              )}
            </div>

            <div className="flex justify-between shrink-0 mt-auto">
              <button className="btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="btn-primary"
                onClick={generateInvoices}
                disabled={previewData.length === 0}
              >
                Generate Invoices
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 4: Done ════ */}
        {step === 4 && (
          <div className="animate-fade-in text-center py-12">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl text-emerald-400">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm">
              Successfully generated {summary.invoiceCount} invoices from {summary.totalRows} line items.
              Data was saved to {summary.targetFy}.
            </p>

            <div className="flex justify-center gap-6 mb-10">
              <div className="bg-white/50 rounded-xl p-5 border border-slate-200/50 w-40">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Invoices</p>
                <p className="text-2xl font-bold text-slate-900">{summary.invoiceCount}</p>
              </div>
              <div className="bg-white/50 rounded-xl p-5 border border-slate-200/50 w-40">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Revenue</p>
                <p className="text-2xl font-bold text-emerald-400">{fmt(summary.revenue)}</p>
              </div>
              <div className="bg-white/50 rounded-xl p-5 border border-slate-200/50 w-40">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Units</p>
                <p className="text-2xl font-bold text-blue-400">{summary.totalUnits}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button className="btn-ghost" onClick={() => finishUpload("upload")}>
                Upload More
              </button>
              <button className="btn-ghost" onClick={() => finishUpload("sales")}>
                View Invoices
              </button>
              <button className="btn-primary" onClick={() => finishUpload("dashboard")}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
