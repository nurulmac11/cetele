// Autocomplete suggestions for the notepad: variables, functions, currencies, units and keywords.

export const FUNCTIONS = [
  { label: 'loan', detail: 'loan(amount, rate%, months | years) → monthly payment' },
  { label: 'pmt', detail: 'pmt(rate%, periods, amount) → payment per period' },
  { label: 'compound', detail: 'compound(amount, rate%, years, times per year = 12)' },
  { label: 'round', detail: 'round(x, decimals)' },
  { label: 'floor', detail: 'floor(x)' },
  { label: 'ceil', detail: 'ceil(x)' },
  { label: 'abs', detail: 'abs(x)' },
  { label: 'sqrt', detail: 'sqrt(x)' },
  { label: 'cbrt', detail: 'cbrt(x)' },
  { label: 'min', detail: 'min(a, b, …)' },
  { label: 'max', detail: 'max(a, b, …)' },
  { label: 'sum', detail: 'sum(a, b, …)' },
  { label: 'avg', detail: 'avg(a, b, …)' },
  { label: 'average', detail: 'average(a, b, …)' },
  { label: 'median', detail: 'median(a, b, …)' },
  { label: 'pow', detail: 'pow(x, y)' },
  { label: 'exp', detail: 'exp(x)' },
  { label: 'log', detail: 'log(x)' },
  { label: 'ln', detail: 'ln(x)' },
  { label: 'log10', detail: 'log10(x)' },
  { label: 'factorial', detail: 'factorial(n)' },
  { label: 'gcd', detail: 'gcd(a, b)' },
  { label: 'lcm', detail: 'lcm(a, b)' },
  { label: 'sin', detail: 'sin(x)' },
  { label: 'cos', detail: 'cos(x)' },
  { label: 'tan', detail: 'tan(x)' }
]

export const CURRENCIES = [
  ['usd', 'US dollar'],
  ['eur', 'euro'],
  ['gbp', 'British pound'],
  ['tl', 'Turkish lira'],
  ['try', 'Turkish lira'],
  ['jpy', 'Japanese yen'],
  ['chf', 'Swiss franc'],
  ['cad', 'Canadian dollar'],
  ['aud', 'Australian dollar'],
  ['cny', 'Chinese yuan'],
  ['inr', 'Indian rupee'],
  ['rub', 'Russian ruble'],
  ['brl', 'Brazilian real'],
  ['sek', 'Swedish krona'],
  ['nzd', 'New Zealand dollar'],
  ['aed', 'UAE dirham'],
  ['sar', 'Saudi riyal'],
  ['dollar', 'US dollar'],
  ['euro', 'euro'],
  ['lira', 'Turkish lira'],
  ['gram gold', 'gold, per gram'],
  ['gram altın', 'gold, per gram'],
  ['çeyrek altın', 'quarter gold coin'],
  ['oz gold', 'gold, per troy ounce'],
  ['btc', 'Bitcoin'],
  ['eth', 'Ethereum'],
  ['sol', 'Solana'],
  ['usdt', 'Tether'],
  ['bnb', 'BNB'],
  ['xrp', 'XRP'],
  ['doge', 'Dogecoin'],
  ['ada', 'Cardano'],
  ['avax', 'Avalanche']
].map(([label, detail]) => ({ label, detail }))

export const UNITS = [
  ['km', 'kilometres'],
  ['m', 'metres'],
  ['cm', 'centimetres'],
  ['mm', 'millimetres'],
  ['miles', 'miles'],
  ['ft', 'feet'],
  ['inch', 'inches'],
  ['yard', 'yards'],
  ['kg', 'kilograms'],
  ['gram', 'grams'],
  ['lbs', 'pounds (weight)'],
  ['oz', 'ounces'],
  ['tonne', 'metric tons'],
  ['liter', 'litres'],
  ['ml', 'millilitres'],
  ['cups', 'cups'],
  ['tbsp', 'tablespoons'],
  ['tsp', 'teaspoons'],
  ['gallon', 'US gallons'],
  ['km/h', 'kilometres per hour'],
  ['mph', 'miles per hour'],
  ['m/s', 'metres per second'],
  ['celsius', 'temperature, °C'],
  ['fahrenheit', 'temperature, °F'],
  ['kelvin', 'temperature, K'],
  ['hours', 'time'],
  ['minutes', 'time'],
  ['seconds', 'time'],
  ['days', 'time'],
  ['weeks', 'time'],
  ['months', 'time'],
  ['years', 'time'],
  ['kWh', 'energy'],
  ['acre', 'area']
].map(([label, detail]) => ({ label, detail }))

const KEYWORDS = [
  ['today', 'date'],
  ['tomorrow', 'date'],
  ['yesterday', 'date'],
  ['now', 'date and time'],
  ['total', 'sum of the lines above'],
  ['subtotal', 'sum since the last header or subtotal'],
  ['average', 'average since the last header or subtotal'],
  ['count', 'numbers since the last header or subtotal'],
  ['prev', 'result of the line above'],
  ['until', 'days until 2026-12-31'],
  ['since', 'days since 2025-01-01'],
  ['increase', 'increase 100 by 10%'],
  ['decrease', 'decrease 100 by 10%']
].map(([label, detail]) => ({ label, detail }))

const MAX_SUGGESTIONS = 8

/**
 * Suggestions for the word being typed.
 * @param {string} prefix  the partial word before the cursor
 * @param {string} lineBefore  the current line's text before the prefix
 * @param {Array<{ name: string, value: string }>} variables  variables declared in the document
 * @returns {Array<{ label: string, insert: string, kind: string, detail: string, caretOffset?: number }>}
 */
export function getCompletions(prefix, lineBefore = '', variables = []) {
  const pref = (prefix || '').toLowerCase()
  if (pref.length < 2) return []

  // After a number or a conversion keyword, the next word is almost always a unit or currency
  const afterNumber = /[\d.,%)]\s*$/.test(lineBefore)
  const afterConversion = /\b(to|in)\s+$/i.test(lineBefore)
  const unitContext = afterNumber || afterConversion

  const matches = (label) => label.toLowerCase().startsWith(pref) && label.toLowerCase() !== pref

  const variableItems = variables
    .filter((v) => matches(v.name))
    .map((v) => ({ label: v.name, insert: v.name, kind: 'variable', detail: v.value }))
  const functionItems = FUNCTIONS.filter((f) => matches(f.label)).map((f) => ({
    label: `${f.label}()`,
    insert: `${f.label}()`,
    caretOffset: -1, // place the cursor between the brackets
    kind: 'function',
    detail: f.detail
  }))
  const currencyItems = CURRENCIES.filter((c) => matches(c.label)).map((c) => ({
    ...c,
    insert: c.label,
    kind: 'currency'
  }))
  const unitItems = UNITS.filter((u) => matches(u.label)).map((u) => ({ ...u, insert: u.label, kind: 'unit' }))
  const keywordItems = KEYWORDS.filter((k) => matches(k.label)).map((k) => ({ ...k, insert: k.label, kind: 'keyword' }))

  const ordered = afterConversion
    ? [...currencyItems, ...unitItems]
    : unitContext
      ? [...currencyItems, ...unitItems, ...variableItems, ...keywordItems]
      : [...variableItems, ...functionItems, ...keywordItems, ...currencyItems, ...unitItems]

  // The same word can be both a unit and a currency label; keep the first
  const seen = new Set()
  return ordered.filter((item) => !seen.has(item.insert) && seen.add(item.insert)).slice(0, MAX_SUGGESTIONS)
}
