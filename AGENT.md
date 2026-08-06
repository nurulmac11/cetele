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
├── index.html                   # HTML template entry point
├── package.json                 # Project dependencies & scripts
├── vite.config.js               # Vite bundler & Vitest test config
├── vercel.json                  # Vercel deployment & rewrite rules
├── SYNTAX_GUIDE.md              # User-facing syntax reference
├── AGENT.md                     # AI Agent & Developer guide
├── supabase/
│   └── schema.sql               # PostgreSQL schema & RLS policies for user_tabs
├── tests/
│   └── evaluator.test.js        # Vitest suite for math, currency, gold & date evaluation
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

## 🧠 Evaluator Engine Architecture (`src/services/evaluator.js`)

The evaluator engine parses plain multi-line text input into formatted, calculated line results.

### Architecture & Execution Pipeline (`src/services/evaluator.js`)

1. **Lexer (Tokenizer - `class Lexer`)**:
   - Scans line input and emits structured tokens: `NUMBER`, `CURRENCY_SYMBOL`, `CURRENCY_CODE`, `IDENT`, `LINE_REF`, `KEYWORD` (`to`, `in`, `of`, `off`, `increase`, `decrease`, `by`), `OPERATOR` (`+`, `-`, `*`, `/`, `^`, `%`, `=`, `(`, `)`), `COMMENT`, and `EOF`.

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
