// ─────────────────────────────────────────────────────────────
//  Plant Essentials MIS Portal — Data Layer
//  All constants, helpers, schemas, and localStorage persistence
// ─────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════
//  1. GLOBAL CONSTANTS
// ══════════════════════════════════════════════════════════════

export const FY_OPTIONS = ["FY_2025-26", "FY_2026-27"];

export const MONTHS = [
  "Apr", "May", "Jun", "Jul", "Aug", "Sep",
  "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
];

export const CHANNELS = [
  {
    id: "horeca",
    name: "HoReCa",
    icon: "🏨",
    color: "#6366f1",
    bg: "#eef2ff",
    desc: "Hotels, Restaurants & Cafés",
  },
  {
    id: "qcom",
    name: "Quick Commerce",
    icon: "⚡",
    color: "#f59e0b",
    bg: "#fffbeb",
    desc: "Blinkit, Zepto, Instamart",
  },
  {
    id: "ecom",
    name: "E-Commerce",
    icon: "🛒",
    color: "#10b981",
    bg: "#ecfdf5",
    desc: "Amazon, Flipkart, etc.",
  },
  {
    id: "physical",
    name: "Physical Retail",
    icon: "🏪",
    color: "#3b82f6",
    bg: "#eff6ff",
    desc: "Supermarkets & Kirana stores",
  },
  {
    id: "b2b_corp",
    name: "B2B Corporate",
    icon: "🏢",
    color: "#8b5cf6",
    bg: "#f5f3ff",
    desc: "Corporate bulk orders",
  },
  {
    id: "b2b_vending",
    name: "B2B Vending",
    icon: "🤖",
    color: "#ef4444",
    bg: "#fef2f2",
    desc: "Vending machine partnerships",
  },
  {
    id: "community",
    name: "Community",
    icon: "👥",
    color: "#ec4899",
    bg: "#fdf2f8",
    desc: "Community group orders",
  },
  {
    id: "website",
    name: "Website D2C",
    icon: "🌐",
    color: "#14b8a6",
    bg: "#f0fdfa",
    desc: "Direct-to-consumer via website",
  },
];

export const SKUS = [
  "Millet",
  "Barista",
  "Chocolate",
  "Caramel Coffee",
  "Kesar Badam",
  "Pre Orders",
  "Assorted Box",
  "Others",
];

export const OPEX_KEYS = [
  { key: "employment",    label: "Employment Cost" },
  { key: "director_rem",  label: "Director Remuneration" },
  { key: "travel",        label: "Travel & Conveyance" },
  { key: "rent",          label: "Rent" },
  { key: "prof_fees",     label: "Professional Fees" },
  { key: "consulting",    label: "Consulting Charges" },
  { key: "legal",         label: "Legal & Compliance" },
  { key: "tax_paid",      label: "Tax Paid" },
  { key: "software",      label: "Software & Subscriptions" },
  { key: "internet",      label: "Internet & Telecom" },
  { key: "office",        label: "Office Supplies" },
  { key: "other_admin",   label: "Other Admin Expenses" },
];

// ══════════════════════════════════════════════════════════════
//  2. SKU KEYWORD MAP (for fuzzy matching)
// ══════════════════════════════════════════════════════════════

const SKU_KEYWORDS = {
  Millet:          ["millet", "oat millet", "millet oat"],
  Barista:         ["barista", "barista blend", "barista oat"],
  Chocolate:       ["chocolate", "choco", "choc"],
  "Caramel Coffee": ["caramel", "coffee", "caramel coffee"],
  "Kesar Badam":   ["kesar", "badam", "saffron", "almond", "kesar badam"],
  "Pre Orders":    ["pre order", "preorder", "pre-order", "advance"],
  "Assorted Box":  ["assorted", "combo", "box", "variety", "mixed"],
  Others:          [],
};

// ══════════════════════════════════════════════════════════════
//  3. CITY NORMALIZATION MAP
// ══════════════════════════════════════════════════════════════

