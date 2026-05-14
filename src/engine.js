// Dashboard computation engine — projections, aggregations, moving averages
import { CHANNELS, SKUS, MONTHS, safeNum, getCalMonth, getCalYear } from "./data";

/* ── Invoice filtering by FY month index ── */
export function getMonthInv(inv, fy, monthIdx) {
  const cm = getCalMonth(monthIdx);
  const cy = getCalYear(monthIdx, fy);
  return inv.filter(v => {
    if (!v.date) return false;
    const d = new Date(v.date);
    return (d.getMonth() + 1) === cm && d.getFullYear() === cy;
  });
}

/* ── Aggregate invoice data ── */
export function aggInvoices(invoices) {
  let revenue = 0, units = 0;
  const byChannel = {}, bySku = {}, byCustomer = {}, byCity = {}, byRegion = {};

  invoices.forEach(inv => {
    revenue += safeNum(inv.subtotal);
    units += safeNum(inv.units);
    const ch = inv.channel || "unknown";
    byChannel[ch] = (byChannel[ch] || 0) + safeNum(inv.subtotal);

    (inv.items || []).forEach(it => {
      const sku = it.sku || "Others";
      if (!bySku[sku]) bySku[sku] = { units: 0, revenue: 0, prices: [] };
      bySku[sku].units += safeNum(it.qty);
      bySku[sku].revenue += safeNum(it.qty) * safeNum(it.price);
      if (it.price) bySku[sku].prices.push(safeNum(it.price));

      const cust = it.custName || "Walk-in";
      if (!byCustomer[cust]) byCustomer[cust] = { units: 0, revenue: 0 };
      byCustomer[cust].units += safeNum(it.qty);
      byCustomer[cust].revenue += safeNum(it.qty) * safeNum(it.price);

      const city = it.city || "Unknown";
      if (!byCity[city]) byCity[city] = { units: 0, revenue: 0, region: it.region || "Unknown" };
      byCity[city].units += safeNum(it.qty);
      byCity[city].revenue += safeNum(it.qty) * safeNum(it.price);

      const reg = it.region || "Unknown";
      byRegion[reg] = (byRegion[reg] || 0) + safeNum(it.qty) * safeNum(it.price);
    });
  });

  return { revenue, units, orders: invoices.length, byChannel, bySku, byCustomer, byCity, byRegion };
}

/* ── Safe growth rate ── */
function sGrowth(cur, prev) {
  if (prev === 0) return cur > 0 ? 0.1 : 0;
  return (cur - prev) / prev;
}

/* ── Weighted average of up to 3 growth rates (60/30/10) ── */
function weightedGrowth(rates) {
  const w = [0.6, 0.3, 0.1];
  if (rates.length === 0) return 0.03;
  if (rates.length === 1) return rates[0];
  if (rates.length === 2) return rates[0] * 0.7 + rates[1] * 0.3;
  return rates[0] * w[0] + rates[1] * w[1] + rates[2] * w[2];
}

/* ── Clamp value ── */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ── Build projections from monthly aggregations ── */
export function buildProjections(monthlyAgg, mi, fy) {
  const calMonth = getCalMonth(mi);
  const calYear = getCalYear(mi, fy);
  const today = new Date();
  const isPartial = today.getFullYear() === calYear && (today.getMonth() + 1) === calMonth;
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const daysElapsed = isPartial ? today.getDate() : daysInMonth;

  const cur = monthlyAgg[mi];
  const curRev = isPartial && daysElapsed > 0
    ? (cur.revenue / daysElapsed) * daysInMonth
    : cur.revenue;
  const curUnits = isPartial && daysElapsed > 0
    ? (cur.units / daysElapsed) * daysInMonth
    : cur.units;

  // ── SKU-level growth ──
  const skuGrowth = {};
  SKUS.forEach(sku => {
    const hist = [];
    for (let i = Math.max(0, mi - 3); i <= mi; i++) {
      hist.push(monthlyAgg[i].bySku[sku]?.units || 0);
    }
    const rates = [];
    for (let i = 1; i < hist.length; i++) {
      rates.push(sGrowth(hist[i], hist[i - 1]));
    }
    rates.reverse(); // most recent first
    skuGrowth[sku] = clamp(weightedGrowth(rates), -0.15, 0.40);
  });

  // ── Channel-level momentum ──
  const chGrowth = {};
  CHANNELS.forEach(ch => {
    const hist = [];
    for (let i = Math.max(0, mi - 3); i <= mi; i++) {
      hist.push(monthlyAgg[i].byChannel[ch.id] || 0);
    }
    const rates = [];
    for (let i = 1; i < hist.length; i++) {
      rates.push(sGrowth(hist[i], hist[i - 1]));
    }
    rates.reverse();
    chGrowth[ch.id] = clamp(weightedGrowth(rates), -0.15, 0.40);
  });

  // ── Combined growth per SKU (50% SKU + 50% avg channel), floor 3% ──
  const avgChGrowth = CHANNELS.reduce((s, c) => s + chGrowth[c.id], 0) / CHANNELS.length;
  const skuProjections = {};
  SKUS.forEach(sku => {
    const combined = Math.max(0.03, skuGrowth[sku] * 0.5 + avgChGrowth * 0.5);
    const base = monthlyAgg[mi].bySku[sku]?.units || 0;
    const baseRev = monthlyAgg[mi].bySku[sku]?.revenue || 0;
    const avgPrice = base > 0 ? baseRev / base : 0;
    const n1u = Math.round(base * (1 + combined));
    const n2u = Math.round(n1u * (1 + combined));
    const n3u = Math.round(n2u * (1 + combined));
    skuProjections[sku] = {
      growth: combined,
      velocity: combined > 0.2 ? "Fast" : combined > 0 ? "Medium" : "Slow",
      current: base,
      currentRev: baseRev,
      avgPrice,
      n1: n1u, n2: n2u, n3: n3u,
      n1Rev: n1u * avgPrice, n2Rev: n2u * avgPrice, n3Rev: n3u * avgPrice,
    };
  });

  // ── Overall projected revenue ──
  const projectedRev = Object.values(skuProjections).reduce((s, p) => s + (p.currentRev || 0), 0) || curRev;
  const overallGrowth = Math.max(0.03, avgChGrowth * 0.5 + (Object.values(skuGrowth).reduce((s, g) => s + g, 0) / SKUS.length) * 0.5);

  const n1Rev = curRev * (1 + overallGrowth);
  const n2Rev = n1Rev * (1 + overallGrowth);
  const n3Rev = n2Rev * (1 + overallGrowth);
  const n1Units = curUnits * (1 + overallGrowth);
  const n2Units = n1Units * (1 + overallGrowth);
  const n3Units = n2Units * (1 + overallGrowth);

  // ── Channel projections for trend matrix ──
  const chProjections = {};
  CHANNELS.forEach(ch => {
    const base = monthlyAgg[mi].byChannel[ch.id] || 0;
    const g = Math.max(0.03, chGrowth[ch.id] * 0.5 + overallGrowth * 0.5);
    chProjections[ch.id] = { n1: base * (1 + g), n2: base * (1 + g) ** 2, n3: base * (1 + g) ** 3, growth: g };
  });

  return {
    curRev, curUnits, isPartial, daysElapsed, daysInMonth,
    overallGrowth,
    n1Rev, n2Rev, n3Rev,
    n1Units, n2Units, n3Units,
    skuProjections, skuGrowth, chGrowth, chProjections,
    projectedRev,
  };
}

