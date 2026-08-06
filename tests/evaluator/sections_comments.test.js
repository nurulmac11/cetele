import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Section Headers, Subtotals & Comments', () => {
  it('supports Section Headers, subtotal keyword, and section metadata tracking', () => {
    const input = `// === Income ===
salary = 5000
freelance = 1200
subtotal

// === Expenses ===
rent = 1500
groceries = 450
subtotal

total`

    const res = evaluateAll(input)
    expect(res.rendered[0].isSection).toBe(true)
    expect(res.rendered[0].title).toBe('Income')
    expect(res.rendered[3].isSubtotal).toBe(true)
    expect(res.rendered[3].text).toBe('6,200')
    expect(res.rendered[5].isSection).toBe(true)
    expect(res.rendered[5].title).toBe('Expenses')
    expect(res.rendered[8].isSubtotal).toBe(true)
    expect(res.rendered[8].text).toBe('1,950')
    expect(res.rendered[10].text).toBe('8,150')

    expect(res.sections.length).toBe(2)
    expect(res.sections[0].title).toBe('Income')
    expect(res.sections[0].subtotal).toBe(6200)
    expect(res.sections[1].title).toBe('Expenses')
    expect(res.sections[1].subtotal).toBe(1950)
  })

  it('supports Python multi-line comments (""" and \'\'\') and C-style block comments (/* */)', () => {
    const inputPython = `"""
This is a python multi line comment
Line 2 of comment
"""
salary = 5000
'''
Triple single quotes comment
Line B
'''
rent = 1200
salary - rent`

    const resPy = evaluateAll(inputPython)
    expect(resPy.rendered[0].text).toBe('')
    expect(resPy.rendered[1].text).toBe('This is a python multi line comment')
    expect(resPy.rendered[2].text).toBe('Line 2 of comment')
    expect(resPy.rendered[3].text).toBe('')
    expect(resPy.rendered[4].text).toBe('5,000')
    expect(resPy.rendered[5].text).toBe('')
    expect(resPy.rendered[6].text).toBe('Triple single quotes comment')
    expect(resPy.rendered[7].text).toBe('Line B')
    expect(resPy.rendered[8].text).toBe('')
    expect(resPy.rendered[9].text).toBe('1,200')
    expect(resPy.rendered[10].text).toBe('3,800')
    expect(resPy.sum).toBe(10000)

    const inputC = `/*
C style block comment
*/
val = 500 /* inline comment */
val * 2
1 + /* mid-expr comment */ 2
/* same line comment */ 100 + 200`

    const resC = evaluateAll(inputC)
    expect(resC.rendered[3].text).toBe('500')
    expect(resC.rendered[4].text).toBe('1,000')
    expect(resC.rendered[5].text).toBe('3')
    expect(resC.rendered[6].text).toBe('300')
  })
})
