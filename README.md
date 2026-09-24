# çetele — Notepad Calculator

**çetele** is a live notepad calculator in the spirit of Soulver and Parsify: write plain lines, and each one is calculated as you type. It handles currencies (with live and historical rates), Turkish gold, crypto, units, dates, percentages and loans, and it works offline. Try it at [cetele.online](https://cetele.online).

Built with Vue 3 and Vite.

---

## ✨ Features

**Calculating**
- ⚡ **Live results** next to every line, recalculated as you type (only the lines below an edit are recalculated, so long documents stay fast).
- 🔤 **Variables** in any language, including Turkish (`maaş = 5k`), case-insensitive.
- 💱 **Currencies**: mix them freely (`10$ + 500 tl`), convert (`100 EUR to USD`), and use every currency the live feed offers. Rates refresh automatically, are cached for offline use, and the status bar shows how old they are.
- 🪙 **Gold and crypto**: `gram altın`, `çeyrek altın`, troy ounces, BTC, ETH, SOL and more.
- 🕰️ **Historical rates**: `100 usd to tl @ 2010-06-15` converts at that day's rates. Major currencies go back to 1999; every currency, gold and crypto back to 2024-03-02.
- 📏 **Units**: lengths, weights, volumes, time, speeds (`100 km/h to mph`), temperatures (`20 C to F`) and powers (`16 m^2`).
- 📅 **Dates**: `today`, `tomorrow`, `yesterday`, `now`, `today + 2 weeks`, date literals (`2026-12-31`, `31.12.2026`), `deadline - today`, `days until 2026-12-31`, `months since 2025-01-15`. Spans with a time read in hours or minutes (`now - today` → `9.5 hours`).
- 💰 **Money helpers**: tax (`1000 + %20 kdv`, `20% vat`), `loan(amount, rate%, 30 years)`, `pmt()`, `compound()`, percentages (`20% off 89.99`, `increase 1200 by 7%`).
- 🔢 **Magnitudes and separators**: `500k`, `2.5m`, `1.5b`, `1,250.50`, `1e3`.
- 🗂️ **Sections**: `=== Title ===` headers with `subtotal`, `average` and `count`, a grand `total`, and folding.
- 🔗 **Line references**: `#1`, `L1`, `line1` and `prev`. The lines a line reads are highlighted while you edit it; Alt+click a result (or its `#N` button) to insert a reference.

**Editing**
- 💡 **Autocomplete** for variables, functions (with their arguments), currencies, units and keywords, after 2 characters. Tab accepts; Enter accepts only after choosing with the arrow keys.
- 🔍 **Command palette** (`Ctrl+K` / `Cmd+K`): search lines in every tab, switch tabs, and run any command.
- 🕘 **Version history** for each tab: versions are saved when you pause typing, switch tabs, or before a tab is cleared, restored, imported over or replaced by sync. Preview any version with its results and restore it.
- ↩️ Undo/redo per tab, reopening closed tabs, drag-to-reorder tabs.
- 📋 **Copy All with results** (`Ctrl+Shift+C`) copies the document as `<line> = <result>`.

**Keeping and sharing**
- 💾 **Offline first**: tabs are saved in your browser (IndexedDB), and the app keeps working without a connection once loaded.
- ☁️ **Optional cloud sync** with Google sign-in (Supabase): local and cloud tabs are merged, newer edits win, and nothing is lost on sign-out without a warning.
- 🔗 **Share links**: the whole tab, compressed into the link itself, never stored on a server. Opening one shows a preview and asks first.
- 📚 **Saved library** for tabs you want to keep, plus JSON backup export and import.
- ☀️/🌙 Dark and light themes; keyboard and screen-reader friendly (dialogs trap focus, results are read out as you move between lines).

### ⌨️ Keyboard shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+K` / `Cmd+K` | Search every tab and run commands |
| `Alt+click` a result | Insert a reference to that line (`#5`) |
| `Tab` / `↑ ↓` then `Enter` | Accept an autocomplete suggestion |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo (outside the editor, `Ctrl+Z` reopens a closed tab) |
| `Alt+N` (`Option+N` on Mac) | New tab |
| `Alt+Shift+T` | Reopen the last closed tab |
| `Alt+D` (`Option+D` on Mac) | Toggle decimals |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Copy all lines with results |
| `Ctrl+B` / `Cmd+B` | Show or hide the sidebar |
| `Ctrl+,` / `Cmd+,` | Open settings |

---

## 📖 Examples

| Category | Input | Result |
| :--- | :--- | :--- |
| **Variables** | `price = 1,250.50`<br>`tax = 8.25% of price` | `1,250.5`<br>`103.1663` |
| **Line references** | `#1 + #2`<br>`L1 * 2` | `1,353.67`<br>`2,501` |
| **Currencies** | `10$ + 500 tl`<br>`100 usd to tl @ 2010-06-15` | *(live rates)*<br>`157.58 TL` |
| **Units** | `5 miles to km`<br>`3 cups + 2 tbsp to ml`<br>`20 C to F`<br>`100 km/h to mph` | `8.0467 km`<br>`739.7647 ml`<br>`68 °F`<br>`62.1371 mph` |
| **Percentages & tax** | `20% off 89.99`<br>`increase 1200 by 7%`<br>`1000 + %20 kdv` | `71.992`<br>`1,284`<br>`1,200` |
| **Dates** | `2026-01-31 + 1 month`<br>`days since 2024-01-01` | `Sat, Feb 28, 2026`<br>*(days to today)* |
| **Loans** | `loan(250k, 3.5%, 30 years)`<br>`compound(10k, 5%, 10 years)` | `1,122.6117`<br>`16,470.095` |
| **Sections** | `=== Rent ===`<br>`jan = 1500`<br>`feb = 1550`<br>`average` | <br>`1,500`<br>`1,550`<br>`1,525` |

The full syntax is in [SYNTAX_GUIDE.md](SYNTAX_GUIDE.md) and in the app's **Syntax Guide** page.

---

## 🚀 Quick Start

```bash
git clone https://github.com/nurulmac11/cetele.git
cd cetele
npm install
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm test             # Vitest
npm run lint         # ESLint
npm run format       # Prettier
npm run build        # production build in dist/
```

Cloud sync is optional. To enable it, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and run `supabase/schema.sql` in your Supabase project (existing projects: also run the files in `supabase/migrations/`).

Developer notes (architecture, conventions, performance and security rules) are in [AGENT.md](AGENT.md).

---

## 🌐 Deployment

The project is set up for **Vercel**: `vercel.json` has the SPA rewrite, security headers (including an enforced Content Security Policy) and caching rules. Import the repository on [Vercel](https://vercel.com/new); it detects Vite and deploys `dist/`.

---

## 📄 License

MIT License