/* ── Moving averages from all invoices ── */
export function buildMovingAverages(inv, fy) {
  const dailyMap = {};
  const chDailyMap = {};

  inv.forEach(invoice => {
    if (!invoice.date) return;
    const dateStr = invoice.date.slice(0, 10);
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + safeNum(invoice.subtotal);
    const ch = invoice.channel || "unknown";
    if (!chDailyMap[ch]) chDailyMap[ch] = {};
    chDailyMap[ch][dateStr] = (chDailyMap[ch][dateStr] || 0) + safeNum(invoice.subtotal);
  });

  const dates = Object.keys(dailyMap).sort();
  if (dates.length < 2) return null;

  const dailyData = dates.map(d => ({ date: d, revenue: dailyMap[d] }));

  const rollingAvg = (arr, window) => {
    return arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = arr.slice(start, i + 1);
      return slice.reduce((s, v) => s + v.revenue, 0) / slice.length;
    });
  };

  const ma7 = rollingAvg(dailyData, 7);
  const ma30 = rollingAvg(dailyData, 30);
  const combined = dailyData.map((d, i) => ({
    date: d.date.slice(5), // MM-DD
    revenue: d.revenue,
    ma7: Math.round(ma7[i]),
    ma30: Math.round(ma30[i]),
    ratio: ma30[i] > 0 ? +(ma7[i] / ma30[i]).toFixed(3) : 1,
  }));

  // Per-channel
  const channelMA = {};
  CHANNELS.forEach(ch => {
    const chData = chDailyMap[ch.id];
    if (!chData) return;
    const chDates = dates.filter(d => chData[d]);
    if (chDates.length < 2) return;
    const chDaily = dates.map(d => ({ date: d, revenue: chData[d] || 0 }));
    const ch7 = rollingAvg(chDaily, 7);
    const ch30 = rollingAvg(chDaily, 30);
    channelMA[ch.id] = dates.map((d, i) => ({
      date: d.slice(5),
      ma7: Math.round(ch7[i]),
      ma30: Math.round(ch30[i]),
    }));
  });

  const lastMa7 = ma7[ma7.length - 1];
  const lastMa30 = ma30[ma30.length - 1];

  return {
    combined,
    ma7Last: lastMa7,
    ma30Last: lastMa30,
    ratio: lastMa30 > 0 ? lastMa7 / lastMa30 : 1,
    dataPoints: dates.length,
    channelMA,
  };
}

/* ── Repeat customer analysis ── */
export function buildRepeatCustomers(monthlyAgg) {
  const custMonths = {};
  monthlyAgg.forEach((agg, i) => {
    Object.keys(agg.byCustomer).forEach(name => {
      if (!custMonths[name]) custMonths[name] = new Set();
      custMonths[name].add(i);
    });
  });
  return Object.entries(custMonths)
    .filter(([, s]) => s.size >= 2)
    .map(([name, s]) => ({ name, months: s.size, revenue: monthlyAgg.reduce((sum, a) => sum + (a.byCustomer[name]?.revenue || 0), 0) }))
    .sort((a, b) => b.months - a.months || b.revenue - a.revenue);
}
