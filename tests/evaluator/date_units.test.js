import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Date Math & Physical Units', () => {
  it('supports date variable assignment and chained date operations', () => {
    const input = `start = today
deadline = start + 2 weeks - 1 day`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).not.toBe('')
    expect(rendered[0].text).not.toBe('—')
    expect(rendered[0].cls).toBe('date')

    expect(rendered[1].text).not.toBe('2')
    expect(rendered[1].text).not.toBe('—')
    expect(rendered[1].cls).toBe('date')

    // Verify date calculation (today + 13 days)
    const startDate = new Date(rendered[0].text)
    const deadlineDate = new Date(rendered[1].text)
    const diffDays = Math.round((deadlineDate - startDate) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(13)
  })

  it('handles physical unit conversions (5 miles to km)', () => {
    const res = evaluateAll('5 miles to km')
    expect(res.rendered[0].text).toContain('km')
  })

  it('formats converted units using the displayed unit value', () => {
    expect(evaluateAll('5 km to miles').rendered[0].text).toBe('3.1069 miles')
    expect(evaluateAll('3 cups to ml').rendered[0].text).toBe('709.7647 ml')
    expect(evaluateAll('5 kg to g').rendered[0].text).toBe('5,000 g')
  })

  it('supports unit arithmetic before conversion', () => {
    expect(evaluateAll('3 cups + 2 tbsp to ml').rendered[0].text).toBe('739.7647 ml')
    expect(evaluateAll('5 km + 3 miles to km').rendered[0].text).toBe('9.828 km')
    expect(evaluateAll('1 hour to minutes').rendered[0].text).toBe('60 minutes')
  })

  it('rejects undefined date variables instead of defaulting to now', () => {
    expect(evaluateAll('start + 1 day').rendered[0].text).toBe('—')
  })
})