const CITY_ALIASES = {
  bangalore:    "Bengaluru",
  bengaluru:    "Bengaluru",
  blr:          "Bengaluru",
  mumbai:       "Mumbai",
  bombay:       "Mumbai",
  delhi:        "Delhi",
  "new delhi":  "Delhi",
  ncr:          "Delhi",
  gurgaon:      "Gurugram",
  gurugram:     "Gurugram",
  noida:        "Noida",
  chennai:      "Chennai",
  madras:       "Chennai",
  hyderabad:    "Hyderabad",
  hyd:          "Hyderabad",
  kolkata:      "Kolkata",
  calcutta:     "Kolkata",
  pune:         "Pune",
  ahmedabad:    "Ahmedabad",
  jaipur:       "Jaipur",
  lucknow:      "Lucknow",
  chandigarh:   "Chandigarh",
  kochi:        "Kochi",
  cochin:       "Kochi",
  trivandrum:   "Thiruvananthapuram",
  thiruvananthapuram: "Thiruvananthapuram",
  coimbatore:   "Coimbatore",
  indore:       "Indore",
  bhopal:       "Bhopal",
  nagpur:       "Nagpur",
  patna:        "Patna",
  surat:        "Surat",
  vadodara:     "Vadodara",
  baroda:       "Vadodara",
  vizag:        "Visakhapatnam",
  visakhapatnam:"Visakhapatnam",
  mysore:       "Mysuru",
  mysuru:       "Mysuru",
  mangalore:    "Mangaluru",
  mangaluru:    "Mangaluru",
  goa:          "Goa",
  guwahati:     "Guwahati",
  bhubaneswar:  "Bhubaneswar",
  ranchi:       "Ranchi",
  dehradun:     "Dehradun",
  shimla:       "Shimla",
  jammu:        "Jammu",
  amritsar:     "Amritsar",
  ludhiana:     "Ludhiana",
};

const CITY_REGIONS = {
  Delhi:         "North",
  Gurugram:      "North",
  Noida:         "North",
  Lucknow:       "North",
  Chandigarh:    "North",
  Jaipur:        "North",
  Dehradun:      "North",
  Shimla:        "North",
  Jammu:         "North",
  Amritsar:      "North",
  Ludhiana:      "North",
  Indore:        "North",
  Bhopal:        "North",
  Mumbai:        "West",
  Pune:          "West",
  Ahmedabad:     "West",
  Surat:         "West",
  Vadodara:      "West",
  Nagpur:        "West",
  Goa:           "West",
  Bengaluru:     "South",
  Chennai:       "South",
  Hyderabad:     "South",
  Kochi:         "South",
  Thiruvananthapuram: "South",
  Coimbatore:    "South",
  Visakhapatnam: "South",
  Mysuru:        "South",
  Mangaluru:     "South",
  Kolkata:       "East",
  Patna:         "East",
  Guwahati:      "East",
  Bhubaneswar:   "East",
  Ranchi:        "East",
};

// ══════════════════════════════════════════════════════════════
//  4. HELPER / UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Format a number as ₹ with Cr / L / K suffixes.
 * e.g. 15000000 → "₹1.50 Cr", 340000 → "₹3.40 L", 7500 → "₹7.50 K"
 */
