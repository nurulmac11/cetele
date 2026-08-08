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
    expect(res.rendered[0].text).toBe('Income')
    expect(res.rendered[0].text).not.toContain('===')
    expect(res.rendered[3].isSubtotal).toBe(true)
    expect(res.rendered[3].text).toBe('6,200')
    expect(res.rendered[5].isSection).toBe(true)
    expect(res.rendered[5].title).toBe('Expenses')
    expect(res.rendered[5].text).toBe('Expenses')
    expect(res.rendered[5].text).not.toContain('===')
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

  it('evaluates complex multi-line documents with line references, cross-currency calculations, and running totals', () => {
    const doc = `=== Revenue ===
salary = 5000 usd
bonus = 1000 eur to usd
income = salary + bonus
subtotal

=== Expenses ===
rent = 1500 usd
groceries = 400 usd
subtotal

total
net_usd = income - (rent + groceries)
net_tl = net_usd to tl
net_gold = net_usd to gram gold
#4 - #8
prev to tl`

    const res = evaluateAll(doc)
    expect(res.rendered[0].isSection).toBe(true)
    expect(res.rendered[1].text).toBe('5,000 USD')
    expect(res.rendered[2].text).toBe('1,086.9565 USD')
    expect(res.rendered[3].text).toBe('6,086.9565 USD')
    expect(res.rendered[4].isSubtotal).toBe(true)

    expect(res.rendered[6].isSection).toBe(true)
    expect(res.rendered[7].text).toBe('1,500 USD')
    expect(res.rendered[8].text).toBe('400 USD')
    expect(res.rendered[9].isSubtotal).toBe(true)
    expect(res.rendered[9].text).toBe('1,900')

    expect(res.rendered[12].text).toBe('4,186.9565 USD')
    expect(res.rendered[13].text).toContain('TL')
    expect(res.rendered[14].text).toContain('gram gold')
    expect(res.rendered[15].text).toBe('4,586.9565 USD')
    expect(res.rendered[16].text).toContain('TL')
  })

  it('evaluates complex multi-line document with mixed Python/C comments, dates, line references, and prev', () => {
    const doc = `"""
Project Alpha Roadmap & Budget
Author: Dev Team
"""
start_date = today
milestone1 = start_date + 2 weeks - 1 day
/* Allocated Funds */
initial_sol = 50 sol to usd
gold_reserve = 5 gram altin to usd
allocated_total = initial_sol + gold_reserve
#8 + #9
prev to eur`

    const res = evaluateAll(doc)
    expect(res.rendered[1].text).toBe('Project Alpha Roadmap & Budget')
    expect(res.rendered[4].cls).toBe('date')
    expect(res.rendered[5].cls).toBe('date')
    expect(res.rendered[7].text).toBe('9,250 USD')
    expect(res.rendered[8].text).toBe('650 USD')
    expect(res.rendered[9].text).toBe('9,900 USD')
    expect(res.rendered[10].text).toBe('9,900 USD')
    expect(res.rendered[11].text).toBe('9,108 EUR')
  })
})
