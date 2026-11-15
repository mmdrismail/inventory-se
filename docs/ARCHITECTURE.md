# StockLine Inventory SE - System Architecture

## 1. High-Level Overview

StockLine Inventory SE is an enterprise-grade Warehouse Management and Inventory System (WMS) built using the MERN stack (MongoDB, Express.js, React, Node.js) with Tailwind CSS, Lucide icons, and Recharts.

```
+-----------------------------------------------------------------------+
|                           CLIENT TIER                                 |
|  React 19 + Vite 8 + React Router v7 + Tailwind CSS + Lucide Icons   |
+-----------------------------------------------------------------------+
                                  |
                                  | HTTPS / REST APIs
                                  v
+-----------------------------------------------------------------------+
|                         APPLICATION TIER                              |
|           Express.js 4 REST API Server (Port: 5000)                   |
|  - Middleware: CORS, JSON Body Parser, JWT Auth, Error Handler        |
|  - In-Memory TTL Cache (60s) for high-frequency queries              |
|  - Rate Limiting & Audit Logging                                      |
+-----------------------------------------------------------------------+
                                  |
                                  | Mongoose ODM / Driver
                                  v
+-----------------------------------------------------------------------+
|                            DATA TIER                                  |
|               MongoDB Atlas / Community Server                        |
|  - Collections: Users, Products, Lots, Orders, Customers, Logs        |
|  - Compound Indexes: { lotNumber: 1, sku: 1 }                         |
+-----------------------------------------------------------------------+
```

---

## 2. Directory Structure & Responsibilities

```
inventory-se/
├── src/                    # Frontend Application
│   ├── assets/             # Static icons, logos, audio sounds
│   ├── components/         # Reusable UI components & modals
│   ├── context/            # React Context (Auth, Cart, Settings)
│   ├── data/               # Static fallbacks and initial dataset
│   ├── layouts/            # Dashboard layout, Sidebar, Header
│   ├── pages/              # Route views (Dashboard, Inventory, etc.)
│   ├── routes/             # Client-side router configuration
│   ├── services/           # Axios/Fetch API service layer
│   └── utils/              # Math, formatters, cipher, export helpers
├── server/                 # Backend API Application
│   ├── config/             # DB connection, environment variables
│   ├── controllers/        # Request handlers & business logic
│   ├── middleware/         # Auth, validation, RBAC, caching
│   ├── models/             # Mongoose schemas & data validation
│   ├── routes/             # Express API routes
│   ├── seeder.js           # Database seeder utility
│   ├── server.js           # Server bootstrap entry point
│   └── test_suite.js       # 40-assertion comprehensive test suite
├── scripts/                # Automation & DevOps CLI tools
│   └── trello_sync.cjs     # Automated Trello board sprint synchronizer
└── docs/                   # Engineering & collaboration guides
```

---

## 3. Core Modules & Workflows

### 3.1 Inventory & Barcode Tracking
- **SKU Management**: Unique stock keeping units with categorical classification.
- **Barcode Scanner Support**: Instant lookup for EAN-13, UPC, Code 128 barcodes.
- **Stock Thresholds**: Automated badges for low stock, out of stock, and reorder alerts.

### 3.2 Enterprise Lot & Scrap Auction Engine
- **Lot Management**: Batch number, manufacturing date, expiration date, and warehouse bay.
- **Scrap Bidding Engine**: Automated lot devaluation as expiration approaches, enabling auction bidding for salvageable scrap materials.

### 3.3 Trade Cipher & Pricing Engine
- **Multi-Template Printing**: Standard invoices, thermal receipts (58mm/80mm), packing slips, barcode labels.
- **Price Cipher Generator**: Obfuscates cost prices into proprietary alphabetical codes (e.g., `BLACKSMITH` cipher) for discreet on-tag retail markup tracking.

---

## 4. Performance & Reliability

1. **In-Memory Caching**: Frequently accessed inventory lists are cached in memory with a 60-second TTL to reduce database load.
2. **Gzip/Deflate Compression**: HTTP responses are compressed for rapid client rendering.
3. **Database Indexing**: Compound indexes on high-throughput lookup fields (`sku`, `lotNumber`, `barcode`).
4. **Resilient Fallback**: Frontend gracefully handles offline/mock mode if backend API connection drops.
