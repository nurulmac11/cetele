# çetele — Notepad Calculator

**çetele** is a Parsify/Soulver-style live notepad calculator built with Vue 3 and Vite. It combines natural text writing with real-time mathematical evaluation, live currency conversions, unit math, date arithmetic, direct line references, and offline multi-tab document persistence.

---

## ✨ Features

- ⚡ **Live Evaluation**: Math expressions evaluate instantly on the right column as you type.
- 💱 **Live Currency Math & Conversions**:
  - Mix currencies seamlessly: `10$ + 500 tl` *(converts secondary currencies automatically)*
  - Direct conversions: `5$ to tl`, `100 EUR to USD`
  - Compound post-arithmetic: `m + plus to tl + 16000`
  - Live rates fetched from Open ER API with offline `localStorage` caching.
- 🔢 **Direct Line References**:
  - Reference any line using `#1`, `#2`, `L1`, `L2`, `line1`, `line2`
  - Relative line reference: `prev` (immediately preceding line)
  - Running total: `total` (sum of all numeric lines above)
- 🔢 **Comma Separator Support**: Full support for comma-separated numbers in input (`1,000`, `1,250.50`, `10,000 + 5,000`).
- 💡 **Variable Autocomplete**: Typing 3 characters or more (`sub...`, `tax...`, `inc...`) shows an inline autocomplete dropdown for declared variables and their values.
- 📋 **Copy All with Results (`= result`)**: Click **Copy All (=)** or press `Ctrl+Shift+C` to copy your entire document formatted as `<input> = <result>`.
- 🎛️ **Decimals Switch**: Toggle decimal places ON/OFF (`Decimals` vs `Integers`).
- 🗂️ **Offline Multi-Tab Persistence**: All tabs auto-save locally to IndexedDB & `localStorage`. Zero logins or cloud accounts needed.
- ☀️/🌙 **Dark & Light Themes**: Cyberpunk Dark (default) and Clean Light Mode.
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl+N` / `Cmd+N`: New Tab
  - `Ctrl+D` / `Cmd+D`: Toggle Decimals
  - `Ctrl+Shift+C` / `Cmd+Shift+C`: Copy All with Results
  - `Ctrl+,` / `Cmd+,`: Open Settings Modal

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/nurulmac11/cetele.git
cd cetele
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
```

---

## 📖 Syntax Examples

| Category | Example Input | Output |
| :--- | :--- | :--- |
| **Variables** | `subtotal = 1,250.50`<br>`tax = 8.25% of subtotal` | `1,250.5`<br>`103.16625` |
| **Line References** | `#1 + #2`<br>`L1 * 2`<br>`prev / 2` | `1,353.66625`<br>`2,501`<br>`676.833125` |
| **Currencies** | `10$ + 500 tl`<br>`m + plus to tl + 16000` | `22.25`<br>`453,330.94` |
| **Units** | `5 miles to km`<br>`3 cups + 2 tbsp to ml` | `8.04672`<br>`739.338` |
| **Percentages** | `20% off 89.99`<br>`increase 1200 by 7%` | `51.992`<br>`1284` |
| **Dates** | `today`<br>`today + 14 days` | `Sun, Aug 02, 2026`<br>`Sun, Aug 16, 2026` |

---

## 🌐 Deployment

This project is pre-configured for **Vercel** with `vercel.json` rewrites:

1. Push your code to GitHub.
2. Import the repository on [Vercel](https://vercel.com/new).
3. Vercel automatically detects Vite (`npm run build` $\rightarrow$ `dist`).
4. Deploy!

---

## 📄 License
MIT License
