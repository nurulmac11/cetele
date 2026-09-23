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
  CEYREK_GOLD: 1 / USD_PER_GRAM_GOLD / 1.75,
  BTC: 1 / 65400,
  ETH: 1 / 3450,
  SOL: 1 / 185,
  USDT: 1.0,
  BNB: 1 / 580,
  XRP: 1 / 0.6,
  DOGE: 1 / 0.13,
  ADA: 1 / 0.42,
  AVAX: 1 / 28.5
}

export const CURRENCY_MAP = {
  $: '$',
  USD: 'USD',
  DOLLAR: 'USD',
  DOLLARS: 'USD',
  '€': '€',
  EUR: 'EUR',
  EURO: 'EUR',
  EUROS: 'EUR',
  '£': '£',
  GBP: 'GBP',
  POUND: 'GBP',
  POUNDS: 'GBP',
  '₺': '₺',
  TL: 'TL',
  TRY: 'TRY',
  LIRA: 'TL',
  TLIRA: 'TL',
  '¥': '¥',
  JPY: 'JPY',
  YEN: 'JPY',
  '₹': '₹',
  INR: 'INR',
  RUPEE: 'INR',
  CAD: 'CAD',
  AUD: 'AUD',
  CHF: 'CHF',
  CNY: 'CNY',
  RMB: 'CNY',
  SAR: 'SAR',
  AED: 'AED',
  RUB: 'RUB',
  BRL: 'BRL',
  SEK: 'SEK',
  NZD: 'NZD',
  XAU: 'XAU',
  OZ_GOLD: 'XAU',
  OUNCE_GOLD: 'XAU',
  GRAM_GOLD: 'GRAM_GOLD',
  GRAM_ALTIN: 'GRAM_GOLD',
  ALTIN: 'GRAM_GOLD',
  GOLD: 'GRAM_GOLD',
  CEYREK_GOLD: 'CEYREK_GOLD',
  CEYREK_ALTIN: 'CEYREK_GOLD',
  CEYREK: 'CEYREK_GOLD',
  ÇEYREK: 'CEYREK_GOLD',
  BTC: 'BTC',
  BITCOIN: 'BTC',
  ETH: 'ETH',
  ETHEREUM: 'ETH',
  SOL: 'SOL',
  SOLANA: 'SOL',
  USDT: 'USDT',
  TETHER: 'USDT',
  BNB: 'BNB',
  XRP: 'XRP',
  DOGE: 'DOGE',
  DOGECOIN: 'DOGE',
  ADA: 'ADA',
  CARDANO: 'ADA',
  AVAX: 'AVAX'
}

// Codes recognised in any letter case; other live-feed codes must be written in capitals
export const CORE_CURRENCY_CODES = new Set([...Object.keys(RATES), 'TL'])

const CRYPTO_AND_GOLD_CODES = ['XAU', 'BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX']

export const ratesVersion = ref(1)
// When rates last came from the network (ms), or null while only defaults are in use
export const ratesUpdatedAt = ref(null)

// Fills in rates computed from others (TL alias, gram and çeyrek gold from XAU)
// Gold is only derived when the table has an XAU price: older historical rates have none,
// and a made-up gold price would be silently wrong.
function deriveRates(rates) {
  if (rates.TRY) rates.TL = rates.TRY
  if (rates.XAU) {
    rates.GRAM_GOLD = rates.XAU * GRAM_PER_TROY_OZ
    rates.CEYREK_GOLD = rates.GRAM_GOLD / 1.75
  }
}

