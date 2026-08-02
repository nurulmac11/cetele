import { describe, it, expect } from 'vitest'
import { evaluateAll, getFormattedCopyAllText } from '../src/services/evaluator.js'
import { encodeSharePayload } from '../src/services/shareService.js'

describe('Çetele Math & Evaluator Engine', () => {
  it('evaluates basic math expressions and running total', () => {
    const input = `subtotal = 100
tax = 10
subtotal + tax
total`

    const { rendered, sum } = evaluateAll(input)
    expect(rendered[0].text).toBe('100')
    expect(rendered[1].text).toBe('10')
    expect(rendered[2].text).toBe('110')
    expect(rendered[3].text).toBe('220')
    expect(sum).toBe(440)
  })

  it('handles crypto variable assignments and typed arithmetic', () => {
    const input = `a = 100 sol + 50$
a + 10$
a to usd`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toContain('SOL')
    expect(rendered[1].text).toContain('SOL')
    expect(rendered[2].text).toContain('USD')
  })

  it('handles gold and precious metals math', () => {
    const input = `1 gram altin to tl
5 gram altin + 100$
1 ceyrek to tl`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toContain('TL')
    expect(rendered[1].text).toContain('gram gold')
    expect(rendered[2].text).toContain('TL')
  })

  it('supports date variable assignment and chained date operations', () => {
    const input = `start = today
deadline = start + 2 weeks - 1 day + 2 months`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).not.toBe('')
    expect(rendered[0].text).not.toBe('—')
    expect(rendered[1].text).not.toBe('')
    expect(rendered[1].text).not.toBe('—')
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

  it('handles percentage arithmetic and unit conversions', () => {
    const input = `20% off 100
increase 1000 by 10%`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toBe('80')
    expect(rendered[1].text).toBe('1,100')
  })

  it('formats Copy All text with implicit results (= result)', () => {
    const input = `rent = 1000\nutilities = 200\ntotal_exp = rent + utilities`
    const formatted = getFormattedCopyAllText(input)
    expect(formatted).toContain('rent = 1000')
    expect(formatted).toContain('utilities = 200')
    expect(formatted).toContain('total_exp = rent + utilities = 1,200')
  })

  it('correctly encodes shareable payload', () => {
    const tab = { title: 'Budget 2026', content: 'income = 5000\nrent = 1500' }
    const url = encodeSharePayload(tab)
    expect(url).toContain('#doc=')
  })
})
