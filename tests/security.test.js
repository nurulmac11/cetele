import { describe, it, expect, vi, afterEach } from 'vitest'
import { evaluateAll } from '../src/services/evaluator.js'
import { highlightDocument } from '../src/services/highlighter.js'
import {
  getHistoricalRates,
  ratesVersion,
  _resetHistoricalRates,
  MAX_HISTORICAL_DOWNLOADS_PER_PAGE
} from '../src/services/evaluator/rates.js'

// Documents can come from share links, so none of this may hang, crash or misbehave
describe('Untrusted documents', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    _resetHistoricalRates()
  })

  it('lexes very long lines in linear time', () => {
    for (const line of ['gram '.repeat(50_000), '/**/ '.repeat(50_000) + '1', 'line1 + '.repeat(20_000) + '1']) {
      const start = performance.now()
      evaluateAll(line)
      expect(performance.now() - start).toBeLessThan(500)
    }
  })

  it('highlights a huge padded header line in linear time', () => {
    const line = '=== ' + ' '.repeat(500_000) + 'x' + ' '.repeat(500_000) + '=== y'
    const start = performance.now()
    const [highlighted] = highlightDocument(line)
    expect(performance.now() - start).toBeLessThan(500)
    expect(highlighted.tokens.map((t) => t.text).join('')).toBe(line)
  })

  it('still splits normal headers into their parts', () => {
    const [line] = highlightDocument('  // ===  Income  ===  ')
    expect(line.tokens.map((t) => [t.cls, t.text])).toEqual([
      ['tok-code', '  // '],
      ['tok-header-line', '===  '],
      ['tok-header-title', 'Income'],
      ['tok-header-line', '  ==='],
      ['tok-code', '  ']
    ])
  })

  it('rejects deep nesting quickly instead of overflowing the stack', () => {
    for (const line of [
      '('.repeat(50_000) + '1' + ')'.repeat(50_000),
      '-'.repeat(50_000) + '1',
      '2^'.repeat(20_000) + '2'
    ]) {
      const start = performance.now()
      const [res] = evaluateAll(line).rendered
      expect(performance.now() - start).toBeLessThan(500)
      expect(res.cls).toBe('err')
      expect(res.error).toContain('Too deeply nested')
    }
    expect(evaluateAll('((((1 + 2))))').rendered[0].text).toBe('3')
    expect(evaluateAll('1 + '.repeat(50_000) + '1').rendered[0].error).toBe('This line is too long to evaluate')
  })

  it('treats JavaScript built-in names as ordinary words', () => {
    expect(evaluateAll('constructor').rendered[0].error).toContain('Unknown identifier')
    expect(evaluateAll('toString * 2').rendered[0].error).toContain('Unknown identifier')
    expect(evaluateAll('5 constructor').rendered[0].cls).toBe('err')
    expect(evaluateAll('constructor(1)').rendered[0].error).toContain('Unknown function')
    const res = evaluateAll('__proto__ = 5 km\nconstructor = 3\n__proto__ to m\nconstructor * 2').rendered
    expect(res.map((r) => r.text)).toEqual(['5 km', '3', '5,000 m', '6'])
    expect({}.constructor).toBe(Object) // nothing global changed
  })

  it('limits how many historical-rate downloads one page can start', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ date: 'x', rates: { TRY: 1 } }) }))
    vi.stubGlobal('fetch', fetchMock)
    const results = []
    const day = new Date(2001, 0, 1)
    for (let i = 0; i < MAX_HISTORICAL_DOWNLOADS_PER_PAGE + 20; i++) {
      day.setDate(day.getDate() + 1)
      results.push(getHistoricalRates(day.getTime()))
    }
    expect(results.filter((r) => r.loading)).toHaveLength(MAX_HISTORICAL_DOWNLOADS_PER_PAGE)
    expect(results.at(-1).error).toContain('Too many different dates')

    // At most 3 requests run at once
    await Promise.resolve()
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3)
    const before = ratesVersion.value
    await vi.waitFor(() => expect(ratesVersion.value - before).toBe(MAX_HISTORICAL_DOWNLOADS_PER_PAGE))
    expect(fetchMock).toHaveBeenCalledTimes(MAX_HISTORICAL_DOWNLOADS_PER_PAGE)
  })
})
