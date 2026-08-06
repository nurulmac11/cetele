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
        ├── evaluator.js         # Core evaluation engine (math, rates, gold/crypto, line refs)
        ├── localDb.js           # Offline IndexedDB storage with localStorage fallback
        ├── shareService.js      # URL hash compression & payload encoder/decoder
        ├── supabaseClient.js    # Supabase client initializer
        └── syncService.js       # Real-time cloud sync engine (throttled upserts)
```

---

## 🧠 Evaluator Engine Architecture (`src/services/evaluator.js`)

The evaluator engine parses plain multi-line text input into formatted, calculated line results.

### Pipeline Execution Order (`evaluateAll(text, options)`)
1. **Multi-line & Block Comments**:
   - Supports Python-style triple quotes (`"""` ... `"""` and `'''` ... `'''`), C-style block comments (`/*` ... `*/`), and single line comments (`//`, `#`).
   - Editor Syntax Highlighting: Comment lines render in vivid emerald/mint italicized typography (`.tok-comment` / `#34d399`) via a synced `.editor-backdrop` layer.
   - Result Column Badges: Comment lines render stylized dashed pill badges (`.comment-badge`) in the right-hand math column.
   - Inline block comments are stripped before expression evaluation.
2. **Section Headers & Subtotals**:
   - Lines starting with `// === Title ===`, `// --- Title ---`, `=== Title ===`, or `# Title` render as styled visual section header banners (`cls: 'section-header'`).
   - The `subtotal` keyword calculates the sum of numeric lines within that section without double-counting in running `total`.
   - Section metadata (`sections` array) is returned by `evaluateAll`.
3. **Sanitization**: Strips comma separators (`1,250.50` $\rightarrow$ `1250.50`).
3. **Date Arithmetic (`tryDateLine`)**: Handles `today`, `now`, and date offsets (`+ 2 weeks - 1 day`).
4. **Currency & Commodity Conversions (`tryCurrencyLine`)**:
   - Matches syntax like `<expr> to <target>` (e.g. `100$ to TL`, `100 USD to gram gold`, `1 gram altin to usd`).
   - Normalizes fiat currencies (`USD`, `EUR`, `TRY`/`TL`, `GBP`, `CAD`, `AUD`, `JPY`, etc.), gold/precious metals (`GRAM_GOLD`, `CEYREK_GOLD`, `XAU`), and crypto (`BTC`, `ETH`, `SOL`, `USDT`, `BNB`, `XRP`, `DOGE`, `ADA`, `AVAX`).
   - Converts monetary values through `RATES` relative to USD base.
5. **Gold & Crypto Phrase Normalization (`normalizeGoldAndCryptoPhrases`)**:
   - Maps natural phrases like `1 gram altin`, `5 gram gold`, `1 ceyrek`, `0.5 btc` to standard code representations.
6. **Line Reference & Variable Preprocessing (`preprocess`)**:
   - Resolves `#1`, `#2`, `L1`, `L2`, `line1`, `line2`, `prev` (preceding line value), and `total` (running sum).
   - Preserves currency types for referenced lines and variables across calculations.
   - Preprocesses percentage operations (`20% off 100`, `increase 1000 by 10%`, `10% of 500`).
7. **Math Evaluation (`math.evaluate`)**:
   - Evaluates parsed expressions using Math.js context scope.
8. **Value Formatting (`formatValue` / `formatValueWithSymbol`)**:
   - Formats final output numbers with appropriate locale grouping.
   - **Decimal Preservation Rule**: Gold and crypto assets (`GRAM_GOLD`, `CEYREK_GOLD`, `XAU`, `BTC`, `ETH`, etc.) **always** preserve floating-point decimals even when integer rounding (`disableFloat: true`) is toggled on for general fiat currency calculations.

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
