# 📈 Plant Essentials MIS Portal

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<br/>

A high-performance, offline-first Management Information System (MIS) and executive dashboard built for **Plant Essentials**. Designed to provide real-time business intelligence, track KPIs, project sales growth, and analyze Profit & Loss (P&L) statements for enterprise-level decision making.

## ✨ Features

- **📊 Comprehensive Executive Dashboard**: Real-time tracking of Revenue, EBITDA, Units Sold, Gross Margin, and advanced sales projections.
- **📈 Advanced Analytics**: Dynamic moving averages (7-day vs 30-day), repeat customer tracking, and geographical performance distribution.
- **💼 Automated P&L Generation**: Instant Profit & Loss statement calculation based on dynamic MIS inputs and aggregated sales data.
- **🔮 Sales Projections**: Sophisticated N+1, N+2, and N+3 month sales targeting based on historical momentum and SKU velocity.
- **🔒 Offline-First Architecture**: 100% client-side data processing. All data is securely stored locally in your browser's `localStorage` — no backend required, ensuring complete privacy.
- **📤 Data Portability**: Seamlessly import/export raw sales data (CSV/Excel) and full application state backups via JSON.
- **💎 Light Luxury Enterprise Theme**: Clean, highly readable, and professional UI built with TailwindCSS.

## 📸 Screenshots

*(Since this is an offline-first app running locally, you can drag and drop your own screenshots into this README or a `docs/` folder!)*

### Dashboard Overview
> Shows top-line KPIs, sales targets, channel revenue, and SKU performance.
*(Add your screenshot here)*

### Profit & Loss Statement
> Automated P&L layout generated instantly from uploaded sales data and manual cost inputs.
*(Add your screenshot here)*

### Data Upload Wizard
> Smart CSV mapping that automatically matches your raw sales dumps into standard data structures.
*(Add your screenshot here)*

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/daksh-487/mis-portal-dashboard.git
   cd mis-portal-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Data Parsing**: SheetJS (XLSX)
- **State Management**: React Hooks + Custom LocalStorage Abstraction
- **Fonts**: IBM Plex Sans, JetBrains Mono

## 📂 Project Structure

```text
src/
├── components/
│   ├── DashboardTop.jsx      # Top KPIs, targets, top customers
│   ├── DashboardMid.jsx      # SKU performance & velocity
│   ├── DashboardBottom.jsx   # Moving averages, geography, inline P&L
│   ├── UploadTab.jsx         # CSV data upload & column mapping wizard
│   ├── MisTab.jsx            # Manual OPEX & variable cost inputs
│   └── PnLTab.jsx            # Full Profit & Loss statement renderer
├── engine.js                 # Complex math: aggregations, projections, MAs
├── data.js                   # Constants, models, and localStorage DB wrappers
├── App.jsx                   # Main layout, routing, and global state
└── index.css                 # Global styles and enterprise design tokens
```

## 📄 License

This project is licensed under the MIT License.
