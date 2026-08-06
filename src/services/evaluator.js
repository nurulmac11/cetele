import { ref } from 'vue'
import * as math from 'mathjs'

export const EXAMPLE_TEXT = `// welcome — this is a notepad calculator
// write math, it evaluates as you type

=== Income & Sales ===
salary = 4,500
freelance = 1,200
subtotal

=== Monthly Expenses ===
rent = 1,650
groceries = 450
utilities = 180
subtotal

=== Currency, Gold & Crypto ===
10$ + 500 tl
1 gram gold to tl
1 btc to usd

=== Units & Percentages ===
5 miles to km
20% off 89.99

=== Date Math ===
start = today
deadline = start + 2 weeks - 1 day

=== Grand Summary ===
total`

const CACHED_RATES_KEY = 'cetele_cached_exchange_rates'

// Exchange rates relative to USD (1 USD = X currency/unit)
const GRAM_PER_TROY_OZ = 31.1034768
const USD_PER_GRAM_GOLD = 130.0
const USD_PER_TROY_OZ = USD_PER_GRAM_GOLD * GRAM_PER_TROY_OZ // ~$4,043.45 USD
const DEFAULT_XAU = 1 / USD_PER_TROY_OZ

export const RESERVED_KEYWORDS = new Set([
  'to', 'in', 'of', 'off', 'increase', 'decrease',
  'prev', 'total', 'subtotal', 'today', 'now',
  'pi', 'e', 'i', 'tau', 'phi',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sec', 'csc', 'cot',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sqrt', 'cbrt', 'abs', 'sign', 'ceil', 'floor', 'round', 'fix',
  'exp', 'log', 'log2', 'log10', 'ln', 'pow', 'factorial', 'mod',
  'min', 'max', 'sum', 'mean', 'median', 'mode', 'std', 'var', 'prod', 'gcd', 'lcm',
  'deg', 'rad', 'grad',
  'true', 'false', 'null', 'undefined', 'nan', 'infinity'
])

export const RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  TRY: 47.5,
  CAD: 1.38,
  AUD: 1.52,
  JPY: 150.0,
  INR: 83.5,
  CHF: 0.88,
  CNY: 7.25,
  SAR: 3.75,
  AED: 3.67,
  RUB: 86.0,
  BRL: 5.65,
  SEK: 10.5,
  NZD: 1.68,
  XAU: DEFAULT_XAU,
  GRAM_GOLD: 1 / USD_PER_GRAM_GOLD,
  CEYREK_GOLD: (1 / USD_PER_GRAM_GOLD) / 1.75,
  BTC: 1 / 65400,
  ETH: 1 / 3450,
  SOL: 1 / 185,
  USDT: 1.0,
  BNB: 1 / 580,
  XRP: 1 / 0.60,
  DOGE: 1 / 0.13,
  ADA: 1 / 0.42,
  AVAX: 1 / 28.5
}

// Reactive version token so Vue computed properties update when live rates arrive
export const ratesVersion = ref(1)

function updateDerivedRates() {
  RATES.TL = RATES.TRY
  const xauRate = RATES.XAU || DEFAULT_XAU
  RATES.GRAM_GOLD = xauRate * GRAM_PER_TROY_OZ
  RATES.CEYREK_GOLD = RATES.GRAM_GOLD / 1.75
}

updateDerivedRates()

// Initialize rates synchronously from localStorage cache if available
function initCachedRates() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHED_RATES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        Object.assign(RATES, parsed)
        updateDerivedRates()
      }
    }
  } catch (e) {
    // fallback
  }
}

initCachedRates()

// Fetch live exchange rates & crypto prices
export async function fetchLiveExchangeRates() {
  try {
    // 1. Fetch fiat currency exchange rates
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      if (data && data.rates) {
        Object.assign(RATES, data.rates)
        updateDerivedRates()
      }
    }

    // 2. Fetch live gold rates (XAU spot price)
    try {
      const resGold = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json')
      if (resGold.ok) {
        const goldData = await resGold.json()
        const usdPerOz = goldData?.xau?.usd || goldData?.xau?.bmd
        if (usdPerOz && usdPerOz > 0) {
          RATES.XAU = 1 / usdPerOz
          updateDerivedRates()
        }
      }
    } catch (gErr) {}

    // 3. Fetch live crypto rates (BTC, ETH, SOL)
    try {
      const resBtc = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/btc.json')
      if (resBtc.ok) {
        const btcData = await resBtc.json()
        if (btcData?.btc?.usd) RATES.BTC = 1 / btcData.btc.usd
      }

      const resEth = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eth.json')
      if (resEth.ok) {
        const ethData = await resEth.json()
        if (ethData?.eth?.usd) RATES.ETH = 1 / ethData.eth.usd
      }

      const resSol = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/sol.json')
      if (resSol.ok) {
        const solData = await resSol.json()
        if (solData?.sol?.usd) RATES.SOL = 1 / solData.sol.usd
      }
    } catch (cErr) {}

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHED_RATES_KEY, JSON.stringify(RATES))
      } catch (e) {}
    }
    ratesVersion.value++
  } catch (err) {
    console.warn('Could not fetch live exchange rates, using cached rates:', err)
  }
}

