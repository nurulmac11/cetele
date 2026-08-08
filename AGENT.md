# Çetele (Kulba) — Developer & AI Agent Guide (`AGENT.md`)

Welcome to **Çetele**! This guide provides a comprehensive technical overview of the codebase architecture, evaluation engine, component hierarchy, data persistence layer, online sync behavior, tab management, testing setup, and guidelines for AI agents and developers.

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: [Vue 3](https://vuejs.org/) (Composition API & `<script setup>`)
- **Build Tool / Bundler**: [Vite 6](https://vitejs.dev/)
- **Mathematics Engine**: [Math.js v14](https://mathjs.org/)
- **Icon Set**: [Lucide Vue](https://lucide.dev/guide/packages/lucide-vue) (`@lucide/vue`)
- **Backend / Auth**: [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction) (`@supabase/supabase-js`)
- **Testing**: [Vitest 3](https://vitest.dev/)
- **Analytics**: [Vercel Analytics](https://vercel.com/docs/analytics) (`@vercel/analytics`)
- **Styling**: Vanilla CSS with dark/light CSS variables (`src/assets/index.css`)

---

## 📁 Repository Structure

```
kulba/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI workflow (PR & push test/build runner)
├── index.html                   # HTML template entry point
├── package.json                 # Project dependencies & scripts
├── vite.config.js               # Vite bundler & Vitest test config
├── vercel.json                  # Vercel deployment & rewrite rules
├── SYNTAX_GUIDE.md              # User-facing syntax reference
├── AGENT.md                     # AI Agent & Developer guide
├── supabase/
│   └── schema.sql               # PostgreSQL schema & RLS policies for user_tabs
├── tests/
│   ├── evaluator.test.js        # Vitest suite entrypoint re-exporting all sub-suites
│   ├── services.test.js         # Tests for share payload encoding & copy all text helper
│   └── evaluator/               # Modular test suites by domain
│       ├── math.test.js         # Basic math, line references, percentage arithmetic, parens, NaN
│       ├── currency.test.js     # Fiat, gold/precious metals, crypto & 2,401 conversion pair matrix
│       ├── date_units.test.js   # Date arithmetic (today + 2 weeks) and physical unit conversions
│       ├── multipliers.test.js  # Shorthand magnitude multipliers (k, m, b, t / K, M, B, T)
│       └── sections_comments.test.js # Section headers, subtotals, multi-line & block comments
└── src/
    ├── main.js                  # App bootstrap & Vercel analytics initialization
    ├── App.vue                  # Main application component, layout & shortcut manager
    ├── assets/
    │   └── index.css            # Global CSS custom properties, design system & themes
    ├── components/
    │   ├── Notepad.vue          # Notepad text editor, result column & Expand Area toggle
    │   ├── Header.vue           # Top navigation bar, tab strip, theme toggle & Expand Workspace button
    │   ├── ReferenceSidebar.vue # Collapsible quick syntax sheet & action card (Expandable)
    │   ├── SyntaxGuidePage.vue  # Interactive syntax documentation page
    │   ├── SavedTabsPage.vue    # Offline/Cloud library view for saved documents
    │   ├── SettingsModal.vue    # User profile, theme, and storage settings modal
    │   └── AuthModal.vue        # Supabase Google OAuth & guest login modal
    └── services/
        ├── evaluator.js         # Re-export bridge pointing to ./evaluator/index.js
        ├── evaluator/           # Modular evaluator engine sub-package
        │   ├── index.js         # Entrypoint & main evaluateAll pipeline
        │   ├── lexer.js         # Lexer class tokenizing math, keywords, line refs & comments
        │   ├── parser.js        # Recursive-Descent Parser building AST
        │   ├── astEvaluator.js  # AST Evaluation engine
        │   ├── rates.js         # Exchange rates (RATES), version & live API fetcher
        │   ├── constants.js     # EXAMPLE_TEXT & RESERVED_KEYWORDS
        │   └── formatters.js    # Number & Currency formatting utilities (formatValue, fmtDate)
        ├── localDb.js           # Offline IndexedDB storage with localStorage fallback
        ├── shareService.js      # URL hash compression & payload encoder/decoder
        ├── supabaseClient.js    # Supabase client initializer
        └── syncService.js       # Real-time cloud sync engine (throttled upserts)
```

---

## 🗺️ Feature-to-File Matrix

Use this index to quickly locate the exact files, key functions, and test suites responsible for each feature domain:

| Feature Domain | Primary Source Files | Key Functions & Implementation Details | Associated Test Suite |
| :--- | :--- | :--- | :--- |
| **Section Headers & Subtotals** | `src/services/evaluator/lexer.js`<br>`src/services/evaluator/index.js`<br>`src/components/Notepad.vue` | `SECTION_HEADER` tokenizing, `SectionHeader` AST handling, title extraction, clean rendering in result column (no `===`), `.section-title-text` underline CSS, section subtotals & collapsible section folding (`toggleSectionCollapse`). | `tests/evaluator/sections_comments.test.js` |
| **Math & AST Evaluation** | `src/services/evaluator/lexer.js`<br>`src/services/evaluator/parser.js`<br>`src/services/evaluator/astEvaluator.js` | Lexer tokenization, Recursive Descent Parser, `evaluateAST`, Line references (`#1`, `L1`), running `prev`, percentage operations (`increase A by B%`). | `tests/evaluator/math.test.js` |
| **Currency, Gold & Crypto Rates** | `src/services/evaluator/rates.js`<br>`src/services/evaluator/astEvaluator.js`<br>`src/services/evaluator/formatters.js` | `RATES` matrix (2,401 pairs), `fetchLiveExchangeRates` API fetcher, gold/crypto decimal preservation rule in `formatValueWithSymbol`. | `tests/evaluator/currency.test.js` |
| **Magnitude Multipliers** | `src/services/evaluator/lexer.js` | Shorthand magnitude multiplier suffixes (`k`, `m`, `b`, `t` / `K`, `M`, `B`, `T`). | `tests/evaluator/multipliers.test.js` |
| **Date & Physical Unit Math** | `src/services/evaluator/lexer.js`<br>`src/services/evaluator/astEvaluator.js` | Date arithmetic (`today + 2 weeks - 1 day`), physical unit conversions (`12 km to miles`). | `tests/evaluator/date_units.test.js` |
| **Notepad Editor & Autocomplete** | `src/components/Notepad.vue` | Textarea sync scrolling, line gutter, evaluation result column, variable autocomplete menu, fold toggles. | — |
| **Tab Management & Reordering** | `src/App.vue`<br>`src/components/Header.vue` | Reactive `tabs` array, `closedTabsStack`, drag-and-drop tab reordering, mobile tab rename inline form (`mobile-dropdown-rename-form`), mobile active tab rename button, global keyboard shortcuts (`Ctrl+N`, `Ctrl+Z`, `Ctrl+Shift+C`). | — |
| **Offline Storage (IndexedDB)** | `src/services/localDb.js` | `CeteleLocalDB` (IndexedDB stores for `tabs`, `saved_tabs`, `settings`) with `localStorage` fallback. | `tests/services.test.js` |
| **Cloud Synchronization** | `src/services/syncService.js`<br>`supabase/schema.sql` | Supabase auth integration, `throttledSyncTabsToCloud`, Row-Level Security (RLS) policies. | — |
| **Document Sharing** | `src/services/shareService.js` | URL hash compression & Base64 payload encoding/decoding (`#doc=...`). | `tests/services.test.js` |

---

## 🧠 Evaluator Engine Architecture (`src/services/evaluator/`)

The evaluator engine parses plain multi-line text input into formatted, calculated line results.

### Execution Pipeline

1. **Lexer (Tokenizer - `class Lexer`)**:
   - Scans line input and emits structured tokens: `NUMBER`, `CURRENCY_SYMBOL`, `CURRENCY_CODE`, `IDENT`, `LINE_REF`, `KEYWORD` (`to`, `in`, `of`, `off`, `increase`, `decrease`, `by`), `OPERATOR` (`+`, `-`, `*`, `/`, `^`, `%`, `=`, `(`, `)`), `COMMENT`, and `EOF`.
   - **Magnitude Multipliers**: Numbers support shorthand magnitude suffixes: `k`/`K` ($10^3$), `m`/`M` ($10^6$), `b`/`B` ($10^9$), `t`/`T` ($10^{12}$). Lexer parses both direct (`500k`, `2m`, `1.5b`, `3.2t`) and spaced (`500 k`, `2 m`) suffixes seamlessly with currency and unit integration (`$500k`, `500k usd to tl`).

2. **Recursive-Descent Parser (`class Parser`)**:
   - Top-down recursive descent parser implementing precedence rules:
     - `parseLine()` $\rightarrow$ `Assignment` | `Expression` | `Comment`
     - `parseExpression()` $\rightarrow$ `PercentChange` (`increase A by B%`) | `parseAdditive()`
     - `parseAdditive()` $\rightarrow$ Binary `+`/`-`, `Conversion` (`expr to target`), `PercentageOf` (`A% of B` / `A% off B`)
     - `parseMultiplicative()` $\rightarrow$ Binary `*`/`/`/`%`
     - `parsePower()` $\rightarrow$ Binary `^`
     - `parseUnary()` $\rightarrow$ Unary `-`/`+`
     - `parsePrimary()` $\rightarrow$ `CurrencyNumber`, `Number`, `PercentNumber`, `LineRef` (`#1`, `L1`, `line1`), `Paren`, `FunctionCall`, `Identifier` (`prev`, `total`, variable name)

3. **AST Evaluator (`evaluateAST`)**:
   - Evaluates AST nodes recursively line-by-line while maintaining:
     - `scope` (variable values and dates)
     - `varCurrencies` & `lineCurrencies` (preserves currency symbols across expressions, variables, line references, and `prev`)
     - Mixed currency conversion via `RATES` relative to USD base.
     - Section subtotals and running `total` sum (excluding `total` keyword lines from self-accumulation).
     - **Section Headers & Rendering**: Syntax like `=== Section Title ===` or `--- Section Title ---` parses into `SectionHeader` nodes. In the evaluated result area, the section line renders the clean title text without `===` characters, styled with underlined text (`.section-title-text`) and an accent background banner.

4. **Value Formatting (`formatValue` / `formatValueWithSymbol`)**:
   - Formats final output numbers with locale grouping.
   - **Decimal Preservation Rule**: Gold and crypto assets (`GRAM_GOLD`, `CEYREK_GOLD`, `XAU`, `BTC`, `ETH`, etc.) **always** preserve floating-point decimals even when integer rounding (`disableFloat: true`) is toggled for fiat currency calculations.

### Live Exchange & Gold Rate Pipeline
- Initial rates are defined synchronously as defaults in `RATES`.
- Rates are cached locally in `localStorage` (`cetele_cached_exchange_rates`) for instant offline launch.
- `fetchLiveExchangeRates()` asynchronously fetches:
  1. Fiat rates from `https://open.er-api.com/v6/latest/USD`.
  2. Spot gold price (XAU per troy ounce) from `@fawazahmed0/currency-api`.
  3. Crypto prices (BTC, ETH, SOL) from `@fawazahmed0/currency-api`.
- `updateDerivedRates()` updates derived units:
  - `GRAM_GOLD = RATES.XAU * 31.1034768` (1 troy ounce = 31.1034768 grams)
  - `CEYREK_GOLD = RATES.GRAM_GOLD / 1.75` (1 Çeyrek Altın = 1.75 grams of 22k gold)
- `ratesVersion` reactive Vue ref triggers computation updates across open notepad tabs when live rates load.

---

## 📑 Default Example Showcase Tabs (`defaultTabs`)

Çetele initializes with two rich default showcase tabs designed to demonstrate the full range of notepad calculator capabilities:

1. **Tab 1: Calculator** (`EXAMPLE_TEXT` in `src/services/evaluator/constants.js`):
   - **Income & Multipliers**: Magnitude shorthand (`salary = 500k`, `freelance = 1.2m`, `investments = $2.5m`).
   - **Living Expenses & Discounts**: `rent = 1.65k`, `tech_deal = 20% off 1.5k`.
   - **Currency, Gold & Crypto**: Live conversions (`500k tl to usd`, `1 gram gold to tl`, `1 ceyrek gold to tl`, `portfolio = 0.5 btc + 2 eth to usd`).
   - **Physical Units & Percentages**: `12 km to miles`, `increase 2.5m by 15%`.
   - **Date Math**: `start_date = today`, `launch_event = start_date + 2 weeks - 1 day`, `flight_time = now + 4 hours - 15 mins`.
   - **Section Headers & Totals**: Section syntax (`=== Section Title ===`), section subtotals (`subtotal`), and grand `total` (result area renders clean, underlined section titles).

2. **Tab 2: Monthly Budget** (`defaultTabs` in `src/App.vue`):
   - **Revenues & Multiplier Income**: `primary_salary = 5.5k`, `consulting = 1.8k`, `freelance = 500k tl to usd`.
   - **Fixed Living Expenses**: `rent_mortgage = 1.85k`, `groceries = 650`, `utilities = 220`, `subscriptions = 45`.
   - **Savings & Investments**: Percentage savings (`15% of primary_salary`), crypto DCA (`0.05 btc + $250`), gold accumulation (`2 gram gold to tl`).
   - **Financial Summary & Runway**: Subtotal line references (`total_income = L8`, `total_spending = L15`), net monthly savings (`total_income - total_spending`), and projected annual savings (`net_monthly_savings * 12`).

---

## 💾 Storage & Cloud Sync Architecture

Çetele supports zero-login offline usage while providing real-time cloud synchronization for authenticated users.

1. **Local Database (`src/services/localDb.js`)**:
   - Primary: **IndexedDB** (`CeteleLocalDB` version 2) with stores for `tabs`, `saved_tabs`, and `settings`.
   - Fallback: `localStorage` (`cetele_local_tabs`, `cetele_saved_tabs`, `cetele_local_settings`).

2. **Cloud Synchronization (`src/services/syncService.js`)**:
   - Uses Supabase PostgreSQL (`user_tabs` table).
   - Implements throttled background updates (`throttledSyncTabsToCloud`) limited to a maximum rate of 1 write request per 2 seconds.
   - Row-Level Security (RLS) policies enforce isolated user access (`auth.uid() = user_id`).

3. **Window Focus & Active Tab Preservation**:
   - `subscribeToAuth` emits `(user, session, event)` on auth state changes.
   - `handleUserUpdated` filters events so background window-focus / token refresh events (`TOKEN_REFRESHED`) do **not** refetch cloud tabs or reset user focus.
   - `handleCloudFetch` checks if `activeTabId.value` exists in incoming `cloudTabs` and preserves active tab selection instead of resetting to tab 0.

4. **Shareable Links (`src/services/shareService.js`)**:
   - Serializes document title and content into a URL hash fragment (`#doc=<base64_encoded_payload>`).
   - Enables instant tab sharing without backend server calls.

---

## 📑 Tab Management & Closed Tab Stack (`App.vue`)

- **Active Tabs State**: `tabs` reactive array and `activeTabId` string ref.
- **Closed Tab Stack**: `closedTabsStack` array preserves deleted tab objects (`{ ...tab, closedIndex }`).
- **Reopen Functionality**: `reopenLastClosedTab()` pops from `closedTabsStack` and restores the tab to its original position in `tabs`.
- **Drag & Drop Tab Reordering**: Tabs in `Header.vue` are draggable (`draggable="true"`). Reordering updates each tab's `position` property, which is saved locally to IndexedDB/localStorage and synced to Supabase `user_tabs`.

### Global Keyboard Shortcuts (`handleGlobalShortcuts`)

| Shortcut | Action | Scope / Condition |
| :--- | :--- | :--- |
| `Ctrl + N` / `Cmd + N` | Create new tab | Global |
| `Ctrl + Z` / `Cmd + Z` | Reopen last closed tab | Outside text input/textarea |
| `Ctrl + Shift + T` / `Cmd + Shift + T` | Reopen last closed tab | Global |
| `Ctrl + Shift + C` / `Cmd + Shift + C` | Copy all lines with evaluated results (`= result`) | Global |
| `Ctrl + D` / `Cmd + D` | Toggle decimal formatting | Global |
| `Ctrl + B` / `Cmd + B` | Toggle reference sidebar | Global |
| `Ctrl + ,` / `Cmd + ,` | Open Settings modal | Global |

---

## 🚦 Developer Workflow & Commands

### Running Locally
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:3000`.

### Executing Unit Tests
```bash
npm test
```
Runs Vitest test suite (`tests/evaluator.test.js`). Always run `npm test` after modifying any logic in `evaluator.js` or state services.

### Production Build
```bash
npm run build
```
Compiles production bundles into `dist/`.

### Preview Production Build
```bash
npm run preview
```

---

## 📋 Guidelines for AI Agents & Developers

1. **Evaluator Engine Integrity**:
   - Never remove or break existing unit conversion, percentage math, or line reference syntax support.
   - Maintain decimal precision logic for gold and crypto assets in `formatValueWithSymbol`. Gold/crypto units must never be truncated to zero decimals.
2. **Offline-First Principle**:
   - All feature additions must function offline using fallback rates and IndexedDB / `localStorage`. Cloud sync with Supabase should enhance, never block, core notepad calculations.
3. **Tab & State Preservation**:
   - When fetching or updating tabs via `handleCloudFetch`, always preserve the active tab selection (`activeTabId`) if present.
   - Keep `closedTabsStack` functional so users can restore accidentally closed tabs using `Ctrl + Z` or `Ctrl + Shift + T`.
4. **No Unhandled Errors in UI**:
   - Syntax or math errors in the notepad editor should gracefully render an error symbol (`—`) in the result gutter rather than throwing unhandled exceptions.
5. **Verification Requirement**:
   - After making code modifications, always run `npm test` and `npm run build` to confirm test passing and build clean execution.
