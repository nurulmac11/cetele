import { describe, it, expect } from 'vitest'
import { getFormattedCopyAllText } from '../src/services/evaluator.js'
import { encodeSharePayload } from '../src/services/shareService.js'

describe('Application Helper Services', () => {
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