// Kick off background fetch
fetchLiveExchangeRates()

const CURRENCY_MAP = {
  '$': 'USD',
  'USD': 'USD',
  'DOLLAR': 'USD',
  'DOLLARS': 'USD',
  '€': 'EUR',
  'EUR': 'EUR',
  'EURO': 'EUR',
  'EUROS': 'EUR',
  '£': 'GBP',
  'GBP': 'GBP',
  'POUND': 'GBP',
  'POUNDS': 'GBP',
  '₺': 'TRY',
  'TL': 'TRY',
  'TRY': 'TRY',
  'LIRA': 'TRY',
  'TLIRA': 'TRY',
  '¥': 'JPY',
  'JPY': 'JPY',
  'YEN': 'JPY',
  '₹': 'INR',
  'INR': 'INR',
  'RUPEE': 'INR',
  'CAD': 'CAD',
  'AUD': 'AUD',
  'CHF': 'CHF',
  'CNY': 'CNY',
  'RMB': 'CNY',
  'SAR': 'SAR',
  'AED': 'AED',
  'RUB': 'RUB',
  'BRL': 'BRL',
  'SEK': 'SEK',
  'NZD': 'NZD',
  'XAU': 'XAU',
  'OZ_GOLD': 'XAU',
  'OUNCE_GOLD': 'XAU',
  'GRAM_GOLD': 'GRAM_GOLD',
  'GRAM_ALTIN': 'GRAM_GOLD',
  'ALTIN': 'GRAM_GOLD',
  'ALTıN': 'GRAM_GOLD',
  'GOLD': 'GRAM_GOLD',
  'GRAM': 'GRAM_GOLD',
  'CEYREK_GOLD': 'CEYREK_GOLD',
  'CEYREK_ALTIN': 'CEYREK_GOLD',
  'CEYREK': 'CEYREK_GOLD',
  'ÇEYREK': 'CEYREK_GOLD',
  'BTC': 'BTC',
  'BITCOIN': 'BTC',
  'ETH': 'ETH',
  'ETHEREUM': 'ETH',
  'SOL': 'SOL',
  'SOLANA': 'SOL',
  'USDT': 'USDT',
  'TETHER': 'USDT',
  'BNB': 'BNB',
  'XRP': 'XRP',
  'DOGE': 'DOGE',
  'DOGECOIN': 'DOGE',
  'ADA': 'ADA',
  'CARDANO': 'ADA',
  'AVAX': 'AVAX'
}

export function stripCommaSeparators(str) {
  if (!str) return ''
  return str.replace(/\b(\d{1,3})(?:,(\d{3}))+(?!\d)/g, (match) => match.replace(/,/g, ''))
}

function normalizeCurrency(str) {
  if (!str) return null
  const s = str.trim().toUpperCase()
  return CURRENCY_MAP[s] || (RATES[s] ? s : null)
}

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

