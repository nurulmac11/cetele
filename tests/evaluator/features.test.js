import { describe, it, expect, vi, afterEach } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'
import { ratesVersion, _resetHistoricalRates } from '../../src/services/evaluator/rates.js'
import { highlightDocument } from '../../src/services/highlighter.js'

const texts = (doc) => evaluateAll(doc).rendered.map((r) => r.text)
const first = (doc) => texts(doc)[0]

function isoDaysFromToday(days) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('Date literals and date spans', () => {
  it('reads ISO and dd.mm.yyyy dates', () => {
    expect(first('2026-12-31')).toBe('Thu, Dec 31, 2026')
    expect(first('31.12.2026')).toBe('Thu, Dec 31, 2026')
    expect(first('2026-12-31 + 2 weeks')).toBe('Thu, Jan 14, 2027')
  })

  it('rejects dates that do not exist', () => {
    const [line] = evaluateAll('2026-02-30').rendered
    expect(line.cls).toBe('err')
    expect(line.error).toContain('Invalid date')
  })

  it('counts days, weeks and months until and since a date', () => {
    const in10 = isoDaysFromToday(10)
    expect(first(`days until ${in10}`)).toBe('10 days')
    expect(first(`days since ${isoDaysFromToday(-3)}`)).toBe('3 days')
    expect(first(`weeks until ${isoDaysFromToday(14)}`)).toBe('2 weeks')
    expect(first(`months until ${isoDaysFromToday(0)}`)).toBe('0 months')
  })

  it('subtracts dates held in variables', () => {
    expect(texts(`deadline = ${isoDaysFromToday(12)}\ndeadline - today`)[1]).toBe('12 days')
  })
})

describe('Temperatures and compound units', () => {
  it('converts temperatures', () => {
    expect(first('20 C to F')).toBe('68 °F')
    expect(first('20 °C to F')).toBe('68 °F')
    expect(first('98.6 F to C')).toBe('37 °C')
  })

  it('converts speeds and other compound units', () => {
    expect(first('100 km/h to mph')).toBe('62.1371 mph')
    expect(first('100 km/h to m/s')).toBe('27.7778 m/s')
    expect(first('500m/s')).toBe('500 m/s')
    expect(first('2m / 4')).toBe('500,000')
  })
})

describe('Section aggregates', () => {
  it('averages and counts the lines since the header or last subtotal', () => {
    const res = texts('=== A ===\n10 usd\n20 usd\naverage\ncount\nsubtotal\n5\navg')
    // average, count, subtotal, then after the subtotal only "5" is counted
    expect(res.slice(3)).toEqual(['15 USD', '2', '30 USD', '5', '5'])
  })

  it('keeps variables named like aggregates', () => {
    expect(texts('count = 5\ncount')).toEqual(['5', '5'])
  })

  it('still supports avg() as a function', () => {
    expect(first('avg(1, 2, 3)')).toBe('2')
  })
})

describe('Tax and finance helpers', () => {
  it('adds tax written as %20 kdv or 20% vat', () => {
    expect(first('1000 + %20 kdv')).toBe('1,200')
    expect(first('1000 + 20% vat')).toBe('1,200')
    expect(first('%18 of 500')).toBe('90')
  })

  it('computes loan payments', () => {
    expect(first('loan(250k usd, 3.5%, 30 years)')).toBe('1,122.6117 USD')
    expect(first('loan(250k, 3.5%, 360)')).toBe('1,122.6117')
    expect(first('loan(1200, 0%, 12)')).toBe('100')
    expect(first('pmt(1%, 12, 1000)')).toBe('88.8488')
  })

  it('computes compound interest', () => {
    expect(first('compound(10k, 5%, 10 years)')).toBe('16,470.095')
    expect(first('compound(1000, 10%, 1, 1)')).toBe('1,100')
  })

  it('explains wrong argument counts', () => {
    expect(evaluateAll('loan(1000, 5%)').rendered[0].error).toContain('takes 3 values')
  })
})

describe('Historical exchange rates', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    _resetHistoricalRates()
  })

  it('loads the day’s rates, then re-evaluates with them', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ date: '2025-01-01', usd: { try: 35, eur: 0.96, xau: 0.0004 } })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const before = ratesVersion.value
    const [loading] = evaluateAll('100 usd to tl @ 2025-01-01').rendered
    expect(loading.cls).toBe('pending')
    expect(loading.error).toContain('2025-01-01')

    await vi.waitFor(() => expect(ratesVersion.value).toBeGreaterThan(before))
    expect(fetchMock.mock.calls[0][0]).toContain('@2025-01-01')
    expect(first('100 usd to tl @ 2025-01-01')).toBe('3,500 TL')
    expect(first('x = 10 eur to usd @ 2025-01-01')).toBe('10.4167 USD')
  })

  it('explains dates without rates', () => {
    expect(evaluateAll('1 usd to tl @ 2020-01-01').rendered[0].error).toContain('start on')
    expect(evaluateAll('1 usd to tl @ 2999-01-01').rendered[0].error).toContain('future')
  })

  it('reports a failed download', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }))
    )
    const before = ratesVersion.value
    evaluateAll('1 usd to tl @ 2025-02-01')
    await vi.waitFor(() => expect(ratesVersion.value).toBeGreaterThan(before))
    expect(evaluateAll('1 usd to tl @ 2025-02-01').rendered[0].error).toContain("Couldn't load")
  })
})

describe('Highlighting new syntax', () => {
  it('keeps lines aligned', () => {
    const doc = 'days until 2026-12-31\n100 km/h to mph\n1000 + %20 kdv\n100 usd to tl @ 2025-01-01'
    const lines = doc.split('\n')
    highlightDocument(doc).forEach((line, i) => expect(line.tokens.map((t) => t.text).join('')).toBe(lines[i]))
  })
})
