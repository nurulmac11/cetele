import { ref } from 'vue'
import * as math from 'mathjs'

export const EXAMPLE_TEXT = `// welcome — this is a notepad calculator
// write math, it evaluates as you type

subtotal = 1,250.50
tax = 8.25% of subtotal
subtotal + tax

// direct line references (#1, L1, line1)
#1 * 2
L2 + 500
line3 / 2

// currency, gold & crypto math
m = 10,000$
plus = m * 4.2
m + plus to tl + 10000

10$ + 500 tl
1 gram gold to tl
1 btc to usd
0.5 eth to tl
100 sol + 50$

// unit conversion
5 miles to km
3 cups to ml

// percentages
20% off 89.99
increase 1,200 by 7%

// dates
today
today + 30 days

// reference the previous answer
prev / 2

// running total of every numeric line above
total`

const CACHED_RATES_KEY = 'cetele_cached_exchange_rates'

// Exchange rates relative to USD (1 USD = X currency/unit)
const GRAM_PER_TROY_OZ = 31.1034768
const USD_PER_GRAM_GOLD = 130.0
const USD_PER_TROY_OZ = USD_PER_GRAM_GOLD * GRAM_PER_TROY_OZ // ~$4,043.45 USD
const DEFAULT_XAU = 1 / USD_PER_TROY_OZ

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
  'GRAM_GOLD': 'GRAM_GOLD',
  'CEYREK_GOLD': 'CEYREK_GOLD',
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
  // Gold phrases
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:grams?|g)?\s*(?:of\s*)?(?:gold|alt[ıi]n)\b/gi, '$1 GRAM_GOLD')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:oz|ounces?)\s*(?:of\s*)?gold\b/gi, '$1 XAU')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:[çc]eyrek(?:\s*alt[ıi]n)?)\b/gi, '$1 CEYREK_GOLD')

  // Crypto phrases
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*bitcoins?\b/gi, '$1 BTC')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*ethereums?\b/gi, '$1 ETH')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*solanas?\b/gi, '$1 SOL')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*dogecoins?\b/gi, '$1 DOGE')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*tethers?\b/gi, '$1 USDT')

  return l
}

