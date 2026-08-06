import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Date Math & Physical Units', () => {
  it('supports date variable assignment and chained date operations', () => {
    const input = `start = today
deadline = start + 2 weeks - 1 day + 2 months`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).not.toBe('')
    expect(rendered[0].text).not.toBe('—')
    expect(rendered[1].text).not.toBe('')
    expect(rendered[1].text).not.toBe('—')
  })

  it('handles physical unit conversions (5 miles to km)', () => {
    const res = evaluateAll('5 miles to km')
    expect(res.rendered[0].text).toContain('km')
  })
})
