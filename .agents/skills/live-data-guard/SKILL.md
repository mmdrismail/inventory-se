---
name: live-data-guard
description: >-
  MANDATORY safety guard for any task touching MongoDB, Mongoose models, seeders, API write routes, server scripts, automated tests, or browser verification. Strictly blocks AI agents from editing, updating, seeding, resetting, or deleting ANY real records in the live StockLine database (`stockline_db`).
---

# Live Database Protection Guard (`live-data-guard`)

**CRITICAL:** The database (`stockline_db` / configured `MONGO_URI`) contains **irreplaceable real-world business records** (`products`, `customers`, `sales`, `quotations`, `moneyReceipts`, `priceCatalog`, `purchases`, `stockMovements`, `suppliers`, `users`, `settings`, `orders`, `lotPurchases`). Loss, overwrite, or corruption of any live record is unacceptable.

## Absolute Prohibitions for AI Agents

1. **NEVER Edit, Update, or Delete Real Database Records**
   - Do **NOT** run `POST`, `PUT`, `PATCH`, or `DELETE` requests against the running live backend (`http://localhost:5000/api/...` or production API) on real customer/product/sales/quotation/receipt/catalog data.
   - Do **NOT** execute `mongosh` or Node/Mongoose scripts that call `.updateOne`, `.updateMany`, `.findByIdAndUpdate`, `.findOneAndUpdate`, `.deleteOne`, `.deleteMany`, `.remove`, `.drop`, or `.save()` on live collections.
   - During browser verification, keep actions **strictly read-only** (navigate, inspect DOM/layout, measure styles). Never submit forms, save edits, or trigger delete buttons against live data.

2. **NEVER Run Seeders or Reset Scripts Against Live DB**
   - Strictly forbidden: `npm run server:seed`, `npm run server:destroy`, `node server/seeder.js`, `POST /api/settings/reset-database`, or calling `resetAllDemoData()` in live mode.
   - Both [server/seeder.js](../../../server/seeder.js) and `/api/settings/reset-database` are locked behind `ALLOW_DESTRUCTIVE_DB_RESET=YES_WIPE_ALL_DATA` — never set that variable on a real environment.

3. **Keep Automated Tests Isolated**
   - Do **NOT** run `npm test` (`server/test_suite.js`) against the production `MONGO_URI` (`stockline_db`), because it creates and deletes test documents and calls cleanup `.deleteMany()` against active collections.
   - For frontend, UI, formatting, search, translation, and component verification, use **in-memory/mocked Vite SSR tests** (`node verify_*.mjs` using mocked `AppDataContext`) or read-only `GET /api/health` checks.

## Allowed Read-Only Verification Checklist
- `GET /api/health` (`Invoke-WebRequest` / read-only health check)
- `npx oxlint`, `npm run build`
- Node/Vite SSR test scripts with mocked contexts (zero MongoDB connection)
- If live DB schema inspection is explicitly requested by the owner, use read-only queries (`find().limit(n).lean()`) only — never write back without explicit per-record user confirmation.
