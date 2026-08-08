import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Number Multiplier Suffixes (k, m, b, t)', () => {
  it('handles standard suffix multipliers (k, m, b, t)', () => {
    expect(evaluateAll('500k').rendered[0].text).toBe('500,000')
    expect(evaluateAll('2m').rendered[0].text).toBe('2,000,000')
    expect(evaluateAll('1.5b').rendered[0].text).toBe('1,500,000,000')
    expect(evaluateAll('3.2t').rendered[0].text).toBe('3,200,000,000,000')
  })

  it('handles uppercase suffix multipliers (K, M, B, T)', () => {
    expect(evaluateAll('500K').rendered[0].text).toBe('500,000')
    expect(evaluateAll('2M').rendered[0].text).toBe('2,000,000')
    expect(evaluateAll('1.5B').rendered[0].text).toBe('1,500,000,000')
    expect(evaluateAll('3.2T').rendered[0].text).toBe('3,200,000,000,000')
  })

  it('handles decimal multipliers (0.5k, 1.25m, 0.05b)', () => {
    expect(evaluateAll('0.5k').rendered[0].text).toBe('500')
    expect(evaluateAll('1.25m').rendered[0].text).toBe('1,250,000')
    expect(evaluateAll('0.05b').rendered[0].text).toBe('50,000,000')
  })

  it('handles currency combined with multiplier suffixes ($500k, 500k usd, 500k tl, 500k$)', () => {
    expect(evaluateAll('$500k').rendered[0].text).toBe('$500,000')
    expect(evaluateAll('500k$').rendered[0].text).toBe('$500,000')
    expect(evaluateAll('500k usd').rendered[0].text).toBe('500,000 USD')
    expect(evaluateAll('500k tl').rendered[0].text).toBe('500,000 TL')
    expect(evaluateAll('€2.5m').rendered[0].text).toBe('€2,500,000')
  })

  it('handles arithmetic with multiplier suffixes (500k + 2m, 500k * 2)', () => {
    expect(evaluateAll('500k + 2m').rendered[0].text).toBe('2,500,000')
    expect(evaluateAll('500k * 2').rendered[0].text).toBe('1,000,000')
    expect(evaluateAll('2m / 4').rendered[0].text).toBe('500,000')
  })

  it('handles percentage arithmetic with multipliers (10% of 500k, 20% off 2m, increase 500k by 10%)', () => {
    expect(evaluateAll('10% of 500k').rendered[0].text).toBe('50,000')
    expect(evaluateAll('20% off 2m').rendered[0].text).toBe('1,600,000')
    expect(evaluateAll('increase 500k by 10%').rendered[0].text).toBe('550,000')
  })

  it('handles variable assignment and subtotals with multipliers', () => {
    const input = `salary = 500k
bonus = 50k
subtotal`
    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toBe('500,000')
    expect(rendered[1].text).toBe('50,000')
    expect(rendered[2].text).toBe('550,000')
  })

  it('handles spaced multipliers (500 k, 2 m, 1.5 b)', () => {
    expect(evaluateAll('500 k').rendered[0].text).toBe('500,000')
    expect(evaluateAll('2 m').rendered[0].text).toBe('2,000,000')
    expect(evaluateAll('1.5 b').rendered[0].text).toBe('1,500,000,000')
  })

  it('does NOT misinterpret multi-letter units or keywords as multipliers (500km, 500kg, 500cad, 3 mins)', () => {
    expect(evaluateAll('500km').rendered[0].text).toBe('500 km')
    expect(evaluateAll('500kg').rendered[0].text).toBe('500 kg')
    expect(evaluateAll('500cad').rendered[0].text).toBe('500 CAD')
    expect(evaluateAll('now + 3 mins').rendered[0].text).not.toBe('—')
  })

  it('preserves unit conversions like 500 m to km', () => {
    expect(evaluateAll('500 m to km').rendered[0].text).toBe('0.5 km')
  })
})
