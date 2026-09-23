import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

const texts = (doc) => evaluateAll(doc).rendered.map((r) => r.text)
const first = (doc) => texts(doc)[0]
const errorOf = (doc) => evaluateAll(doc).rendered[0].error

// Bugs found in the second project review
describe('Evaluator Engine - second review fixes', () => {
  it('reads powered units like m^2 as units, not millions', () => {
    expect(first('sqrt(16 m^2)')).toBe('4 m')
    expect(first('16m^2')).toBe('16 m^2')
    expect(first('3 ft^2 to m^2')).toBe('0.2787 m^2')
    expect(first('10 cm^3 to ml')).toBe('10 ml')
    expect(first('2m')).toBe('2,000,000')
  })

  it('treats Turkish İ and I like i in variable names', () => {
    expect(texts('İstanbul = 5\nistanbul')).toEqual(['5', '5'])
    expect(texts('Istanbul = 5\nİSTANBUL')).toEqual(['5', '5'])
    expect(texts('ı = 1\nı + 1')).toEqual(['1', '2'])
  })

  it('keeps month and year arithmetic inside the target month', () => {
    expect(first('2026-01-31 + 1 month')).toBe('Sat, Feb 28, 2026')
    expect(first('2026-03-31 - 1 month')).toBe('Sat, Feb 28, 2026')
    expect(first('2024-02-29 + 1 year')).toBe('Fri, Feb 28, 2025')
    expect(first('2026-01-15 + 1 month')).toBe('Sun, Feb 15, 2026')
  })

  it('puts the minus sign before prefix currency symbols', () => {
    expect(first('-$5')).toBe('-$5')
    expect(first('$5 - $10')).toBe('-$5')
    expect(first('-€2.5')).toBe('-€2.5')
  })

  it('gives a plain ratio when dividing money by money', () => {
    expect(first('10 usd / 2 usd')).toBe('5')
    expect(first('10 usd / 2')).toBe('5 USD')
  })

  it('explains unit mistakes in plain language', () => {
    expect(errorOf('5 mins + 10')).toBe("Can't add a plain number and minutes; give the number a unit")
    expect(errorOf('10 - 5 km')).toContain("Can't subtract")
    expect(errorOf('5 kg + 3 m')).toBe("Units don't match: kg and m")
  })

  it('uses singular and plural unit names', () => {
    expect(first('1 hour + 30 min')).toBe('1.5 hours')
    expect(first('1 day')).toBe('1 day')
    expect(first('1 days')).toBe('1 day')
    expect(first('2 hour')).toBe('2 hours')
  })

  it('combines repeated units', () => {
    expect(first('5 kg * 2 kg')).toBe('10 kg^2')
  })

  it('refuses currency names as variable names', () => {
    expect(errorOf('usd = 5')).toContain('"usd" is a currency name')
    expect(errorOf('$ = 5')).toContain('currency name')
  })
})
