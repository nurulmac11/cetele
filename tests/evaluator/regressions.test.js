import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'
import { RATES } from '../../src/services/evaluator/rates.js'

const texts = (doc) => evaluateAll(doc).rendered.map((r) => r.text)
const first = (doc) => texts(doc)[0]

describe('Evaluator Engine - Regressions', () => {
  it('keeps the currency in totals and converts mixed currencies into it', () => {
    const res = evaluateAll('10$\n500 tl\ntotal')
    const expected = 10 + 500 / RATES.TRY
    expect(res.sumCurrency).toBe('$')
    expect(res.sum).toBeCloseTo(expected, 6)
    expect(res.rendered[2].text.startsWith('$')).toBe(true)
  })

  it('keeps the currency in subtotals and section summaries', () => {
    const res = evaluateAll('=== Costs ===\nrent = 1000 usd\nfood = 200 usd\nsubtotal')
    expect(res.rendered[3].text).toBe('1,200 USD')
    expect(res.sections[0].subtotalText).toBe('1,200 USD')
  })

  it('treats gram as a unit unless it is gram gold', () => {
    expect(first('500 gram to kg')).toBe('0.5 kg')
    expect(first('1 gram gold to tl')).toContain('TL')
  })

  it('reads m as metres in unit expressions and million elsewhere', () => {
    expect(first('500m to km')).toBe('0.5 km')
    expect(first('5 m + 3 cm')).toBe('5.03 m')
    expect(first('2m')).toBe('2,000,000')
  })

  it('accepts Turkish letters in variable names and currency words', () => {
    expect(texts('maaş = 5\nmaa = 1\nmaaş * 2')).toEqual(['5', '1', '10'])
    expect(first('1 altın to tl')).toContain('TL')
    expect(first('1 çeyrek to tl')).toContain('TL')
  })

  it('treats variable names case-insensitively', () => {
    expect(texts('Rent = 5\nrent * 2')).toEqual(['5', '10'])
  })

  it('reads % before + or - as a percent, not modulo', () => {
    expect(first('10% + 5')).toBe('5.1')
    expect(first('10 % 3')).toBe('1')
  })

  it('supports percent of variables and percent change on variables', () => {
    expect(texts('x = 10\nx% of 200')).toEqual(['10', '20'])
    expect(texts('a = 50\na + 10%')).toEqual(['50', '55'])
  })

  it('supports signed exponents and scientific notation', () => {
    expect(first('2^-1')).toBe('0.5')
    expect(first('-2^2')).toBe('-4')
    expect(first('1e3')).toBe('1,000')
    expect(first('2.5e-1')).toBe('0.25')
  })

  it('supports × and ÷ signs', () => {
    expect(first('3 × 4 ÷ 2')).toBe('6')
  })

  it('reports errors for unknown conversion targets and functions', () => {
    const res = evaluateAll('5 to foo\nfoo(3)\nsqrt(-1)')
    expect(res.rendered.map((r) => r.cls)).toEqual(['err', 'err', 'err'])
    expect(res.rendered[0].error).toContain('foo')
  })

  it('keeps the currency through functions like round', () => {
    expect(first('round(10.567$)')).toBe('$11')
    expect(first('round(2.567, 2)')).toBe('2.57')
  })

  it('keeps dates as dates through prev, variables and line references', () => {
    const res = evaluateAll('start = today\nprev + 2 days\nend = start + 3 days\nend - start\n#1 + 5')
    expect(res.rendered[1].cls).toBe('date')
    expect(res.rendered[3].text).toBe('3 days')
    expect(res.rendered[4].cls).toBe('err')
  })

  it('hides float noise in results', () => {
    expect(first('0.1 + 0.2')).toBe('0.3')
  })
})
