import { describe, it, expect } from 'vitest'
import { evaluateAll, _clearEvaluationCache } from '../../src/services/evaluator.js'
import { EXAMPLE_TEXT, MONTHLY_BUDGET_TEXT } from '../../src/services/evaluator/constants.js'

// Deterministic pseudo-random numbers, so failures are reproducible
function rng(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
}

const SNIPPETS = [
  'x = 5',
  'x * 2',
  'prev + 1',
  '#3 + #4',
  'total',
  'subtotal',
  'average',
  '=== New section ===',
  '"""',
  '/* comment */ 7',
  'rent = 1.5k usd',
  'rent to tl',
  'd = 2026-01-31 + 1 month',
  'days until d',
  '',
  'broken +'
]

function fresh(text, options) {
  _clearEvaluationCache()
  return evaluateAll(text, options)
}

const view = (res) => ({
  rendered: res.rendered.map((r) => [r.cls, r.text, r.error, (r.deps || []).join(',')]),
  sections: res.sections,
  sumText: res.sumText,
  lineResults: res.lineResults.map((v) => (v && typeof v === 'object' ? String(v) : v))
})

describe('Incremental evaluation', () => {
  it('gives exactly the same results as a full evaluation after random edits', () => {
    const random = rng(42)
    // A document long enough to use several checkpoints
    // "now" is left out: its timestamp legitimately differs between two runs a moment apart
    let lines = (EXAMPLE_TEXT.replace(/.*(@|now).*\n/g, '') + '\n' + MONTHLY_BUDGET_TEXT).split('\n')
    while (lines.length < 400) lines = lines.concat(lines)

    _clearEvaluationCache()
    evaluateAll(lines.join('\n'))

    for (let step = 0; step < 150; step++) {
      const at = Math.floor(random() * lines.length)
      const snippet = SNIPPETS[Math.floor(random() * SNIPPETS.length)]
      const action = random()
      if (action < 0.4) lines[at] = snippet
      else if (action < 0.7) lines.splice(at, 0, snippet)
      else if (lines.length > 50) lines.splice(at, 1)

      const text = lines.join('\n')
      const incremental = view(evaluateAll(text))
      const full = view(fresh(text))
      expect(incremental, `step ${step}`).toEqual(full)
      evaluateAll(text) // leave this text as the most recent run, like typing does
    }
  })

  it('re-evaluates when the decimals setting changes', () => {
    _clearEvaluationCache()
    expect(evaluateAll('1 / 3').rendered[0].text).toBe('0.3333')
    expect(evaluateAll('1 / 3', { disableFloat: true }).rendered[0].text).toBe('0')
  })

  it('returns the same result object for unchanged text', () => {
    _clearEvaluationCache()
    const a = evaluateAll('a = 1\na + 1')
    expect(evaluateAll('a = 1\na + 1')).toBe(a)
  })

  it('resumes when the document length is an exact multiple of the checkpoint interval', () => {
    _clearEvaluationCache()
    const text = Array.from({ length: 128 }, (_, i) => `v${i} = ${i}`).join('\n')
    evaluateAll(text)
    const appended = evaluateAll(text + '\nv127 + 1')
    expect(appended.rendered.at(-1).text).toBe('128')
    expect(view(appended)).toEqual(view(fresh(text + '\nv127 + 1')))
  })

  it('makes editing the end of a long document much cheaper than evaluating it', () => {
    let lines = EXAMPLE_TEXT.replace(/.*@.*\n/g, '').split('\n')
    while (lines.length < 2000) lines = lines.concat(lines)
    const text = lines.join('\n')

    const t0 = performance.now()
    fresh(text)
    const full = performance.now() - t0

    const t1 = performance.now()
    evaluateAll(text + '\n1 + 1')
    const incremental = performance.now() - t1
    expect(incremental).toBeLessThan(full / 3)
  })
})
