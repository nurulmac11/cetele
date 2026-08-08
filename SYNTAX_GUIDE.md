# çetele Syntax & Features Guide

**çetele** is a fast, offline-first notepad calculator built for live multi-currency, gold, crypto, and date math.

---

## 1. Basic Math & Line References

Write plain math expressions naturally across multiple lines.

```text
subtotal = 1,250.50
tax = 8.25% of subtotal
subtotal + tax

// Single-line comments
// This is a single line comment

// Python & C Multi-line Block Comments
"""
Python triple double-quote multi-line comment block
line 2 of comment
"""

'''
Python triple single-quote multi-line comment block
'''

/* C-style multi-line block comment */

// Line References
#1 + #2                // Line 1 + Line 2
L1 * 2                 // Line 1 multiplied by 2
line2 + 500            // Line 2 + 500
prev * 2               // Refers to the previous numeric result
total                  // Running total of all numeric lines above
```

---

## 2. Currency, Gold & Crypto Math

çetele automatically fetches live spot prices for fiat currencies, gold, and crypto assets.

```text
// Multi-currency arithmetic
10$ + 500 tl
100 usd to eur
0.5 btc + 2 eth to tl

// Gold & Precious Metals
1 gram altin to tl     // Live 2026 Gram Gold rate (~6,175 TL)
5 gram altin + 100$    // Adds $100 USD worth of gold to 5 grams
1 ceyrek to tl         // Quarter gold rate (1.75g) in TL
10 oz gold to usd      // Spot gold (XAU) in USD

// Crypto Math (BTC, ETH, SOL, USDT, BNB, XRP, DOGE, ADA, AVAX)
a = 100 sol + 50$      // Evaluates to SOL and tracks the SOL unit
a + 10$                // Converts $10 USD to SOL before adding
a to usd               // Converts total SOL to USD
```

---

## 3. Date Arithmetic & Date Variables

Perform chained date calculations and store dates in variables:

```text
// Base date keywords
today                  // Sun, Aug 02, 2026
now                    // Sun, Aug 02, 2026 09:20

// Date variables & chained math
start = today          // Assign date to variable 'start'
deadline = start + 2 weeks - 1 day + 2 months
event = now + 3 hours - 30 mins
```

---

## 4. Percentages & Unit Conversions

```text
// Percentages
15% of 240             // 36
20% off 89.99          // 71.992
increase 1,200 by 8%   // 1,296

// Units
12 km to miles
3 cups + 2 tbsp to ml

// Number Multiplier Suffixes (k, m, b, t)
500k                   // 500,000
2m                     // 2,000,000
1.5b                   // 1,500,000,000
3.2t                   // 3,200,000,000,000
$500k                  // $500,000
500k usd to tl         // Converts 500,000 USD to TL
```

---

## 5. Keyboard Shortcuts & Features

| Shortcut | Action |
| :--- | :--- |
| **`Ctrl + Z`** / **`Cmd + Z`** | **Undo** last typing or insertion step |
| **`Ctrl + Shift + Z`** / **`Ctrl + Y`** | **Redo** last undone step |
| **`Ctrl + Shift + C`** / **`Cmd + Shift + C`** | **Copy All** text with implicit calculated answers appended (`= result`) |
| **`Ctrl + N`** / **`Cmd + N`** | Create **New Notepad Tab** |
| **`Ctrl + D`** / **`Cmd + D`** | Toggle **Decimals** ON / OFF |
| **`Ctrl + ,`** | Open **Settings & Local Data Management** |

---

## 6. Shareable Links (URL Hash Sharing)

Click **Share Tab** in the sidebar to generate a live shareable link:
`https://cetele.online/#doc=<base64_payload>`

When anyone opens your shared link, **çetele** automatically decodes the payload offline and opens the document as a new tab!

---

## 7. Cloud Sync Architecture & Data Privacy ☁️

**çetele** combines offline-first local storage with optional Google OAuth Cloud Sync.

| Storage Mode | Active Tabs (`user_tabs`) | Saved Library (`saved_library`) |
| :--- | :--- | :--- |
| **Guest (Logged Out)** | Saved 100% locally in browser `IndexedDB` | Saved 100% locally in browser `IndexedDB` |
| **Google Cloud Sync** | ☁️ Synced to Supabase database | ☁️ Synced to Supabase database |

### Key Sync Rules:
1. **Instant Local Auto-Save**: Typing saves instantly to local `IndexedDB` with zero lag.
2. **2-Second Rate-Limited Throttle**: Cloud sync updates are throttled to a maximum of 1 request per 2 seconds while typing to prevent API spamming.
3. **PostgreSQL Row Level Security (RLS)**: Secured by PostgreSQL RLS (`auth.uid() = user_id`). Nobody can ever view, read, or modify another user's notes.
4. **Clean Sign Out**: Signing out reverts active tabs back to default guest templates and resets local templates so private notes aren't left behind.