function preprocessCurrencies(line) {
  let l = normalizeGoldAndCryptoPhrases(line)
  const matches = []

  // 1. Prefix symbols ($10, ₺500, €50)
  const prefixRegex = /([$€£₺])\s*(-?\d+(?:\.\d+)?)/g
  let m
  while ((m = prefixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[1])
    if (curr) matches.push({ raw: m[0], rawSymbol: m[1], index: m.index, amount: parseFloat(m[2]), currency: curr })
  }

  // 2. Suffix symbols (10$, 500₺, 50€)
  const symbolSuffixRegex = /(-?\d+(?:\.\d+)?)\s*([$€£₺])/g
  while ((m = symbolSuffixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[2])
    if (curr) {
      const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
      if (!overlap) matches.push({ raw: m[0], rawSymbol: m[2], index: m.index, amount: parseFloat(m[1]), currency: curr })
    }
  }

  // 3. Suffix codes (100 USD, 500 TL, 1 GRAM_GOLD, 1 BTC, 0.5 ETH, 10 SOL)
  const codeSuffixRegex = /(-?\d+(?:\.\d+)?)\s*(USD|EUR|GBP|TRY|TL|CAD|AUD|JPY|INR|CHF|CNY|RMB|SAR|AED|GRAM_GOLD|CEYREK_GOLD|XAU|BTC|ETH|SOL|USDT|BNB|XRP|DOGE|ADA|AVAX)\b/gi
  while ((m = codeSuffixRegex.exec(l)) !== null) {
    const curr = normalizeCurrency(m[2])
    if (curr) {
      const overlap = matches.some(p => m.index >= p.index && m.index < p.index + p.raw.length)
      if (!overlap) matches.push({ raw: m[0], rawSymbol: m[2].toUpperCase(), index: m.index, amount: parseFloat(m[1]), currency: curr })
    }
  }

  if (matches.length === 0) return { expr: l, symbol: null }

  matches.sort((a, b) => a.index - b.index)

  const targetCurrency = matches[0].currency
  const detectedSymbol = matches[0].rawSymbol

  let resultLine = l
  for (let i = matches.length - 1; i >= 0; i--) {
    const item = matches[i]
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

export function preprocess(line, lineResults = []) {
  let l = line.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (!l) return { expr: null, symbol: null }

  l = stripCommaSeparators(l)
  l = preprocessLineReferences(l, lineResults)

  let varPrefix = ''
  let rhs = l
  const mVar = l.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mVar) {
    varPrefix = mVar[1] + ' = '
    rhs = mVar[2]
  }

  const currRes = preprocessCurrencies(rhs)
  rhs = currRes.expr
  const symbol = currRes.symbol

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

export function tryCurrencyLine(raw, scope, options = {}, lineResults = []) {
  const l = raw.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (!l) return null

  let cleanLine = stripCommaSeparators(l)
  cleanLine = preprocessLineReferences(cleanLine, lineResults)

  let varName = null
  let rhs = cleanLine
  const mVar = cleanLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mVar) {
    varName = mVar[1]
    rhs = mVar[2]
  }

  rhs = normalizeGoldAndCryptoPhrases(rhs)
  rhs = rhs.replace(/\s+to\s+gram\s*(?:of\s*)?gold\b/gi, ' to GRAM_GOLD')
  rhs = rhs.replace(/\s+to\s+(?:oz|ounce)\s*(?:of\s*)?gold\b/gi, ' to XAU')
  rhs = rhs.replace(/\s+to\s+(?:[çc]eyrek(?:\s*alt[ıi]n)?)\b/gi, ' to CEYREK_GOLD')

  const m = rhs.match(/^(.*?)\s+to\s+([$€£₺A-Za-z_]{1,12})(\s*[\+\-\*\/\^].+)?$/i)
  if (m) {
    const lhsExpr = m[1]
    const toStr = m[2]
    const tailExpr = m[3] || ''
    const toCurr = normalizeCurrency(toStr)

    if (toCurr && RATES[toCurr]) {
      let fromCurr = 'USD'
      const currMatch = lhsExpr.match(/([$€£₺]|USD|EUR|GBP|TRY|TL|CAD|AUD|JPY|INR|CHF|CNY|RMB|SAR|AED|GRAM_GOLD|CEYREK_GOLD|XAU|BTC|ETH|SOL|USDT|BNB|XRP|DOGE|ADA|AVAX)/i)
      if (currMatch) {
        const parsed = normalizeCurrency(currMatch[1])
        if (parsed) fromCurr = parsed
      }

      try {
        const { expr: processedLhs } = preprocess(lhsExpr, lineResults)
        const valLhs = math.evaluate(processedLhs, scope)
        if (typeof valLhs === 'number') {
          const usdVal = valLhs / RATES[fromCurr]
          const convertedLhs = usdVal * RATES[toCurr]

          let finalVal = convertedLhs
          if (tailExpr.trim()) {
            const { expr: processedTail } = preprocess(tailExpr, lineResults)
            const evalStr = String(convertedLhs) + ' ' + processedTail
            finalVal = math.evaluate(evalStr, scope)
          }

          const formatted = formatValueWithSymbol(finalVal, toStr, options)
          return {
            type: 'currency',
            varName,
            numericValue: finalVal,
            text: formatted
          }
        }
      } catch (e) {
        return null
      }
    }
  }

  return null
}

export function tryDateLine(raw) {
  const l = raw.replace(/^;\s*/, '').replace(/\/\/.*$/, '').trim()
  if (/^now$/i.test(l)) return { type: 'date', text: fmtDateTime(new Date()) }
  if (/^today$/i.test(l)) return { type: 'date', text: fmtDate(new Date()) }

  let m = l.match(/^today\s*([+-])\s*(\d+)\s*days?$/i)
  if (m) {
    const d = new Date()
    d.setDate(d.getDate() + (m[1] === '+' ? 1 : -1) * parseInt(m[2], 10))
    return { type: 'date', text: fmtDate(d) }
  }
  m = l.match(/^today\s*([+-])\s*(\d+)\s*weeks?$/i)
  if (m) {
    const d = new Date()
    d.setDate(d.getDate() + (m[1] === '+' ? 1 : -1) * parseInt(m[2], 10) * 7)
    return { type: 'date', text: fmtDate(d) }
  }
  m = l.match(/^today\s*([+-])\s*(\d+)\s*months?$/i)
  if (m) {
    const d = new Date()
    d.setMonth(d.getMonth() + (m[1] === '+' ? 1 : -1) * parseInt(m[2], 10))
    return { type: 'date', text: fmtDate(d) }
  }
  return null
}

function formatValueWithSymbol(val, symbol, options = {}) {
  const formattedVal = formatValue(val, options)
  if (!symbol) return formattedVal

  const s = symbol.trim().toUpperCase()
  if (['$', '€', '£', '₺', '¥', '₹'].includes(symbol.trim())) {
    return `${symbol.trim()}${formattedVal}`
  }
  if (s === 'GRAM_GOLD' || s === 'GOLD' || s === 'GRAM ALTIN') return `${formattedVal} gram gold`
  if (s === 'CEYREK_GOLD' || s === 'CEYREK') return `${formattedVal} çeyrek gold`
  if (s === 'XAU') return `${formattedVal} oz gold`

  return `${formattedVal} ${symbol.trim().toUpperCase()}`
}

export function formatValue(v, options = {}) {
  const disableFloat = typeof options === 'boolean' ? options : Boolean(options?.disableFloat)
  
  if (v === undefined || v === null) return ''
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
  return String(v)
}

export function evaluateAll(text, options = {}) {
  const _v = ratesVersion.value

  if (text === null || text === undefined) text = ''
  const lines = text.split('\n')
  const scope = { pi: Math.PI, e: Math.E }
  let prev = null
  let sum = 0
  const rendered = []
  const lineResults = []

  lines.forEach((raw) => {
    let trimmedRaw = raw.replace(/^;\s*/, '').trim()
    if (trimmedRaw === '' || trimmedRaw.startsWith('//')) {
      rendered.push({ cls: 'empty', text: '' })
      lineResults.push(null)
      return
    }

    const cleanRaw = stripCommaSeparators(trimmedRaw)

    const currencyHit = tryCurrencyLine(cleanRaw, scope, options, lineResults)
    if (currencyHit) {
      if (currencyHit.varName) {
        scope[currencyHit.varName] = currencyHit.numericValue
      }
      prev = currencyHit.numericValue
      sum += currencyHit.numericValue
      rendered.push({ cls: 'num', text: currencyHit.text })
      lineResults.push(currencyHit.numericValue)
      return
    }

    const dateHit = tryDateLine(cleanRaw)
    if (dateHit) {
      rendered.push({ cls: 'date', text: dateHit.text })
      lineResults.push(null)
      return
    }

    const { expr, symbol } = preprocess(cleanRaw, lineResults)
    if (expr === null) {
      rendered.push({ cls: 'empty', text: '' })
      lineResults.push(null)
      return
    }

    try {
      scope.prev = prev === null ? 0 : prev
      scope.total = sum
      const value = math.evaluate(expr, scope)
      let numVal = null
      if (typeof value === 'number') {
        prev = value
        sum += value
        numVal = value
      } else if (value && value.isUnit) {
        numVal = typeof value.toNumeric === 'function' ? value.toNumeric() : value.value
        prev = numVal
        sum += numVal
      }

      lineResults.push(numVal)

      if (value === undefined) {
        rendered.push({ cls: 'empty', text: '' })
      } else {
        const formatted = symbol ? formatValueWithSymbol(value, symbol, options) : formatValue(value, options)
        rendered.push({ cls: 'num', text: formatted })
      }
    } catch (err) {
      rendered.push({ cls: 'err', text: '—' })
      lineResults.push(null)
    }
  })

  return { rendered, sum, count: lines.filter((l) => l.trim() !== '').length, lineResults }
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
