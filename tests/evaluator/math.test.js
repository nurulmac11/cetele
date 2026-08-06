import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Math & Line References', () => {
  it('evaluates basic math expressions and running total', () => {
    const input = `base = 100
tax = 10
base + tax
total`

    const { rendered, sum } = evaluateAll(input)
    expect(rendered[0].text).toBe('100')
    expect(rendered[1].text).toBe('10')
    expect(rendered[2].text).toBe('110')
    expect(rendered[3].text).toBe('220')
    expect(sum).toBe(220)
  })

  it('handles line references (#1, L1, line1, prev)', () => {
    const input = `100
200
#1 + #2
L3 * 2
prev / 2`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toBe('100')
    expect(rendered[1].text).toBe('200')
    expect(rendered[2].text).toBe('300')
    expect(rendered[3].text).toBe('600')
    expect(rendered[4].text).toBe('300')
  })

  it('handles percentage arithmetic', () => {
    const input = `20% off 100
increase 1000 by 10%`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toBe('80')
    expect(rendered[1].text).toBe('1,100')
  })

  it('prevents reserved keywords from being assigned and suppresses JS function output', () => {
    expect(evaluateAll('to').rendered[0].text).toBe('')
    expect(evaluateAll('sin').rendered[0].text).toBe('')
    expect(evaluateAll('to = 5').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('prev = 100').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('in = 20').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('subtotal = 300').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('val = 500').rendered[0].text).toBe('500')
  })

  it('correctly evaluates parenthesized expressions and arbitrary recursive nesting', () => {
    expect(evaluateAll('(1 $ to tl) + 5').rendered[0].text).toBe('52.5 TL')
    expect(evaluateAll('((1$ to tl) + 5) + 1').rendered[0].text).toBe('53.5 TL')
    expect(evaluateAll('(1$ to tl) + 5 to usd').rendered[0].text).toContain('USD')
    expect(evaluateAll('(((10$ to tl) + 5) * 2) + 10').rendered[0].text).toBe('970 TL')
    expect(evaluateAll('5 + (1 $ to tl)').rendered[0].text).toBe('52.5 TL')
    expect(evaluateAll('(100 $ to eur) * 2').rendered[0].text).toBe('184 EUR')
  })

  it('preserves NaN without coercing to 0', () => {
    const res = evaluateAll('0 / 0')
    expect(res.lineResults[0]).toBeNaN()
    expect(res.rendered[0].text).toBe('—')
  })
})
