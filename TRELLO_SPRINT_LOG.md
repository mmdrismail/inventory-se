# StockLine Enterprise — Official Trello Sprint & Agile Project Log

> **Agile Project Board Link:** [Trello Board](https://trello.com/invite/b/6b00817bce79a0b46d55e759/ATTIa73f0bb57c588459d54841e12cddf0e7EB59AA29/my-trello-board)  
> **Source Repository:** [https://github.com/mmdrismail/inventory-se](https://github.com/mmdrismail/inventory-se)  
> **Live Production URL:** [https://mmdrismail.github.io/inventory-se/](https://mmdrismail.github.io/inventory-se/)  
> **Lead Engineer & Project Owner:** [Mohammad Ismail](https://github.com/mmdrismail) (`mmdrismail`)

---

## 📌 Board Architecture & Workflow Columns

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│     📋 1. BACKLOG       │ ➔  │   ⏳ 2. IN PROGRESS     │ ➔  │  ✅ 3. DONE (DEPLOYED)  │
│   (Planned Roadmaps)    │    │ (Current Active Sprint) │    │  (Live & Fully Tested)  │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

---

## ✅ Column 3: DONE & DEPLOYED (Completed Task Cards)

Below is the complete record of all 10 major enterprise features developed, verified with automated test suites, and deployed to production.

---

### Card 1: `[CORE-01]` Full MERN Stack & MongoDB Atlas Cloud Integration
- **Status:** `DONE (LIVE)`
- **Category:** Architecture & Cloud Backend
- **GitHub Commit:** `548ca33`, `fbddc61`, `869f944`
- **Description:**
  - Configured production Node.js & Express REST API communicating with MongoDB Atlas cloud cluster (`stockline_db`).
  - Implemented dual-layer persistence: Live cloud API calls with automatic client-side offline storage sync.
  - Added Gzip response compression, in-memory caching middleware, and JWT authentication.
  - Automated seed script with 200+ engineering spare parts, suppliers, and customer profiles.

---

### Card 2: `[WMS-01]` Ship Scrap & Bulk Auction Lot Dismantling Intake System
- **Status:** `DONE (LIVE)`
- **Category:** Heavy Engineering & Logistics
- **GitHub Commit:** `45a5dfe`, `server/models/LotPurchase.js`, `server/controllers/lotController.js`
- **Description:**
  - Built custom intake workflow for lump-sum auction acquisitions (e.g., MV Ocean Star, Bhatiari Yard 4).
  - Designed cost apportionment algorithm calculating landed cost per component (base cost + transport + labor).
  - Handles multi-category equipment: semi-hermetic compressors, auxiliary engines, piston rods, suction valves.
  - Checkbox option to auto-register extracted parts into catalog and trigger thermal barcode stickers.

---

### Card 3: `[SEC-01]` Trade-Secret Cost-Code Cipher & Role-Based Price Masking
- **Status:** `DONE (LIVE)`
- **Category:** Business Logic & Security
- **GitHub Commit:** `45a5dfe`, `src/utils/priceCipher.js`
- **Description:**
  - Engineered 10-letter substitution cipher engine (`S-H-A-N-T-A-R-E-P` / custom key) to conceal wholesale landed costs.
  - Implemented 4-tier price display on shelf stickers:
    - `B-CODE`: Raw wholesale purchase cost (visible only to managers/owners).
    - `S-CODE`: Minimum authorized selling threshold for floor sales staff.
    - `M-CODE`: Manager's authorized negotiation limit.
    - `C-PRICE`: Standard customer sticker retail price in Bangladeshi Taka (৳).
  - Instant on-the-fly cipher decoding panel for authorized managers.

---

### Card 4: `[WMS-02]` International 5-Tier Warehouse Coordinates (Z-A-R-S-B)
- **Status:** `DONE (LIVE)`
- **Category:** Warehouse Logistics (WMS)
- **GitHub Commit:** `45a5dfe`, `src/pages/purchases/PurchaseListPage.jsx`
- **Description:**
  - Standardized physical warehouse location indexing: `Zone-Aisle-Rack-Shelf-Bin` (e.g., `A-02-04-3-B`).
  - Integrated location fields across product forms, lot intake modals, inventory tables, and thermal stickers.
  - Enables warehouse staff and forklift operators to locate any spare part in under two minutes.

---

### Card 5: `[PRINT-01]` High-Speed Barcode & Thermal Adhesive Sticker Generator
- **Status:** `DONE (LIVE)`
- **Category:** Hardware Integration & Printing
- **GitHub Commit:** `45a5dfe`, `src/components/products/BarcodeLabelModal.jsx`
- **Description:**
  - Zero-dependency thermal sticker printing engine supporting:
    - 60 × 40 mm & 50 × 30 mm Thermal Labels (Xprinter, Zebra, TSC).
    - 100 × 150 mm Shipping / Heavy Machinery Crate Labels.
    - A4 Sheet 24-Up Adhesive Sticker Grids.
  - Dynamic Code-128 barcode generation and QR code data matrices with business branding.

---

### Card 6: `[DOC-01]` Multi-Template Commercial Voucher & Invoicing Engine
- **Status:** `DONE (LIVE)`
- **Category:** Point of Sale & Legal Documentation
- **GitHub Commit:** `45a5dfe`, `src/utils/printTemplateGenerator.js`
- **Description:**
  - 3-Part Traditional Commercial Invoicing (৩-কপি মেমো ও চালান):
    - **১ম কপি (গোলাপী/সাদা):** গ্রাহক ক্যাশ মেমো (Original Customer Cash Memo).
    - **২য় কপি (হলুদ):** ডেলিভারী গেট পাস ও পরিবহন চালান (Delivery Gate Pass & Challan).
    - **৩য় কপি (নীল):** হিসাব বিভাগ ও অফিস ফাইল কপি (Accounts & Audit Office Copy).
  - Commercial Quotations & Pro-forma Invoices (দরপত্র ও কোটেশন).
  - 80mm Roll Thermal POS Cash Register Receipt.

---

### Card 7: `[LANG-01]` Reactive Trilingual Localization Engine (বাংলা / English / Avro)
- **Status:** `DONE (LIVE)`
- **Category:** Localization & Internationalization
- **GitHub Commit:** `6d326bf`, `src/context/LanguageContext.jsx`, `src/utils/translations.js`
- **Description:**
  - Multi-language dictionary supporting Bengali (`bn`), English (`en`), and Banglish/Avro (`obro`).
  - Full reactive propagation across Dashboard, Inventory, Categories, Customers, Suppliers, Reports, TopNav, and Sidebar.
  - Authentic trade terminology (e.g., "জাহাজ অকশন লট", "বকেয়া খতিয়ান", "চলান").

---

### Card 8: `[UX-01]` Hardware Audio Feedback & Power-User Ergonomics
- **Status:** `DONE (LIVE)`
- **Category:** User Experience & Ergonomics
- **GitHub Commit:** `45a5dfe`, `src/utils/soundEffects.js`
- **Description:**
  - Native Web Audio API synthesizer producing 1850Hz dual-harmonic barcode scanner beeps, POS cash register chimes, and warning buzzers without external audio files.
  - Live USB barcode scanner input bars in both Procurement and Sales/POS with automatic item addition on Enter.
  - Click-to-copy badges for SKUs and warehouse rack coordinates.
  - Global keyboard shortcuts (`Ctrl+K` omni-search, `?` shortcut cheat sheet modal, `Ctrl+Shift+D` theme toggle).

---

### Card 9: `[QA-01]` Automated Regression Test Suite (40/40 Passing)
- **Status:** `DONE (LIVE)`
- **Category:** Quality Assurance & Testing
- **GitHub Commit:** `server/test_suite.js`
- **Description:**
  - Automated integration test suite executing 40 continuous tests against the live API.
  - Validates Auth, Taxonomy, Products, Purchases, Sales, Quotations, Orders, Inventory Adjustments, Reports, Settings, and Users.
  - Automatic cleanup procedures that delete temporary test artifacts upon completion.

---

### Card 10: `[DEPLOY-01]` GitHub Production Deployment & GitHub Pages Live Hosting
- **Status:** `DONE (LIVE)`
- **Category:** DevOps & Cloud Hosting
- **GitHub Commit:** `fd296b6`, `548ca33`
- **Description:**
  - Source code pushed and synchronized with `https://github.com/mmdrismail/inventory-se`.
  - Compiled production bundle hosted live via GitHub Pages on `gh-pages` branch.
  - Custom `404.html` SPA routing fallback enabling smooth client-side page refreshes.
  - Live URL: `https://mmdrismail.github.io/inventory-se/` (HTTP 200 OK).

---

## ⏳ Column 2: IN PROGRESS (Current Sprint)

- [ ] Connect Trello GitHub Power-Up to repository `mmdrismail/inventory-se`.
- [ ] Add commit tags to individual cards for automated status sync.
- [ ] Implement multi-branch warehouse transfer requisition between Chittagong yard and Dhaka depot.

---

## 📋 Column 1: BACKLOG (Future Enhancements)

- [ ] Handheld Android Barcode & RFID Terminal Mobile App.
- [ ] SMS Gateway Integration for automated Delivery Challan alerts to transport drivers.
- [ ] AI-Powered predictive parts demand forecasting based on ship dismantling seasons.