export function fmt(n) {
  const v = safeNum(n);
  if (v === 0) return "₹0";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(2)} K`;
  return `${sign}₹${abs.toFixed(2)}`;
}

/**
 * Indian locale number formatting (with commas).
 * e.g. 1234567 → "12,34,567"
 */
export function fN(n) {
  const v = safeNum(n);
  return v.toLocaleString("en-IN");
}

/**
 * Safely parse any value to a float. Returns 0 for unparseable values.
 */
export function safeNum(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  const cleaned = String(v).replace(/[₹,\s]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse various date formats to YYYY-MM-DD.
 * Handles: Excel serial dates, ISO strings, DD/MM/YYYY, MM/DD/YYYY.
 */
export function pDate(v) {
  if (!v) return null;

  // Excel serial date number
  if (typeof v === "number" || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const serial = typeof v === "number" ? v : parseFloat(String(v).trim());
    // Excel epoch starts 1900-01-01, but has the 1900 leap year bug (+1 day offset)
    const excelEpoch = new Date(1899, 11, 30);
    const ms = excelEpoch.getTime() + serial * 86400000;
    const d = new Date(ms);
    return _isoDate(d);
  }

  const s = String(v).trim();

  // ISO format: 2025-04-15 or 2025-04-15T...
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : _isoDate(d);
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmm = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (ddmm) {
    const [, a, b, year] = ddmm;
    const dayFirst = parseInt(a, 10);
    const monthFirst = parseInt(b, 10);

    // If first number > 12 it must be day
    if (dayFirst > 12) {
      const d = new Date(parseInt(year), monthFirst - 1, dayFirst);
      return isNaN(d.getTime()) ? null : _isoDate(d);
    }
    // If second number > 12 it must be day (MM/DD/YYYY)
    if (monthFirst > 12) {
      const d = new Date(parseInt(year), dayFirst - 1, monthFirst);
      return isNaN(d.getTime()) ? null : _isoDate(d);
    }
    // Ambiguous — assume DD/MM/YYYY (Indian standard)
    const d = new Date(parseInt(year), monthFirst - 1, dayFirst);
    return isNaN(d.getTime()) ? null : _isoDate(d);
  }

  // Fallback: try native Date parsing
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : _isoDate(fallback);
}

/** Internal: format Date to YYYY-MM-DD */
function _isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Fuzzy-match a product name string to one of the defined SKUs.
 * Returns the matched SKU name, or "Others" if no match.
 */
export function detSKU(text) {
  if (!text) return "Others";
  const lower = String(text).toLowerCase().trim();
  if (!lower) return "Others";

  for (const [sku, keywords] of Object.entries(SKU_KEYWORDS)) {
    if (sku === "Others") continue;
    // Exact SKU name match
    if (lower === sku.toLowerCase()) return sku;
    // Keyword match
    for (const kw of keywords) {
      if (lower.includes(kw)) return sku;
    }
  }
  return "Others";
}

/**
 * Normalize a city name to its canonical form and assign a region.
 * Returns { city: string, region: string }.
 */
export function normCity(raw) {
  if (!raw) return { city: "Unknown", region: "Unknown" };
  const lower = String(raw).toLowerCase().trim();
  if (!lower) return { city: "Unknown", region: "Unknown" };

  const canonical = CITY_ALIASES[lower];
  if (canonical) {
    return {
      city: canonical,
      region: CITY_REGIONS[canonical] || "Unknown",
    };
  }

  // If not in alias map, title-case the input
  const titleCased = lower
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    city: titleCased,
    region: CITY_REGIONS[titleCased] || "Unknown",
  };
}

/**
 * Convert a 0-based FY month index to the calendar month number.
 * FY starts in April: index 0 → April (4), index 9 → January (1), etc.
 */
export function getCalMonth(monthIndex) {
  return ((monthIndex + 3) % 12) + 1;
}

/**
 * Get the calendar year for a given FY month index.
 * For FY_2025-26: Apr–Dec (index 0–8) → 2025, Jan–Mar (index 9–11) → 2026.
 */
export function getCalYear(monthIndex, fy) {
  const match = String(fy).match(/(\d{4})-(\d{2,4})$/);
  if (!match) return new Date().getFullYear();
  const startYear = parseInt(match[1], 10);
  // Months 0-8 (Apr-Dec) belong to the start year, 9-11 (Jan-Mar) to start+1
  return monthIndex >= 9 ? startYear + 1 : startYear;
}

// ══════════════════════════════════════════════════════════════
//  5. SCHEMAS / FACTORY FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Create an empty month data object with all fields zeroed out.
 * This is the canonical shape for one month of MIS data.
 */
export function emptyMonth() {
  return {
    // Revenue per channel
    rev_horeca: 0,
    rev_qcom: 0,
    rev_ecom: 0,
    rev_physical: 0,
    rev_b2b_corp: 0,
    rev_b2b_vending: 0,
    rev_community: 0,
    rev_website: 0,

    // Volume
    units_sold: 0,
    cost_per_unit: 22,

    // Inventory
    opening_stock: 0,
    closing_stock: 0,
    purchases: 0,

    // COGS components
    packaging: 0,
    marketplace_fees: 0,
    courier: 0,
    marketing: 0,

    // OPEX (12 fields)
    employment: 0,
    director_rem: 0,
    travel: 0,
    rent: 0,
    prof_fees: 0,
    consulting: 0,
    legal: 0,
    tax_paid: 0,
    software: 0,
    internet: 0,
    office: 0,
    other_admin: 0,
  };
}

/**
 * Generate a random invoice ID in the format INV-XXXXXX.
 */
export function genInvoiceId() {
  const hex = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${hex}`;
}

/**
 * Create a blank invoice object.
 */
export function emptyInvoice() {
  return {
    id: genInvoiceId(),
    date: _isoDate(new Date()),
    channel: "",
    items: [],
    subtotal: 0,
    units: 0,
    gst: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
    source: "manual",
  };
}

/**
 * Create a blank invoice line-item.
 */
export function emptyItem() {
  return {
    sku: "",
    qty: 0,
    price: 0,        // price excl. GST
    custName: "",
    city: "",
    region: "",
  };
}

