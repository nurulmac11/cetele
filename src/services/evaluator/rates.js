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

export const ratesVersion = ref(1)

export function updateDerivedRates() {
  RATES.TL = RATES.TRY
  const xauRate = RATES.XAU || DEFAULT_XAU
  RATES.GRAM_GOLD = xauRate * GRAM_PER_TROY_OZ
  RATES.CEYREK_GOLD = RATES.GRAM_GOLD / 1.75
}

updateDerivedRates()

// Prototype pollution-safe rate assignment helper
function safeAssignRates(target, source) {
  if (!source || typeof source !== 'object') return
  const forbidden = new Set(['__proto__', 'constructor', 'prototype'])
  for (const key of Object.keys(source)) {
    if (forbidden.has(key)) continue
    if (Object.prototype.hasOwnProperty.call(target, key) || Object.prototype.hasOwnProperty.call(CURRENCY_MAP, key)) {
      const val = source[key]
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
        safeAssignRates(RATES, parsed)
        updateDerivedRates()
      }
    }
  } catch (e) {}
}

initCachedRates()

export async function fetchLiveExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (res.ok) {
      const data = await res.json()
      if (data && data.rates) {
        safeAssignRates(RATES, data.rates)
        updateDerivedRates()
      }
    }

    try {
      const resGold = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json')
      if (resGold.ok) {
        const goldData = await resGold.json()
        const usdPerOz = goldData?.xau?.usd || goldData?.xau?.bmd
        if (usdPerOz && usdPerOz > 0 && Number.isFinite(usdPerOz)) {
          RATES.XAU = 1 / usdPerOz
          updateDerivedRates()
        }
      }
    } catch (gErr) {}

    try {
      const resBtc = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/btc.json')
      if (resBtc.ok) {
        const btcData = await resBtc.json()
        if (btcData?.btc?.usd && Number.isFinite(btcData.btc.usd)) RATES.BTC = 1 / btcData.btc.usd
      }

      const resEth = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eth.json')
      if (resEth.ok) {
        const ethData = await resEth.json()
        if (ethData?.eth?.usd && Number.isFinite(ethData.eth.usd)) RATES.ETH = 1 / ethData.eth.usd
      }

      const resSol = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/sol.json')
      if (resSol.ok) {
        const solData = await resSol.json()
        if (solData?.sol?.usd && Number.isFinite(solData.sol.usd)) RATES.SOL = 1 / solData.sol.usd
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

// Gate background fetching on browser window environment and non-test mode
if (typeof window !== 'undefined' && (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test')) {
  fetchLiveExchangeRates()
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
