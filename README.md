# StockLine Enterprise — Modern MERN Warehouse & Inventory Management System

> **Enterprise-Grade WMS & POS Solution for Industrial Equipment, Machinery & Refrigeration Parts**  
> Developed & Maintained by **[Mohammad Ismail](https://github.com/mmdrismail)** (`mmdrismail`)

[![MERN Stack](https://img.shields.io/badge/Stack-MongoDB%20%7C%20Express%20%7C%20React%20%7C%20Node-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%208-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS 3](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas%20Cloud-13AA52?style=flat&logo=mongodb&logoColor=white)](https://cloud.mongodb.com/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express%20REST%20API-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Automated Tests](https://img.shields.io/badge/Tests-40%2F40%20Passing-brightgreen?style=flat&logo=jest&logoColor=white)](server/test_suite.js)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 Table of Contents
1. [Executive Overview](#-executive-overview)
2. [Architectural Highlights](#-architectural-highlights)
3. [Specialized Engineering & Trade Capabilities](#-specialized-engineering--trade-capabilities)
4. [Technology Stack](#-technology-stack)
5. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
6. [System Modules & UI Walkthrough](#-system-modules--ui-walkthrough)
7. [Barcode, Sticker & Print Template Specifications](#-barcode-sticker--print-template-specifications)
8. [Automated Test Suite & Quality Verification](#-automated-test-suite--quality-verification)
9. [Installation & Local Deployment Guide](#-installation--local-deployment-guide)
10. [Environment Configurations](#-environment-configurations)
11. [Project Roadmap & Future Enhancements](#-project-roadmap--future-enhancements)
12. [Author & Ownership Information](#-author--ownership-information)

---

## 🚀 Executive Overview

**StockLine Enterprise** is a high-performance Warehouse Management System (WMS), Point of Sale (POS), and Procurement platform designed specifically for heavy equipment trading, ship breaking/scrap auction intakes, and cold storage engineering spare parts (e.g., ammonia/freon compressors, cylinder liners, valves, and gaskets).

Unlike standard generic e-commerce templates, StockLine solves real-world logistics challenges:
- **Bulk Scrap Lot Dismantling:** Ingest multi-ton ship scrap or auction lots, record bulk intake expenses (transport, cutting labor), and apportion landed costs across extracted components.
- **Trade-Secret Cost Ciphering:** Conceal actual wholesale buying prices from counter sales clerks and visiting buyers using role-based algorithmic substitution ciphers (`B-CODE`, `S-CODE`, `M-CODE`).
- **5-Tier Physical Location Coordinates:** Track every component using the standardized `Z-A-R-S-B` (Zone, Aisle, Rack, Shelf, Bin) format for instantaneous retrieval.
- **Multi-Document Voucher Printing:** Generate official Cash Memos, Delivery Challans (চলান), Office Letterhead vouchers, Commercial Quotations, and 80mm POS Thermal receipts in a single click.
- **Trilingual Operating Experience:** Seamless switching between authentic Bengali (বাংলা), International English, and Banglish (Avro) across all pages, charts, tables, and modals.

---

## 🏗️ Architectural Highlights

```
┌───────────────────────────────────────────────────────────────┐
│                    Vite + React 18 Frontend                   │
│   (Context API, Web Audio API, Lucide Icons, Recharts, POS)    │
└──────────────┬────────────────────────────────┬───────────────┘
               │                                │
      [Offline / Fallback]             [HTTP / REST API]
               │                                │
               ▼                                ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│  Browser LocalStorage Engine│   │  Express.js API Backend     │
│  (Indexed Services Layer)   │   │  (JWT Auth, Gzip, Cache)    │
└─────────────────────────────┘   └──────────────┬──────────────┘
                                                 │
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │    MongoDB Atlas Cloud      │
                                  │  (12 Collections, Mongoose) │
                                  └─────────────────────────────┘
```

1. **Dual-Layer Persistence & Instant Fallback:**
   The frontend communicates seamlessly with the MongoDB Atlas cloud backend via a structured `apiClient`. If network connectivity is lost, the system gracefully continues running using local state services and synchronizes changes upon reconnection.
2. **Immutable Double-Entry Stock Movement Ledger:**
   Inventory quantities are never adjusted arbitrarily. Every stock change generates an auditable, immutable ledger movement (`purchase_in`, `sale_out`, `adjustment`, `order_hold`, `reversal`) with before/after balances and timestamped references.
3. **Single-Deduction Order Lifecycle:**
   Online storefront orders deduct physical stock strictly upon staff approval (`pending` ➔ `confirmed`) and restore stock cleanly upon order rejection, preventing inventory discrepancies.
4. **Sub-Millisecond Synthesized Audio Feedback:**
   Integrated with the native browser `Web Audio API` to produce realistic dual-harmonic barcode scanner beeps (1850Hz / 70ms), POS checkout cash register chimes, and warning error buzzers without loading external audio assets.

---

## ⚙️ Specialized Engineering & Trade Capabilities

### 1. Ship Scrap & Auction Lot Intake (জাহাজ অকশন ও বাল্ক লট ডিসম্যাণ্টল)
- **Problem Solved:** When purchasing an entire ship section or industrial auction lot for a lump sum (e.g., ৳500,000), individual items do not come with individual purchase receipts.
- **Workflow:**
  1. Record auction lot code, vessel name (e.g., `MV Ocean Star - Bhatiari Yard`), primary vendor, base lot cost, transport, and dismantle labor expenses.
  2. Enumerate extracted machines and parts (reconditioned Bitzer compressors, piston rod sets, suction valves).
  3. Apportion landed costs and define target retail pricing per item.
  4. Designate specific warehouse rack coordinates (`Zone-A / Aisle-02 / Rack-04 / Shelf-3 / Bin-B`).
  5. Check a single box to automatically publish items to the catalog and generate adhesive barcode labels.

### 2. Secret Cost-Code Cipher Engine (গোপন ক্রয়মূল্য সাইফার)
- **Trade Reality:** Industrial parts retailers display inventory on open shelves. Staff and customers frequently inspect boxes, but actual profit margins and landed wholesale costs must remain confidential.
- **Cipher Mechanics:**
  - Standard 10-letter substitution key: `S H A N T A - R E P` (0 through 9).
  - A landed cost of `৳ 4,500` is encoded as `T-A-S-S`.
  - Floor stickers display four tiered price markers:
    - `B-CODE`: Raw buying/landed cost (visible only to managers and owners).
    - `S-CODE`: Minimum floor selling rate for counter staff.
    - `M-CODE`: Manager's authorized negotiation threshold.
    - `C-PRICE`: Standard customer sticker price in Bangladeshi Taka (৳).

### 3. International 5-Tier Warehouse Coordinates (Z-A-R-S-B)
- Formatted as `Zone-Aisle-Rack-Shelf-Bin` (e.g., `A-02-04-3-B`).
- Allows warehouse runners and forklift operators to locate any spare part in under two minutes without requiring phone calls to storekeepers.

---

## 💻 Technology Stack

| Layer | Technologies | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18, Vite 8 | Fast SPA rendering, component modularity, instant HMR |
| **UI & Styling** | Tailwind CSS 3.4, Lucide Icons | Responsive styling, dark mode, accessible components |
| **State & Context** | Context API, Custom Hooks | Synchronized store for products, purchases, cart, auth |
| **Data Visualization** | Recharts, SVG | Daily sales velocity, stock valuation, department share |
| **Audio Synthesis** | Web Audio API | Zero-latency hardware-style barcode scanner beeps |
| **Backend Runtime** | Node.js (v20+ / v24+), Express.js | High-performance RESTful API micro-services |
| **Database** | MongoDB Atlas, Mongoose ODM | Cloud document storage, schemas, indexing, relations |
| **Security & Auth** | JWT, bcryptjs, CORS | Bearer token authentication, role validation |
| **Automated Testing** | Node.js Test Runner | 40-step comprehensive integration and regression suite |

---

## 👥 Role-Based Access Control (RBAC)

The system features a pre-configured 1-click role switcher for live demonstration:

| Role | Default Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@stockline.io` | `admin123` | Complete system control, user management, database reset |
| **Warehouse Manager** | `manager@stockline.io` | `manager123` | Inventory, lot intakes, stock adjustments, vendor orders |
| **Sales Staff / Cashier** | `staff@stockline.io` | `staff123` | POS counter billing, receipt printing, customer directory |
| **Client / Storefront** | `customer@stockline.io` | `customer123` | Public e-commerce shop, cart, checkout, personal orders |

---

## 📦 System Modules & UI Walkthrough

### 1. Executive Dashboard (`/dashboard`)
- Real-time KPIs: Total Products, Stock Valuation (Cost & Retail), Low Stock Items, Today's Sales Volume, and Customer count.
- Dynamic Sales Velocity Area Charts & Procurement Expenditure Bar Charts filterable by 7, 14, or 30 days.
- Low stock watchlist with real-time badges indicating critical replenishment levels.

### 2. Product Catalog (`/products`)
- Search by SKU, product title, IMPA code, brand, or OEM specification.
- Rich product metadata: Warranty, unit specifications, cost price, selling price, and warehouse coordinates.
- CSV bulk import and export capabilities.

### 3. Ship Scrap & Lot Procurement (`/purchases`)
- Dual-tab navigation: Standard Purchase Orders (PO) and Auction Scrap Lots.
- Live USB Barcode Scanner intake bar with real-time audio confirmation.
- One-click supplier quick-addition modal without losing form progress.

### 4. Sales & POS Billing (`/sales`)
- High-speed checkout counter with USB barcode scanner detection.
- Multi-customer type classification: Corporate, Wholesale, and Retail.
- Credit/Due balance tracking with automated ledger computation.

### 5. Quotations & RFQs (`/quotations`)
- Issue commercial estimates and quotations with formal validity windows.
- One-click conversion from Quotation into an official Sales Invoice.

### 6. Physical Inventory & Audit Ledger (`/inventory`)
- Real-time stock availability table with safety reorder levels.
- Click-to-copy badges for SKUs and warehouse rack locations.
- Complete movement history ledger detailing every transaction origin.

---

## 🖨️ Barcode, Sticker & Print Template Specifications

StockLine includes a dedicated print engine with zero external dependencies:

```
┌────────────────────────────────────────────────────────┐
│  M/S. SHANTA REFRIGERATION                 BITZER OEM  │
│  Bitzer 4EC Semi-Hermetic Compressor (কম্প্রেসার)      │
│  [RECONDITIONED] • Mod: 4EC-4.2 • Lot #LOT-2026-55     │
│                                                        │
│         ||| | ||||| || |||| ||||| ||| ||||             │
│                 * 202655001 *                          │
│                                                        │
│  [📍 LOC: A-02-01-1-A]                 ৳ 110,000.00    │
│  CIPHER: [B: T-A-S-S | S: 95K | M: 100K]               │
└────────────────────────────────────────────────────────┘
```

Supported Output Formats:
1. **60 x 40 mm & 50 x 30 mm Thermal Barcode Labels:** Formatted for standard desktop thermal label printers (Xprinter, Zebra, TSC).
2. **A4 Sheet (24-Up Sticker Grid):** Compatible with standard A4 adhesive label sheets.
3. **80mm Roll Thermal POS Receipt:** Compact format for counter receipt printers.
4. **Three-Part Commercial Invoicing (৩-কপি মেমো ও চালান):**
   - **১ম কপি (গোলাপী/সাদা):** গ্রাহক ক্যাশ মেমো (Original Customer Cash Memo).
   - **২য় কপি (হলুদ):** ডেলিভারী গেট পাস ও পরিবহন চালান (Delivery Gate Pass & Challan).
   - **৩য় কপি (নীল):** হিসাব বিভাগ ও অফিস ফাইল কপি (Accounts & Audit Copy).

---

## 🧪 Automated Test Suite & Quality Verification

The repository includes an automated integration test suite (`server/test_suite.js`) executing 40 continuous tests against the live API:

```bash
node server/test_suite.js
```

### Verification Matrix:
- ✔ **Core Health:** Root endpoint (200 OK) and health check.
- ✔ **Authentication:** JWT issuance, credential validation, demo access, role authorization.
- ✔ **Taxonomy & Partners:** Categories, Suppliers, and Customers CRUD operations.
- ✔ **Catalog Management:** Product creation, updates, and SKU lookups.
- ✔ **Procurement Flow:** Purchase order creation, inventory stock-in, and balance verification.
- ✔ **Point of Sale:** Sales invoice generation, automatic stock deduction, and due balance calculation.
- ✔ **Quotations & RFQs:** Estimation creation and conversion to active sales orders.
- ✔ **Storefront Orders:** Customer checkout and fulfillment status updates.
- ✔ **Inventory Adjustments:** Manual stock counts and movement ledger tracking.
- ✔ **Analytics & Reporting:** Live dashboard metrics and low-stock queries.
- ✔ **System Settings:** Currency formatting, company profile, and tax rules.
- ✔ **Data Cleanup:** Tear-down procedures that remove temporary test artifacts automatically.

---

## 🛠️ Installation & Local Deployment Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18.x, 20.x, or 24.x LTS)
- [Git](https://git-scm.com/)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account or local MongoDB instance

### 1. Clone the Repository
```bash
git clone https://github.com/mmdrismail/inventory-se.git
cd inventory-se
```

### 2. Setup the Backend API Server
```bash
cd server
npm install
```

Configure your environment variables in `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_private_secret_key_2026
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

Start the backend daemon:
```bash
node server.js
```

### 3. Setup the Frontend Client
In a new terminal window:
```bash
npm install
npm run dev
```

The application will be live at `http://localhost:5173/`.

### 4. Build for Production
```bash
npm run build
```
Creates an optimized production bundle in the `dist/` directory.

---

## 🐳 Docker Deployment

The application is fully containerized. To build and start with Docker:

```bash
# Build the production image
docker build -t stockline-wms:latest .

# Run the container
docker run -p 5000:5000 -p 5173:5173 stockline-wms:latest
```

---

## 🗺️ Project Roadmap & Future Enhancements

- [x] Full MERN Stack integration with MongoDB Atlas cloud persistence.
- [x] Ship scrap and bulk auction lot dismantling workflow.
- [x] Multi-tier secret cost-cipher price masking (`B-CODE`, `S-CODE`, `M-CODE`).
- [x] 5-Tier physical warehouse coordinate tracking (`Z-A-R-S-B`).
- [x] Synthesized Web Audio API barcode scanner sound engine.
- [x] Trilingual localization (বাংলা, English, Banglish/Avro).
- [x] 40/40 Automated regression test suite.
- [ ] Integration with hardware handheld Android barcode / RFID terminals.
- [ ] Automated SMS notification gateway for delivery challans and due reminders.
- [ ] Multi-branch warehouse inter-transfer ledger.

---

## 👨‍💻 Author & Ownership Information

This project is created, engineered, and maintained by:

**Mohammad Ismail**  
- **GitHub Profile:** [@mmdrismail](https://github.com/mmdrismail)  
- **Repository:** [https://github.com/mmdrismail/inventory-se](https://github.com/mmdrismail/inventory-se)  
- **Project Board:** [Trello Workspace](https://trello.com/b/B7EZLSFY/my-trello-board/power-ups/enabled)  
- **Documentation & Blueprint:** [Google Drive Specifications](https://drive.google.com/drive/folders/1RSdDB6fA89jpvnct8NMtRMaNM40lvIwA)

### 📄 License
This project is licensed under the **MIT License**. You are free to use, modify, and distribute this software with attribution.