export function fmtDate(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function fmtDateTime(d) {
  return `${fmtDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function preprocessLineReferences(line, lineResults) {
  let l = line
  if (!Array.isArray(lineResults) || lineResults.length === 0) return l

  l = l.replace(/#(\d+)\b/g, (_, numStr) => {
    const idx = parseInt(numStr, 10) - 1
    const val = (idx >= 0 && idx < lineResults.length && typeof lineResults[idx] === 'number') ? lineResults[idx] : 0
    return `(${val})`
  })

  l = l.replace(/\bL(\d+)\b/gi, (_, numStr) => {
    const idx = parseInt(numStr, 10) - 1
    const val = (idx >= 0 && idx < lineResults.length && typeof lineResults[idx] === 'number') ? lineResults[idx] : 0
    return `(${val})`
  })

  l = l.replace(/\bline(\d+)\b/gi, (_, numStr) => {
    const idx = parseInt(numStr, 10) - 1
    const val = (idx >= 0 && idx < lineResults.length && typeof lineResults[idx] === 'number') ? lineResults[idx] : 0
    return `(${val})`
  })

  return l
}

function normalizeGoldAndCryptoPhrases(line) {
  let l = line
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:grams?|g)?\s*(?:of\s*)?(?:gold|alt[ıi]n)\b/gi, '$1 GRAM_GOLD')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:troy\s*)?(?:oz|ounces?)\s*(?:of\s*)?gold\b/gi, '$1 XAU')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:[çc]eyrek(?:\s*(?:alt[ıi]n|gold))?)\b/gi, '$1 CEYREK_GOLD')

  l = l.replace(/(-?\d+(?:\.\d+)?)\s*bitcoins?\b/gi, '$1 BTC')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*ethereums?\b/gi, '$1 ETH')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*solanas?\b/gi, '$1 SOL')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*dogecoins?\b/gi, '$1 DOGE')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*tethers?\b/gi, '$1 USDT')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*cardanos?\b/gi, '$1 ADA')

  return l
}

function preprocessCurrencies(line, varCurrencies = {}, lineCurrencies = [], prevCurrency = null, forcedTargetCurrency = null) {
  let l = normalizeGoldAndCryptoPhrases(line)
  const matches = []

  // 1. Prefix symbols ($10, ₺500, €50, ¥1000, ₹500)
  const prefixRegex = /([$€£₺¥₹])\s*(-?\d+(?:\.\d+)?)/g
  let m
  while ((m = prefixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[1])
    if (curr) matches.push({ raw: m[0], rawSymbol: m[1], index: m.index, amount: parseFloat(m[2]), currency: curr })
  }

  // 2. Suffix symbols (10$, 500₺, 50€, 1000¥, 500₹)
  const symbolSuffixRegex = /(-?\d+(?:\.\d+)?)\s*([$€£₺¥₹])/g
  while ((m = symbolSuffixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[2])
    if (curr) {
      const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
      if (!overlap) matches.push({ raw: m[0], rawSymbol: m[2], index: m.index, amount: parseFloat(m[1]), currency: curr })
    }
  }

  // 3. Suffix codes (100 USD, 500 TL, 100 BRL, 1 GRAM_GOLD, 1 BTC, 0.5 ETH, 10 SOL)
  const codeSuffixRegex = /(-?\d+(?:\.\d+)?)\s*(USD|EUR|GBP|TRY|TL|CAD|AUD|JPY|INR|CHF|CNY|RMB|SAR|AED|RUB|BRL|SEK|NZD|GRAM_GOLD|CEYREK_GOLD|XAU|BTC|ETH|SOL|USDT|BNB|XRP|DOGE|ADA|AVAX)\b/gi
  while ((m = codeSuffixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[2])
    if (curr) {
      const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
      if (!overlap) matches.push({ raw: m[0], rawSymbol: m[2].toUpperCase(), index: m.index, amount: parseFloat(m[1]), currency: curr })
    }
  }

  // 4. Variables that have an assigned currency type
  if (varCurrencies && typeof varCurrencies === 'object') {
    Object.keys(varCurrencies).forEach((vName) => {
      const vCurr = varCurrencies[vName]
      if (vCurr) {
        const vRegex = new RegExp(`\\b(${vName})\\b`, 'g')
        while ((m = vRegex.exec(l)) !== null) {
          const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
          if (!overlap) {
            matches.push({ raw: m[0], rawSymbol: vCurr, index: m.index, amount: null, currency: vCurr, isVar: true })
          }
        }
      }
    })
  }

  // 5. Line references (#1, L1, line1) with associated currency types
  if (Array.isArray(lineCurrencies)) {
    const refRegex = /(?:#|L|line)(\d+)\b/gi
    while ((m = refRegex.exec(l)) !== null) {
      const lineIdx = parseInt(m[1], 10) - 1
      const refCurr = lineCurrencies[lineIdx]
      if (refCurr) {
        const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
        if (!overlap) {
          matches.push({ raw: m[0], rawSymbol: refCurr, index: m.index, amount: null, currency: refCurr, isVar: true })
        }
      }
    }
  }

  // 6. `prev` reference with associated currency type
  if (prevCurrency) {
    const prevRegex = /\bprev\b/gi
    while ((m = prevRegex.exec(l)) !== null) {
      const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
      if (!overlap) {
        matches.push({ raw: m[0], rawSymbol: prevCurrency, index: m.index, amount: null, currency: prevCurrency, isVar: true })
      }
    }
  }

  if (matches.length === 0) return { expr: l, symbol: forcedTargetCurrency || null }

  matches.sort((a, b) => a.index - b.index)

  const targetCurrency = forcedTargetCurrency || matches[0].currency
  const detectedSymbol = forcedTargetCurrency || matches[0].rawSymbol

  let resultLine = l
  for (let i = matches.length - 1; i >= 0; i--) {
    const item = matches[i]
    if (item.isVar) continue

    let convertedAmount = item.amount
    if (item.currency !== targetCurrency && RATES[item.currency] && RATES[targetCurrency]) {
      const amountInUSD = item.amount / RATES[item.currency]
      convertedAmount = amountInUSD * RATES[targetCurrency]
    }
    
    const numStr = Math.round(convertedAmount * 1e6) / 1e6
    resultLine = resultLine.slice(0, item.index) + numStr + resultLine.slice(item.index + item.raw.length)
  }

  return { expr: resultLine, symbol: detectedSymbol }
}

export function preprocess(line, lineResults = [], varCurrencies = {}, lineCurrencies = [], prevCurrency = null, forcedTargetCurrency = null) {
  let l = line.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (!l) return { expr: null, symbol: null }

  l = stripCommaSeparators(l)
  let varPrefix = ''
  let rhs = l
  const mVar = l.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mVar) {
    varPrefix = mVar[1] + ' = '
    rhs = mVar[2]
  }

  const currRes = preprocessCurrencies(rhs, varCurrencies, lineCurrencies, prevCurrency, forcedTargetCurrency)
  rhs = currRes.expr
  const symbol = currRes.symbol

  rhs = preprocessLineReferences(rhs, lineResults)

  let m = rhs.match(/^increase\s+(.+?)\s+by\s+(-?\d+(?:\.\d+)?)\s*%$/i)
  if (m) return { expr: varPrefix + `(${m[1]}) * (1 + ${m[2]}/100)`, symbol }

  m = rhs.match(/^decrease\s+(.+?)\s+by\s+(-?\d+(?:\.\d+)?)\s*%$/i)
  if (m) return { expr: varPrefix + `(${m[1]}) * (1 - ${m[2]}/100)`, symbol }

  m = rhs.match(/^(-?\d+(?:\.\d+)?)\s*%\s*of\s+(.+)$/i)
  if (m) return { expr: varPrefix + `(${m[1]}/100) * (${m[2]})`, symbol }

  m = rhs.match(/^(-?\d+(?:\.\d+)?)\s*%\s*off\s+(.+)$/i)
  if (m) return { expr: varPrefix + `(${m[2]}) - (${m[1]}/100)*(${m[2]})`, symbol }

  m = rhs.match(/^(-?\d+(?:\.\d+)?)\s*%\s*on\s+(.+)$/i)
  if (m) return { expr: varPrefix + `(${m[2]}) + (${m[1]}/100)*(${m[2]})`, symbol }

  return { expr: varPrefix + rhs, symbol }
}

export function tryCurrencyLine(raw, scope, options = {}, lineResults = [], varCurrencies = {}, lineCurrencies = [], prevCurrency = null) {
  const l = raw.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (!l) return null

  let cleanLine = stripCommaSeparators(l)

  let varName = null
  let rhs = cleanLine
  const mVar = cleanLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mVar) {
    varName = mVar[1]
    rhs = mVar[2]
  }

  rhs = normalizeGoldAndCryptoPhrases(rhs)
  rhs = rhs.replace(/\s+to\s+(?:grams?\s*(?:of\s*)?)?(?:gold|alt[ıi]n)\b/gi, ' to GRAM_GOLD')
  rhs = rhs.replace(/\s+to\s+gram\b/gi, ' to GRAM_GOLD')
  rhs = rhs.replace(/\s+to\s+(?:troy\s*)?(?:oz|ounces?)\s*(?:of\s*)?gold\b/gi, ' to XAU')
  rhs = rhs.replace(/\s+to\s+(?:[çc]eyrek(?:\s*(?:alt[ıi]n|gold))?)\b/gi, ' to CEYREK_GOLD')

  if (!/\bto\b/i.test(rhs)) return null

  const currTokens = '[$€£₺¥₹]|USD|EUR|GBP|TRY|TL|CAD|AUD|JPY|INR|CHF|CNY|RMB|SAR|AED|RUB|BRL|SEK|NZD|GRAM_GOLD|CEYREK_GOLD|XAU|BTC|ETH|SOL|USDT|BNB|XRP|DOGE|ADA|AVAX'
  const regexLiteral = new RegExp(`(?:([$€£₺¥₹])\\s*)?(\\d+(?:\\.\\d+)?)\\s*(${currTokens})?\\s+to\\s+([$€£₺¥₹A-Za-z_]{1,12})`, 'i')
  const regexRef = new RegExp(`((?:#|L|line)\\d+|\\bprev\\b|[a-zA-Z_][a-zA-Z0-9_]*)\\s+to\\s+([$€£₺¥₹A-Za-z_]{1,12})`, 'i')

  let currentExpr = rhs
  let detectedTarget = null
  let rawTargetStr = null
  let loopCount = 0

  while (loopCount < 10 && /\bto\b/i.test(currentExpr)) {
    loopCount++
    let replacedInLoop = false

    // 1. Literal currency conversion (e.g. 100$, 100 USD, $100) -> to EUR
    const mLit = currentExpr.match(regexLiteral)
    if (mLit && (mLit[1] || mLit[3])) {
      const fullMatch = mLit[0]
      const prefixSym = mLit[1]
      const numStr = mLit[2]
      const suffixSym = mLit[3]
      const targetStr = mLit[4]

      const amount = parseFloat(numStr)
      const rawCurr = prefixSym || suffixSym
      const fromCurr = normalizeCurrency(rawCurr)
      const toCurr = normalizeCurrency(targetStr)

      if (fromCurr && toCurr && RATES[fromCurr] && RATES[toCurr]) {
        const usdVal = amount / RATES[fromCurr]
        const converted = usdVal * RATES[toCurr]
        detectedTarget = toCurr
        rawTargetStr = targetStr
        currentExpr = currentExpr.replace(fullMatch, String(converted))
        replacedInLoop = true
        continue
      }
    }

    // 2. Line reference or variable conversion (e.g. #1 to EUR, L1 to USD, prev to TRY, salary to EUR)
    const mRef = currentExpr.match(regexRef)
    if (mRef) {
      const fullMatch = mRef[0]
      const refToken = mRef[1]
      const targetStr = mRef[2]
      let fromCurr = null
      let val = null

      const refLineMatch = refToken.match(/(?:#|L|line)(\d+)/i)
      if (refLineMatch) {
        const lIdx = parseInt(refLineMatch[1], 10) - 1
        if (lineResults[lIdx] !== undefined && lineResults[lIdx] !== null) {
          val = lineResults[lIdx]
          fromCurr = lineCurrencies[lIdx]
        }
      } else if (/^prev$/i.test(refToken)) {
        val = scope.prev !== undefined ? scope.prev : 0
        fromCurr = prevCurrency
      } else if (varCurrencies[refToken]) {
        val = scope[refToken]
        fromCurr = varCurrencies[refToken]
      }

      const toCurr = normalizeCurrency(targetStr)
      if (val !== null && val !== undefined && fromCurr && toCurr && RATES[fromCurr] && RATES[toCurr]) {
        const usdVal = val / RATES[fromCurr]
        const converted = usdVal * RATES[toCurr]
        detectedTarget = toCurr
        rawTargetStr = targetStr
        currentExpr = currentExpr.replace(fullMatch, String(converted))
        replacedInLoop = true
        continue
      }
    }

    if (!replacedInLoop) break
  }

  if (!detectedTarget && !/\bto\s+[$€£₺¥₹A-Za-z_]{1,12}$/i.test(currentExpr)) return null

  // Check outer trailing 'to currency' expression (e.g. (1$ to tl) + 5 to usd)
  const mOuter = currentExpr.match(/^(.*?)\s+to\s+([$€£₺¥₹A-Za-z_]{1,12})$/i)
  if (mOuter) {
    const outerLhs = mOuter[1]
    const outerTargetStr = mOuter[2]
    const outerToCurr = normalizeCurrency(outerTargetStr)

    if (outerToCurr && RATES[outerToCurr]) {
      const sourceCurr = detectedTarget || 'USD'
      try {
        const { expr: processedLhs } = preprocess(outerLhs, lineResults, varCurrencies, lineCurrencies, prevCurrency, sourceCurr)
        const lhsVal = math.evaluate(processedLhs, scope)
        if (typeof lhsVal === 'number') {
          const usdVal = lhsVal / RATES[sourceCurr]
          const finalVal = usdVal * RATES[outerToCurr]
          const formatted = formatValueWithSymbol(finalVal, outerTargetStr, options)
          return {
            type: 'currency',
            varName,
            targetCurrency: outerToCurr,
            numericValue: finalVal,
            text: formatted
          }
        }
      } catch (e) {}
    }
  }

  try {
    const { expr: processedRhs } = preprocess(currentExpr, lineResults, varCurrencies, lineCurrencies, prevCurrency, detectedTarget)
    const finalVal = math.evaluate(processedRhs, scope)
    if (typeof finalVal === 'number') {
      const formatted = formatValueWithSymbol(finalVal, rawTargetStr || detectedTarget, options)
      return {
        type: 'currency',
        varName,
        targetCurrency: detectedTarget,
        numericValue: finalVal,
        text: formatted
      }
    }
  } catch (e) {
    return null
  }

  return null
}

export function tryDateLine(raw, scopeDates = {}) {
  const l = raw.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (!l) return null

  let varName = null
  let rhs = l
  const mVar = l.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mVar) {
    varName = mVar[1]
    rhs = mVar[2].trim()
  }

  let isTimeIncluded = false
  let baseDate = null
  let restExpr = ''

  if (/^today\b/i.test(rhs)) {
    baseDate = new Date()
    restExpr = rhs.replace(/^today/i, '').trim()
  } else if (/^now\b/i.test(rhs)) {
    baseDate = new Date()
    isTimeIncluded = true
    restExpr = rhs.replace(/^now/i, '').trim()
  } else {
    const varMatch = rhs.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\b/)
    if (varMatch && scopeDates[varMatch[1]]) {
      const vName = varMatch[1]
      const savedObj = scopeDates[vName]
      baseDate = new Date(savedObj.timestamp)
      isTimeIncluded = Boolean(savedObj.isTime)
      restExpr = rhs.slice(vName.length).trim()
    }
  }

  if (!baseDate) return null

  const d = new Date(baseDate.getTime())

  const tokenRegex = /([+-])\s*(\d+)\s*(days?|weeks?|months?|years?|hours?|mins?|minutes?|seconds?)/gi
  let match
  let hasValidOp = false

  while ((match = tokenRegex.exec(restExpr)) !== null) {
    hasValidOp = true
    const sign = match[1] === '+' ? 1 : -1
    const amount = parseInt(match[2], 10) * sign
    const unit = match[3].toLowerCase()

    if (unit.startsWith('day')) {
      d.setDate(d.getDate() + amount)
    } else if (unit.startsWith('week')) {
      d.setDate(d.getDate() + amount * 7)
    } else if (unit.startsWith('month')) {
      d.setMonth(d.getMonth() + amount)
    } else if (unit.startsWith('year')) {
      d.setFullYear(d.getFullYear() + amount)
    } else if (unit.startsWith('hour')) {
      d.setHours(d.getHours() + amount)
      isTimeIncluded = true
    } else if (unit.startsWith('min')) {
      d.setMinutes(d.getMinutes() + amount)
      isTimeIncluded = true
    } else if (unit.startsWith('sec')) {
      d.setSeconds(d.getSeconds() + amount)
      isTimeIncluded = true
    }
  }

  if (restExpr && !hasValidOp) {
    return null
  }

  const formattedText = isTimeIncluded ? fmtDateTime(d) : fmtDate(d)

  return {
    type: 'date',
    varName,
    timestamp: d.getTime(),
    isTimeIncluded,
    text: formattedText
  }
}

function formatValueWithSymbol(val, symbol, options = {}) {
  if (!symbol) return formatValue(val, options)

  const s = symbol.trim().toUpperCase()
  const isGoldOrCrypto = [
    'GRAM_GOLD', 'CEYREK_GOLD', 'XAU', 'GOLD', 'ALTIN', 'ALTıN', 'CEYREK', 'ÇEYREK',
    'BTC', 'BITCOIN', 'ETH', 'ETHEREUM', 'SOL', 'SOLANA', 'USDT', 'TETHER',
    'BNB', 'XRP', 'DOGE', 'DOGECOIN', 'ADA', 'CARDANO', 'AVAX'
  ].includes(s)

  const effectiveOptions = isGoldOrCrypto ? { ...options, disableFloat: false } : options
  const formattedVal = formatValue(val, effectiveOptions)

  if (['$', '€', '£', '₺', '¥', '₹'].includes(symbol.trim())) {
    return `${symbol.trim()}${formattedVal}`
  }
  if (s === 'GRAM_GOLD' || s === 'GOLD' || s === 'GRAM ALTIN' || s === 'ALTIN' || s === 'GRAM') return `${formattedVal} gram gold`
  if (s === 'CEYREK_GOLD' || s === 'CEYREK' || s === 'CEYREK ALTIN' || s === 'ÇEYREK') return `${formattedVal} çeyrek gold`
  if (s === 'XAU') return `${formattedVal} oz gold`

  return `${formattedVal} ${symbol.trim().toUpperCase()}`
}

export function formatValue(v, options = {}) {
  const disableFloat = typeof options === 'boolean' ? options : Boolean(options?.disableFloat)
  
  if (v === undefined || v === null || typeof v === 'function' || typeof v === 'symbol') return ''
  if (typeof v === 'boolean') return String(v)
  if (typeof v === 'number') {
    if (!isFinite(v)) return 'error'
    if (disableFloat) {
      const rounded = Math.round(v)
      return rounded.toLocaleString('en-US')
    }
    if (Number.isInteger(v)) return v.toLocaleString('en-US')
    const rounded = Math.round(v * 1e6) / 1e6
    return rounded.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }
  if (v && v.isUnit) {
    try {
      const num = typeof v.toNumeric === 'function' ? v.toNumeric() : v.value
      return formatValue(num, options)
    } catch (e) {
      return formatValue(v.value, options)
    }
  }
  if (v && v.isComplex) return formatValue(v.re, options)
  if (typeof v === 'object') return ''
  return String(v)
}

function cleanCommentText(text) {
  if (!text) return ''
  let s = text
    .replace(/^;\s*/, '')
    .replace(/^"""/, '')
    .replace(/"""$/, '')
    .replace(/^'''/, '')
    .replace(/'''$/, '')
    .replace(/^\/\*/, '')
    .replace(/\*\/$/, '')
    .replace(/^\/\//, '')
    .replace(/^#/, '')
    .trim()
  return s
}

export function evaluateAll(text, options = {}) {
  const _v = ratesVersion.value

  if (text === null || text === undefined) text = ''
  const lines = text.split('\n')
  const scope = { pi: Math.PI, e: Math.E }
  const varCurrencies = {}
  const lineCurrencies = []
  const scopeDates = {}
  let prev = null
  let prevCurrency = null
  let sum = 0
  const rendered = []
  const lineResults = []
  let currentSectionTitle = null
  let currentSectionHeaderIdx = null
  let sectionSum = 0
  let sectionTotalSum = 0
  let sectionLineCount = 0
  const sections = []

  let inMultiLineComment = false
  let activeCommentDelimiter = null

  lines.forEach((raw, lineIdx) => {
    let trimmedRaw = raw.replace(/^;\s*/, '').trim()

    // 1. Active multi-line comment block continuation
    if (inMultiLineComment) {
      const cText = cleanCommentText(trimmedRaw)
      if (
        (activeCommentDelimiter === '"""' && trimmedRaw.includes('"""')) ||
        (activeCommentDelimiter === "'''" && trimmedRaw.includes("'''")) ||
        (activeCommentDelimiter === '/*' && trimmedRaw.includes('*/'))
      ) {
        inMultiLineComment = false
        activeCommentDelimiter = null
      }
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    if (trimmedRaw === '') {
      rendered.push({ cls: 'empty', text: '' })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    // 2. Opening multi-line comment block (Python triple quotes or C block comments)
    let openingDelimiter = null
    if (trimmedRaw.startsWith('"""')) openingDelimiter = '"""'
    else if (trimmedRaw.startsWith("'''")) openingDelimiter = "'''"
    else if (trimmedRaw.startsWith('/*')) openingDelimiter = '/*'

    if (openingDelimiter) {
      const rest = trimmedRaw.slice(openingDelimiter.length)
      const closingDelimiter = openingDelimiter === '/*' ? '*/' : openingDelimiter
      if (rest.includes(closingDelimiter)) {
        const afterCloseIdx = rest.indexOf(closingDelimiter) + closingDelimiter.length
        const afterComment = rest.slice(afterCloseIdx).trim()
        if (!afterComment) {
          const cText = cleanCommentText(trimmedRaw)
          rendered.push({ cls: 'comment', text: cText })
          lineResults.push(null)
          lineCurrencies.push(null)
          return
        } else {
          trimmedRaw = afterComment
        }
      } else {
        inMultiLineComment = true
        activeCommentDelimiter = openingDelimiter
        const cText = cleanCommentText(trimmedRaw)
        rendered.push({ cls: 'comment', text: cText })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
    }

    // 3. Strip inline block comments from calculation lines
    trimmedRaw = trimmedRaw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"""[\s\S]*?"""/g, '')
      .replace(/'''[\s\S]*?'''/g, '')
      .trim()

    if (trimmedRaw === '') {
      const cText = cleanCommentText(raw)
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    // Check for Section Header (e.g. === Income ===, --- Expenses ---, # Income, // === Notes ===)
    const isAssign = /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(trimmedRaw)
    const mSection = !isAssign ? trimmedRaw.match(/^(?:\/\/\s*)?(?:={3,}|-{3,}|#{1,3}\s+)\s*(.+?)(?:\s*(?:={3,}|-{3,}|#{1,3}))?$/) : null
    if (mSection) {
      const sectionTitle = mSection[1].replace(/^#+\s*/, '').trim()
      if (sectionTitle && !/^\d+$/.test(sectionTitle)) {
        if (currentSectionHeaderIdx !== null) {
          sections.push({
            headerIdx: currentSectionHeaderIdx,
            title: currentSectionTitle,
            subtotal: sectionTotalSum,
            count: sectionLineCount,
            endIdx: lineIdx - 1
          })
        }
        currentSectionHeaderIdx = lineIdx
        currentSectionTitle = sectionTitle
        sectionSum = 0
        sectionTotalSum = 0
        sectionLineCount = 0

        rendered.push({ cls: 'section-header', isSection: true, title: sectionTitle, text: `=== ${sectionTitle} ===` })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
    }

    // Single-line comment (starts with // or # when not a section header or line reference)
    if (trimmedRaw.startsWith('//') || (trimmedRaw.startsWith('#') && !/^(?:#\d+|L\d+|line\d+)/i.test(trimmedRaw))) {
      const cText = cleanCommentText(trimmedRaw)
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    const cleanRaw = stripCommaSeparators(trimmedRaw)

    // Check for standalone subtotal keyword line (e.g. subtotal or subtotal // comment)
    if (/^subtotal\s*(?:\/\/.*)?$/i.test(cleanRaw)) {
      const formatted = formatValue(sectionSum, options)
      rendered.push({ cls: 'num subtotal-line', isSubtotal: true, text: formatted })
      lineResults.push(sectionSum)
      lineCurrencies.push(null)
      prev = sectionSum
      sectionSum = 0
      return
    }

    // 1. Try Date Line & Date Variables
    const dateHit = tryDateLine(cleanRaw, scopeDates)
    if (dateHit) {
      if (dateHit.varName && RESERVED_KEYWORDS.has(dateHit.varName.toLowerCase())) {
        rendered.push({ cls: 'err', text: 'Reserved keyword' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
      if (dateHit.varName) {
        scopeDates[dateHit.varName] = {
          timestamp: dateHit.timestamp,
          isTime: dateHit.isTimeIncluded
        }
      }
      rendered.push({ cls: 'date', text: dateHit.text })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    // 2. Try Currency & Gold Line
    const currencyHit = tryCurrencyLine(cleanRaw, scope, options, lineResults, varCurrencies, lineCurrencies, prevCurrency)
    if (currencyHit) {
      if (currencyHit.varName && RESERVED_KEYWORDS.has(currencyHit.varName.toLowerCase())) {
        rendered.push({ cls: 'err', text: 'Reserved keyword' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
      if (currencyHit.varName) {
        scope[currencyHit.varName] = currencyHit.numericValue
        if (currencyHit.targetCurrency) {
          varCurrencies[currencyHit.varName] = currencyHit.targetCurrency
        }
      }
      prev = currencyHit.numericValue
      prevCurrency = currencyHit.targetCurrency
      sum += currencyHit.numericValue
      sectionSum += currencyHit.numericValue
      sectionTotalSum += currencyHit.numericValue
      sectionLineCount++
      rendered.push({ cls: 'num', text: currencyHit.text })
      lineResults.push(currencyHit.numericValue)
      lineCurrencies.push(currencyHit.targetCurrency)
      return
    }

    const { expr, symbol } = preprocess(cleanRaw, lineResults, varCurrencies, lineCurrencies, prevCurrency)
    if (expr === null) {
      rendered.push({ cls: 'empty', text: '' })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    const mVarAssign = cleanRaw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
    const assignedVarName = mVarAssign ? mVarAssign[1] : null

    if (assignedVarName && RESERVED_KEYWORDS.has(assignedVarName.toLowerCase())) {
      rendered.push({ cls: 'err', text: 'Reserved keyword' })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    try {
      scope.prev = prev === null ? 0 : prev
      scope.total = sum
      if (scope.subtotal === undefined) scope.subtotal = sectionSum
      const value = math.evaluate(expr, scope)
      const isTotalLine = /^total\s*(?:\/\/.*)?$/i.test(cleanRaw)
      let numVal = null
      if (typeof value === 'number') {
        prev = value
        numVal = value
        if (!isTotalLine) {
          sum += value
          sectionSum += value
          sectionTotalSum += value
          sectionLineCount++
        }
      } else if (value && value.isUnit) {
        numVal = typeof value.toNumeric === 'function' ? value.toNumeric() : value.value
        prev = numVal
        if (!isTotalLine) {
          sum += numVal
          sectionSum += numVal
          sectionTotalSum += numVal
          sectionLineCount++
        }
      }

      lineResults.push(numVal)

      const detectedCurr = symbol ? (normalizeCurrency(symbol) || symbol) : null
      lineCurrencies.push(detectedCurr)
      if (detectedCurr) {
        prevCurrency = detectedCurr
        if (assignedVarName) {
          varCurrencies[assignedVarName] = detectedCurr
        }
      }

      if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || (value && typeof value === 'object' && !value.isUnit && !value.isComplex && typeof value.toNumeric !== 'function')) {
        rendered.push({ cls: 'empty', text: '' })
      } else {
        const formatted = symbol ? formatValueWithSymbol(value, symbol, options) : formatValue(value, options)
        rendered.push({ cls: 'num', text: formatted })
      }
    } catch (err) {
      rendered.push({ cls: 'err', text: '—' })
      lineResults.push(null)
      lineCurrencies.push(null)
    }
  })

  if (currentSectionHeaderIdx !== null) {
    sections.push({
      headerIdx: currentSectionHeaderIdx,
      title: currentSectionTitle,
      subtotal: sectionTotalSum,
      count: sectionLineCount,
      endIdx: lines.length - 1
    })
  }

  return { rendered, sum, count: lines.filter((l) => l.trim() !== '').length, lineResults, lineCurrencies, varCurrencies, scopeDates, sections }
}

export function getFormattedCopyAllText(text, options = {}) {
  const { rendered } = evaluateAll(text, options)
  const lines = (text || '').split('\n')

  return lines.map((rawLine, idx) => {
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('//')) {
      return rawLine
    }

    const res = rendered[idx]
    if (res && res.text && res.cls !== 'empty' && res.cls !== 'err') {
      const isSimpleLiteralAssignment = /^[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*-?\d+(?:\.\d+)?\s*[$€£₺]?$/i.test(trimmed)
      if (!isSimpleLiteralAssignment) {
        return `${rawLine} = ${res.text}`
      }
    }
    return rawLine
  }).join('\n')
}
