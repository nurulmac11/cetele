import { describe, it, expect } from 'vitest'
import { highlightDocument, tokenizeCodePart } from '../src/services/highlighter.js'

const clsOf = (line, text) => tokenizeCodePart(line).find((t) => t.text === text)?.cls

describe('Syntax highlighter', () => {
  it('reproduces every line exactly so the backdrop stays aligned with the textarea', () => {
    const doc = [
      '===  Income   ===',
      '// === Costs ===',
      'maaş = 5k usd  // monthly',
      '/* note */ 5 + 3',
      'rent = 1,250.50 € × 2',
      '"""',
      'multi-line comment',
      '"""',
      'end - start',
      '5 & 3 @ weird',
      '   ',
      ''
    ].join('\n')
    const lines = doc.split('\n')
    highlightDocument(doc).forEach((line, i) => {
      expect(line.tokens.map((t) => t.text).join('')).toBe(lines[i])
    })
  })

  it('colours tokens the way the evaluator reads them', () => {
    expect(clsOf('500 gram to kg', '500')).toBe('tok-number')
    expect(clsOf('500 gram to kg', 'gram')).toBe('tok-unit')
    expect(clsOf('500 gram to kg', 'to')).toBe('tok-keyword')
    expect(clsOf('500 gram to kg', 'kg')).toBe('tok-unit')
    expect(clsOf('1 gram gold to tl', 'gram gold')).toBe('tok-currency')
    expect(clsOf('maaş * 2', 'maaş')).toBe('tok-variable')
    expect(clsOf('round(x)', 'round')).toBe('tok-keyword')
    expect(clsOf('#3 + 1', '#3')).toBe('tok-number')
    expect(clsOf('5 + 3 // note', '// note')).toBe('tok-comment')
  })

  it('treats // === Title === as a section header, like the evaluator', () => {
    const [line] = highlightDocument('// === Costs ===')
    expect(line.tokens.some((t) => t.cls === 'tok-header-title' && t.text === 'Costs')).toBe(true)
  })

  it('does not style lines the evaluator does not treat as headers', () => {
    const [line] = highlightDocument('=== 5 ===')
    expect(line.tokens.some((t) => t.cls === 'tok-header-title')).toBe(false)
  })
})
