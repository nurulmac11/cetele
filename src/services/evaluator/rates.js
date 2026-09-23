import { ref } from 'vue'

const CACHED_RATES_KEY = 'cetele_cached_exchange_rates'

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

export const CURRENCY_MAP = {
  '$': '$',
  'USD': 'USD',
  'DOLLAR': 'USD',
  'DOLLARS': 'USD',
  '€': '€',
  'EUR': 'EUR',
  'EURO': 'EUR',
  'EUROS': 'EUR',
  '£': '£',
  'GBP': 'GBP',
  'POUND': 'GBP',
  'POUNDS': 'GBP',
  '₺': '₺',
  'TL': 'TL',
  'TRY': 'TRY',
  'LIRA': 'TL',
  'TLIRA': 'TL',
  '¥': '¥',
  'JPY': 'JPY',
  'YEN': 'JPY',
  '₹': '₹',
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
  'GOLD': 'GRAM_GOLD',
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

// Codes recognised in any letter case; other live-feed codes must be written in capitals
export const CORE_CURRENCY_CODES = new Set([...Object.keys(RATES), 'TL'])

const CRYPTO_AND_GOLD_CODES = ['XAU', 'BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX']

export const ratesVersion = ref(1)
// When rates last came from the network (ms), or null while only defaults are in use
export const ratesUpdatedAt = ref(null)

export function updateDerivedRates() {
  RATES.TL = RATES.TRY
  const xauRate = RATES.XAU || DEFAULT_XAU
  RATES.GRAM_GOLD = xauRate * GRAM_PER_TROY_OZ
  RATES.CEYREK_GOLD = RATES.GRAM_GOLD / 1.75
}

updateDerivedRates()

// Prototype pollution-safe rate assignment helper.
// Accepts known keys plus any 3-letter ISO code, so every currency the feed offers works.
function safeAssignRates(target, source, { onlyKeys = null } = {}) {
  if (!source || typeof source !== 'object') return
  const forbidden = new Set(['__proto__', 'constructor', 'prototype'])
  for (const rawKey of Object.keys(source)) {
    const key = rawKey.toUpperCase()
    if (forbidden.has(rawKey) || forbidden.has(key)) continue
    if (onlyKeys && !onlyKeys.includes(key)) continue
    const isKnown = Object.prototype.hasOwnProperty.call(target, key) || Object.prototype.hasOwnProperty.call(CURRENCY_MAP, key)
    if (isKnown || /^[A-Z]{3}$/.test(key)) {
      const val = source[rawKey]
      if (typeof val === 'number' && Number.isFinite(val) && val > 0) {
        target[key] = val
      }
    }
  }
}

export function initCachedRates() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHED_RATES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        // Newer caches store { rates, updatedAt }; older ones stored the rates object directly
        const cachedRates = parsed.rates && typeof parsed.rates === 'object' ? parsed.rates : parsed
        safeAssignRates(RATES, cachedRates)
        updateDerivedRates()
        if (Number.isFinite(parsed.updatedAt)) ratesUpdatedAt.value = parsed.updatedAt
      }
    }
  } catch (e) {}
}

initCachedRates()

const FETCH_TIMEOUT_MS = 8000

async function fetchJson(url) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null
  try {
    const res = await fetch(url, controller ? { signal: controller.signal } : undefined)
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchLiveExchangeRates() {
  // Both feeds are quoted as units per 1 USD, the same shape as RATES.
  // They load in parallel, and one failing doesn't block the other.
  const [fiat, usdFeed] = await Promise.allSettled([
    fetchJson('https://open.er-api.com/v6/latest/USD'),
    fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
  ])

  let updated = false
  if (usdFeed.status === 'fulfilled' && usdFeed.value?.usd) {
    // Gold and crypto always come from this feed; its fiat rates are a fallback
    safeAssignRates(RATES, usdFeed.value.usd, { onlyKeys: CRYPTO_AND_GOLD_CODES })
    if (fiat.status !== 'fulfilled') safeAssignRates(RATES, usdFeed.value.usd)
    updated = true
  }
  if (fiat.status === 'fulfilled' && fiat.value?.rates) {
    safeAssignRates(RATES, fiat.value.rates)
    updated = true
  }

  if (!updated) {
    console.warn('Could not fetch live exchange rates, using cached rates:', fiat.reason || usdFeed.reason)
    return
  }

  updateDerivedRates()
  ratesUpdatedAt.value = Date.now()
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHED_RATES_KEY, JSON.stringify({ rates: RATES, updatedAt: ratesUpdatedAt.value }))
    } catch (e) {}
  }
  ratesVersion.value++
}

// Gate background fetching on browser window environment and non-test mode
if (typeof window !== 'undefined' && (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')) {
  fetchLiveExchangeRates()
}


export function getBaseCurrencyCode(curr) {
  if (!curr) return null
  if (curr === '$') return 'USD'
  if (curr === '€') return 'EUR'
  if (curr === '£') return 'GBP'
  if (curr === '₺' || curr === 'TL') return 'TRY'
  if (curr === '¥') return 'JPY'
  if (curr === '₹') return 'INR'
  return curr
}

export function normalizeCurrency(str) {
  if (!str) return null
  const s = str.trim().toUpperCase()
  return CURRENCY_MAP[s] || (RATES[s] ? s : null)
}

// Converts an amount between currencies (codes or symbols). Returns null when a rate is missing.
export function convertCurrency(amount, from, to) {
  const baseFrom = getBaseCurrencyCode(from)
  const baseTo = getBaseCurrencyCode(to)
  if (!baseFrom || !baseTo || baseFrom === baseTo) return amount
  if (!RATES[baseFrom] || !RATES[baseTo]) return null
  return (amount / RATES[baseFrom]) * RATES[baseTo]
}
