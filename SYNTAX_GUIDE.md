# çetele — Complete Syntax & Feature Guide

This guide provides the definitive reference for writing mathematical expressions, currency math, precious metals math (gold), cryptocurrency math, unit conversions, percentages, date arithmetic, and direct line references in **çetele**.

---

## 💱 1. Currency, Gold & Crypto Math

### Mixed Currency Math
When combining currencies, the currency of the **first currency item** determines the default target output currency:
```text
10$ + 500 tl        => 20.52 $ (converts 500 TL to USD and adds $10)
500 tl + 10$        => 975 TL  (converts $10 to TRY and adds 500 TL)
```

### Direct Conversions (`to target_currency`)
Convert values directly into a target currency:
```text
5$ to tl            => 237.50 TL
100 EUR to USD      => 108.69 USD
```

### 🏆 Gold & Precious Metals Math
Evaluate gold prices in Grams, Troy Ounces (XAU), and Çeyrek Altın:
```text
1 gram gold to tl        => 6,175.00 TL
1 gram gold to usd       => $130.00
5 gram altin + 100$       => $750.00
1 oz gold to usd         => $4,043.45
1 ceyrek to tl           => 10,806.00 TL
```

### 🚀 Cryptocurrency Math
Evaluate live crypto prices and perform cross-asset math:
```text
1 btc to usd             => $65,400.00
0.5 eth to tl            => 81,937.50 TL
100 sol + 50$            => $18,550.00
1 btc to gram gold       => 503 gram gold
500 usdt to tl           => 23,750.00 TL
```

#### Supported Assets & Symbols:
- **Fiat Currencies**: `$`, `USD`, `€`, `EUR`, `£`, `GBP`, `₺`, `TL`, `TRY`, `¥`, `JPY`, `₹`, `INR`, `CAD`, `AUD`, `CHF`, `CNY`, `SAR`, `AED`, `RUB`, `BRL`, `SEK`, `NZD`
- **Gold & Metals**: `1 gram gold`, `1 oz gold (XAU)`, `1 ceyrek`
- **Cryptocurrencies**: `BTC (Bitcoin)`, `ETH (Ethereum)`, `SOL (Solana)`, `USDT (Tether)`, `BNB`, `XRP`, `DOGE`, `ADA`, `AVAX`

---

## 🔢 2. Direct Line References

Reference calculated line answers from anywhere in your document:
```text
#1 + #2             => Sum of Line 1 and Line 2
L1 * 3              => Multiplies Line 1 by 3
line3 / 2           => Divides Line 3 answer by 2
prev * 2            => Multiplies the line immediately above
total               => Sum of all numeric lines above
```

---

## 💡 3. Variable Autocomplete

When typing a variable name prefix of **3 characters or more** (e.g. `sub...`, `tax...`, `inc...`), an inline autocomplete popup automatically displays declared variable names and their calculated values.
- Press **Tab** or **Enter** to insert the variable name.
- Use **ArrowUp / ArrowDown** to navigate the dropdown menu.

---

## 📐 4. Unit Conversions

Output numeric conversion results for physical units:
```text
5 miles to km       => 8.04672
3 cups to ml        => 709.765
10 lbs to kg        => 4.53592
75 degF to degC     => 23.8889
```

---

## 📊 5. Percentages

```text
15% of 240          => 36
20% off 89.99       => 51.992
increase 1200 by 7% => 1284
decrease 1200 by 15%=> 1020
```

---

## 📅 6. Date Arithmetic

```text
today               => Sun, Aug 02, 2026
today + 14 days     => Sun, Aug 16, 2026
today + 2 weeks     => Sun, Aug 16, 2026
now                 => Sun, Aug 02, 2026 14:30
```
