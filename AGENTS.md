# StockLine AI Engineering & Token Guide

## CRITICAL: Live Database Protection (Zero Mutation Policy)
- **Real Business Data Lock**: Live `stockline_db` contains irreplaceable production records (`products`, `customers`, `sales`, `quotations`, `moneyReceipts`, `priceCatalog`, `purchases`, `stockMovements`, `suppliers`, `users`, `settings`, `orders`, `lotPurchases`).
- **Strictly Forbidden**: AI agents MUST **NEVER** edit, update, delete, overwrite, seed, or drop ANY real record in MongoDB or via `:5000` API write methods (`POST`/`PUT`/`PATCH`/`DELETE`), MUST **NEVER** run `server:seed`, `server:destroy`, `node server/seeder.js`, `POST /api/settings/reset-database`, or `npm test` against live `MONGO_URI`, and MUST **NEVER** submit/mutate records during browser testing.
- **Safe Verification Only**: Use read-only `GET /api/health`, `npx oxlint`, `npm run build`, and in-memory mocked Vite SSR tests. Both `server/seeder.js` and `resetDatabase` enforce `ALLOW_DESTRUCTIVE_DB_RESET=YES_WIPE_ALL_DATA` — never bypass this guard.

## Stack & Guardrails
- **Frontend**: React `19.3.1` + React Router `7` + Vite `8` (`npm run dev` on `:5173`, `npm run build` -> `dist/`) + Tailwind CSS `3.4` + Lucide + Recharts + Tesseract OCR.
- **Backend**: Node.js + Express + MongoDB / Mongoose (`server/server.js` on `:5000`, `/api/health`).
- **Financial & Input UX**: Conditional decimals only (no `.00` on integers via `formatCurrency`/`formatNumber`), empty string state `''` + masking `placeholder="0"` on optional/zero numeric inputs, global `Enter` traversal (`src/utils/keyboardNavigation.js`), phonetic entity transliteration (`data-transliterate`), and non-clipping responsive cards (`min-w-0 tabular-nums`).
- **Git & Deploy**: Commit as `"Saiful Ahnm Sajed <154451663+saifulahnmsajed@users.noreply.github.com>"` and sync both `origin` and `saiful` (`main` + `gh-pages` `dist/` with `404.html`).

## Token & Context Management
- Locate symbols/call sites with targeted grep first; read bounded `StartLine`/`EndLine` slices (`<150` lines) instead of full files.
- Keep `AGENTS.md` lean and install only stack-matched skills under `.agents/skills/` (progressive disclosure).
- Follow `.agents/skills/recursive-context-pruning`, `.agents/skills/strategic-compact`, and `.agents/skills/token-budget-advisor` (compact at phase boundaries after writing verified state, never mid-edit).

## Installed Skill Routing (`.agents/skills/`)
- **Live Data Guard (ALWAYS ON for DB/API/Test work)**: `live-data-guard`.
- **UI/UX Design & Review**: `ui-ux-pro-max` (`python .agents/skills/ui-ux-pro-max/scripts/search.py ...`), `frontend-design`, `web-design-guidelines`.
- **React & Vite Performance**: `react-best-practices`, `react-ui-patterns`, `vite-patterns`.
- **Backend API & DB**: `backend-patterns`.
- **Token Management**: `strategic-compact`, `token-budget-advisor`, `recursive-context-pruning`.
- **Quality Gate**: `verification-before-completion` (`npx oxlint`, test suites, `npm run build` before claiming done).
