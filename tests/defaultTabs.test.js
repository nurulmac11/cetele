import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../src/services/evaluator.js'
import { EXAMPLE_TEXT, MONTHLY_BUDGET_TEXT } from '../src/services/evaluator/constants.js'

// The first-run tabs are the app's showcase: every line must evaluate
describe('Default example tabs', () => {
  for (const [name, text] of [
    ['Calculator', EXAMPLE_TEXT],
    ['Monthly Budget', MONTHLY_BUDGET_TEXT]
  ]) {
    it(`${name} has no errors`, () => {
      const lines = text.split('\n')
      evaluateAll(text).rendered.forEach((r, i) => {
        // Historical-rate lines show a loading state here because tests don't download rates
        expect(r.cls, `line ${i + 1}: ${lines[i]} → ${r.error}`).not.toBe('err')
      })
    })
  }

  it('keeps the budget summary pointing at the section subtotals', () => {
    const { rendered } = evaluateAll(MONTHLY_BUDGET_TEXT)
    const lines = MONTHLY_BUDGET_TEXT.split('\n')
    for (const ref of MONTHLY_BUDGET_TEXT.matchAll(/L(\d+)/g)) {
      expect(lines[Number(ref[1]) - 1].trim()).toBe('subtotal')
    }
    expect(rendered.at(-1).text).toMatch(/USD$/)
  })
})