// ══════════════════════════════════════════════════════════════
//  6. LOCALSTORAGE PERSISTENCE (window.storage abstraction)
// ══════════════════════════════════════════════════════════════

if (!window.storage) {
  window.storage = {
    get: (key) => new Promise((resolve) => setTimeout(() => resolve(localStorage.getItem(key)), 400)),
    set: (key, value) => new Promise((resolve) => {
      localStorage.setItem(key, value);
      setTimeout(resolve, 100);
    })
  };
}

/**
 * Load the MIS monthly data for a given FY from localStorage.
 * Returns an array of 12 month objects (Apr → Mar).
 */
export async function loadMIS(fy) {
  const key = `oatey-mis:${fy}`;
  try {
    const raw = await window.storage.get(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 12) {
        // Merge with empty month to ensure all keys exist
        return parsed.map((m) => ({ ...emptyMonth(), ...m }));
      }
    }
  } catch (e) {
    console.warn(`[MIS] Failed to load ${key}:`, e);
  }
  // Return 12 fresh empty months
  return Array.from({ length: 12 }, () => emptyMonth());
}

/**
 * Save the MIS monthly data for a given FY to localStorage.
 */
export async function saveMIS(fy, data) {
  const key = `oatey-mis:${fy}`;
  try {
    await window.storage.set(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[MIS] Failed to save ${key}:`, e);
  }
}

/**
 * Load invoices (sales data) for a given FY from localStorage.
 * Returns an array of invoice objects.
 */
export async function loadSales(fy) {
  const key = `oatey-sales:${fy}`;
  try {
    const raw = await window.storage.get(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`[Sales] Failed to load ${key}:`, e);
  }
  return [];
}

/**
 * Save invoices for a given FY to localStorage.
 */
export async function saveSales(fy, invoices) {
  const key = `oatey-sales:${fy}`;
  try {
    await window.storage.set(key, JSON.stringify(invoices));
  } catch (e) {
    console.error(`[Sales] Failed to save ${key}:`, e);
  }
}

/**
 * Load the city-region mapping overrides from localStorage.
 * Returns an object { city: region }.
 */
export async function loadMaps() {
  const key = "oatey-maps";
  try {
    const raw = await window.storage.get(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`[Maps] Failed to load:`, e);
  }
  return {};
}

/**
 * Save the city-region mapping overrides to localStorage.
 */
export async function saveMaps(maps) {
  const key = "oatey-maps";
  try {
    await window.storage.set(key, JSON.stringify(maps));
  } catch (e) {
    console.error(`[Maps] Failed to save:`, e);
  }
}

// ══════════════════════════════════════════════════════════════
//  7. DERIVED COMPUTATIONS
// ══════════════════════════════════════════════════════════════

/**
 * Compute total revenue for a single month across all channels.
 */
export function totalRev(month) {
  return CHANNELS.reduce((sum, ch) => sum + safeNum(month[`rev_${ch.id}`]), 0);
}

/**
 * Compute total COGS for a single month.
 * COGS = (units_sold × cost_per_unit) + packaging + marketplace_fees + courier
 */
export function totalCOGS(month) {
  return (
    safeNum(month.units_sold) * safeNum(month.cost_per_unit) +
    safeNum(month.packaging) +
    safeNum(month.marketplace_fees) +
    safeNum(month.courier)
  );
}

/**
 * Compute total OPEX for a single month.
 */
export function totalOPEX(month) {
  return OPEX_KEYS.reduce((sum, { key }) => sum + safeNum(month[key]), 0);
}

/**
 * Compute gross profit for a single month.
 * Gross Profit = Revenue - COGS
 */
export function grossProfit(month) {
  return totalRev(month) - totalCOGS(month);
}

/**
 * Compute net profit for a single month.
 * Net Profit = Revenue - COGS - Marketing - OPEX
 */
export function netProfit(month) {
  return totalRev(month) - totalCOGS(month) - safeNum(month.marketing) - totalOPEX(month);
}

/**
 * Compute gross margin % for a single month.
 */
export function grossMargin(month) {
  const rev = totalRev(month);
  return rev === 0 ? 0 : (grossProfit(month) / rev) * 100;
}

/**
 * Compute net margin % for a single month.
 */
export function netMargin(month) {
  const rev = totalRev(month);
  return rev === 0 ? 0 : (netProfit(month) / rev) * 100;
}