export function updateDerivedRates() {
  if (!RATES.XAU) RATES.XAU = DEFAULT_XAU
  deriveRates(RATES)
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
    const isKnown =
      Object.prototype.hasOwnProperty.call(target, key) || Object.prototype.hasOwnProperty.call(CURRENCY_MAP, key)
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
if (typeof window !== 'undefined' && import.meta.env?.MODE !== 'test') {
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

// Converts an amount between currencies (codes or symbols) using the given rate table.
// Returns null when a rate is missing.
export function convertCurrency(amount, from, to, rates = RATES) {
  const baseFrom = getBaseCurrencyCode(from)
  const baseTo = getBaseCurrencyCode(to)
  if (!baseFrom || !baseTo || baseFrom === baseTo) return amount
  if (!rates[baseFrom] || !rates[baseTo]) return null
  return (amount / rates[baseFrom]) * rates[baseTo]
}

// --- Historical rates (100 usd to tl @ 2025-01-01) ---
//
// Two sources, both quoted per 1 USD like RATES:
// - fawazahmed0 currency-api: every currency plus gold and crypto, from 2024-03-02
// - Frankfurter (European Central Bank): about 30 major currencies, from 1999-01-04,
//   business days only (a weekend or holiday gives the previous business day)

export const HISTORICAL_RATES_START = '1999-01-04'
export const FULL_HISTORICAL_RATES_START = '2024-03-02'
const HISTORICAL_CACHE_PREFIX = 'cetele_historical_rates_v2_'
const HISTORICAL_CACHE_INDEX = 'cetele_historical_rates_index'

// Limits, so a document (for example one opened from a share link) with thousands of different
// "@ date" lines can't make thousands of requests or fill up localStorage
const MAX_CONCURRENT_DOWNLOADS = 3
export const MAX_HISTORICAL_DOWNLOADS_PER_PAGE = 50
const MAX_CACHED_DAYS = 100

// dateKey -> { rates, effectiveDate, coverage } | { loading: true } | { error }
const historicalRates = new Map()

export function toDateKey(timestamp) {
  const d = new Date(timestamp)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function cleanRates(source) {
  const rates = {}
  for (const [rawKey, val] of Object.entries(source || {})) {
    const key = rawKey.toUpperCase()
    if (key === '__PROTO__' || key === 'CONSTRUCTOR' || key === 'PROTOTYPE') continue
    const isKnown = Object.prototype.hasOwnProperty.call(RATES, key) || CRYPTO_AND_GOLD_CODES.includes(key)
    if ((isKnown || /^[A-Z]{3}$/.test(key)) && typeof val === 'number' && Number.isFinite(val) && val > 0) {
      rates[key] = val
    }
  }
  rates.USD = 1
  deriveRates(rates)
  return rates
}

async function fromCurrencyApi(url, dateKey) {
  const data = await fetchJson(url)
  if (!data?.usd) throw new Error('Unexpected response')
  return { rates: cleanRates(data.usd), effectiveDate: data.date || dateKey, coverage: 'full' }
}

async function fromFrankfurter(dateKey) {
  const data = await fetchJson(`https://api.frankfurter.dev/v1/${dateKey}?base=USD`)
  if (!data?.rates) throw new Error('Unexpected response')
  return { rates: cleanRates(data.rates), effectiveDate: data.date || dateKey, coverage: 'major' }
}

function readCachedDay(dateKey) {
  try {
    const cached = JSON.parse(localStorage.getItem(HISTORICAL_CACHE_PREFIX + dateKey) || 'null')
    return cached?.rates ? cached : null
  } catch (e) {
    return null
  }
}

// Stores a day and keeps only the MAX_CACHED_DAYS most recently stored days
function writeCachedDay(dateKey, result) {
  try {
    const index = JSON.parse(localStorage.getItem(HISTORICAL_CACHE_INDEX) || '[]').filter((k) => k !== dateKey)
    index.push(dateKey)
    while (index.length > MAX_CACHED_DAYS) localStorage.removeItem(HISTORICAL_CACHE_PREFIX + index.shift())
    localStorage.setItem(HISTORICAL_CACHE_PREFIX + dateKey, JSON.stringify(result))
    localStorage.setItem(HISTORICAL_CACHE_INDEX, JSON.stringify(index))
  } catch (e) {}
}

// Runs downloads a few at a time
let activeDownloads = 0
const downloadQueue = []
let downloadsThisPage = 0

function withDownloadSlot(task) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeDownloads++
      task()
        .then(resolve, reject)
        .finally(() => {
          activeDownloads--
          downloadQueue.shift()?.()
        })
    }
    if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) run()
    else downloadQueue.push(run)
  })
}

async function loadHistoricalRates(dateKey) {
  const sources =
    dateKey >= FULL_HISTORICAL_RATES_START
      ? [
          () =>
            fromCurrencyApi(
              `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateKey}/v1/currencies/usd.json`,
              dateKey
            ),
          () => fromCurrencyApi(`https://${dateKey}.currency-api.pages.dev/v1/currencies/usd.json`, dateKey),
          // Major currencies only, but better than nothing if the full feed is down
          () => fromFrankfurter(dateKey)
        ]
      : [() => fromFrankfurter(dateKey)]

  let lastError = null
  for (const load of sources) {
    try {
      const result = await load()
      writeCachedDay(dateKey, result)
      return result
    } catch (err) {
      lastError = err
    }
  }
  throw lastError || new Error('No rates')
}

/**
 * Exchange rates for a past day. Returns { rates, effectiveDate, coverage } when available,
 * { loading: true } while the first request is in flight (ratesVersion is bumped when it
 * finishes, re-running evaluation), or { error } with a message for the result row.
 * coverage is 'full' (all currencies, gold, crypto) or 'major' (about 30 major currencies).
 */
export function getHistoricalRates(timestamp) {
  const dateKey = toDateKey(timestamp)
  if (dateKey < HISTORICAL_RATES_START) {
    return { error: `Historical rates start on ${HISTORICAL_RATES_START}` }
  }
  if (dateKey > toDateKey(Date.now())) {
    return { error: 'No exchange rates for future dates' }
  }

  const known = historicalRates.get(dateKey)
  if (known) return known

  // Past days never change, so a cached copy is final and costs no request
  const cached = readCachedDay(dateKey)
  if (cached) {
    historicalRates.set(dateKey, cached)
    return cached
  }

  if (downloadsThisPage >= MAX_HISTORICAL_DOWNLOADS_PER_PAGE) {
    return {
      error: `Too many different dates on this page (limit ${MAX_HISTORICAL_DOWNLOADS_PER_PAGE} downloads); reload to load more`
    }
  }
  downloadsThisPage++

  historicalRates.set(dateKey, { loading: true })
  withDownloadSlot(() => loadHistoricalRates(dateKey))
    .then((result) => historicalRates.set(dateKey, result))
    .catch(() => {
      // Forget the failure after a minute so it can be retried (e.g. back online)
      historicalRates.set(dateKey, { error: `Couldn't load exchange rates for ${dateKey}` })
      setTimeout(() => historicalRates.delete(dateKey), 60000)
    })
    .finally(() => {
      ratesVersion.value++
    })
  return { loading: true }
}

// For tests
export function _resetHistoricalRates() {
  historicalRates.clear()
  downloadsThisPage = 0
}
