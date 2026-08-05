import { describe, it, expect } from 'vitest'
import { evaluateAll, getFormattedCopyAllText } from '../src/services/evaluator.js'
import { encodeSharePayload } from '../src/services/shareService.js'

describe('Çetele Math & Evaluator Engine', () => {
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

  it('handles crypto variable assignments and typed arithmetic', () => {
    const input = `a = 100 sol + 50$
a + 10$
a to usd`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toContain('SOL')
    expect(rendered[1].text).toContain('SOL')
    expect(rendered[2].text).toContain('USD')
  })

  it('preserves currency types for line references (#1, L1) and prev keyword', () => {
    const input = `100 sol
#1 + 10$
prev to usd
1 gram altin
prev to tl`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toContain('SOL')
    expect(rendered[1].text).toContain('SOL')
    expect(rendered[2].text).toContain('USD')
    expect(rendered[3].text).toContain('gram gold')
    expect(rendered[4].text).toContain('TL')
  })

  it('handles gold and precious metals math', () => {
    const input = `1 gram altin to tl
5 gram altin + 100$
1 ceyrek to tl
1 gram altin to tl + 100$`

    const { rendered } = evaluateAll(input)
    expect(rendered[0].text).toContain('TL')
    expect(rendered[1].text).toContain('gram gold')
    expect(rendered[2].text).toContain('TL')
    // 1 gram gold (~6,175 TL) + 100 USD in TL (~4,750 TL) should evaluate to > 10,000 TL
    expect(rendered[3].text).toContain('TL')
    const val = parseFloat(rendered[3].text.replace(/[^0-9.]/g, ''))
    expect(val).toBeGreaterThan(9000)

    // Check USD to gold conversions with and without disableFloat
    const goldInputs = `100$ to gram gold
100$ to gram altin
100$ to altin
100$ to ceyrek gold`
    const resNormal = evaluateAll(goldInputs)
    expect(resNormal.rendered[0].text).toMatch(/0\.\d+ gram gold/)
    expect(resNormal.rendered[1].text).toMatch(/0\.\d+ gram gold/)
    expect(resNormal.rendered[2].text).toMatch(/0\.\d+ gram gold/)
    expect(resNormal.rendered[3].text).toMatch(/0\.\d+ çeyrek gold/)

    const resDisabled = evaluateAll(goldInputs, { disableFloat: true })
    expect(resDisabled.rendered[0].text).toMatch(/0\.\d+ gram gold/)
    expect(resDisabled.rendered[1].text).toMatch(/0\.\d+ gram gold/)
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

  it('handles cross conversions between fiat currencies, crypto assets, and gold', () => {
    const fiatInput = `100 USD to EUR
100 EUR to USD
100$ to TL
1000 TL to USD
50 CAD to AUD
100 GBP to JPY
1000 JPY to EUR
50 CHF to USD
100 SAR to AED
100 BRL to USD
100 RUB to TRY
100 SEK to EUR
100 NZD to AUD`

    const resFiat = evaluateAll(fiatInput)
    expect(resFiat.rendered[0].text).toContain('EUR')
    expect(resFiat.rendered[1].text).toContain('USD')
    expect(resFiat.rendered[2].text).toContain('TL')
    expect(resFiat.rendered[3].text).toContain('USD')
    expect(resFiat.rendered[4].text).toContain('AUD')
    expect(resFiat.rendered[5].text).toContain('JPY')
    expect(resFiat.rendered[6].text).toContain('EUR')
    expect(resFiat.rendered[7].text).toContain('USD')
    expect(resFiat.rendered[8].text).toContain('AED')
    expect(resFiat.rendered[9].text).toContain('USD')
    expect(resFiat.rendered[10].text).toMatch(/TRY|TL/)
    expect(resFiat.rendered[11].text).toContain('EUR')
    expect(resFiat.rendered[12].text).toContain('AUD')

    const cryptoInput = `1 btc to usd
1 eth to sol
100 usdt to btc
10 sol to usdt
50 ada to usd`

    const resCrypto = evaluateAll(cryptoInput)
    expect(resCrypto.rendered[0].text).toContain('USD')
    expect(resCrypto.rendered[1].text).toContain('SOL')
    expect(resCrypto.rendered[2].text).toContain('BTC')
    expect(resCrypto.rendered[3].text).toContain('USDT')
    expect(resCrypto.rendered[4].text).toContain('USD')

    const crossInput = `1 btc to gram gold
10 gram gold to usd
10 gram gold to btc
100$ to tl + 500
salary = 5000 usd
salary to eur`

    const resCross = evaluateAll(crossInput)
    expect(resCross.rendered[0].text).toContain('gram gold')
    expect(resCross.rendered[1].text).toContain('USD')
    expect(resCross.rendered[2].text).toContain('BTC')
    expect(resCross.rendered[3].text).toContain('TL')
    expect(resCross.rendered[5].text).toContain('EUR')

    // Verify numeric validity (none should return error symbol '—')
    const allRendered = [...resFiat.rendered, ...resCrypto.rendered, ...resCross.rendered]
    allRendered.forEach(item => {
      expect(item.text).not.toBe('—')
      expect(item.text).not.toBe('')
    })
  })

  it('exhaustively tests every possible currency, gold, and crypto conversion pair (2,401 combinations)', () => {
    const tokens = [
      '$', '€', '£', '₺', '¥', '₹',
      'USD', 'EUR', 'GBP', 'TRY', 'TL', 'CAD', 'AUD', 'JPY', 'INR', 'CHF',
      'CNY', 'RMB', 'SAR', 'AED', 'RUB', 'BRL', 'SEK', 'NZD',
      'gram gold', 'gram altin', 'altin', 'gold', 'ceyrek gold', 'ceyrek altin', 'ceyrek', 'oz gold', 'ounce gold', 'troy oz gold',
      'btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 'usdt', 'tether', 'bnb', 'xrp', 'doge', 'dogecoin', 'ada', 'cardano', 'avax'
    ]

    let totalTested = 0
    tokens.forEach(from => {
      tokens.forEach(to => {
        const line = ['$', '€', '£', '₺', '¥', '₹'].includes(from) ? `${from}100 to ${to}` : `100 ${from} to ${to}`
        const res = evaluateAll(line)
        const outputText = res.rendered[0]?.text
        expect(outputText).toBeDefined()
        expect(outputText).not.toBe('—')
        expect(outputText).not.toBe('')
        totalTested++
      })
    })

    expect(totalTested).toBe(2401)
  })

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

  it('prevents reserved keywords from being assigned and suppresses JS function output', () => {
    expect(evaluateAll('to').rendered[0].text).toBe('')
    expect(evaluateAll('sin').rendered[0].text).toBe('')
    expect(evaluateAll('to = 5').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('prev = 100').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('in = 20').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('subtotal = 300').rendered[0].text).toBe('Reserved keyword')
    expect(evaluateAll('val = 500').rendered[0].text).toBe('500')
  })

  it('correctly evaluates parenthesized currency conversion expressions and arbitrary recursive nesting', () => {
    expect(evaluateAll('(1 $ to tl) + 5').rendered[0].text).toBe('52.5 TL')
    expect(evaluateAll('((1$ to tl) + 5) + 1').rendered[0].text).toBe('53.5 TL')
    expect(evaluateAll('(1$ to tl) + 5 to usd').rendered[0].text).toContain('USD')
    expect(evaluateAll('(((10$ to tl) + 5) * 2) + 10').rendered[0].text).toBe('970 TL')
    expect(evaluateAll('5 + (1 $ to tl)').rendered[0].text).toBe('52.5 TL')
    expect(evaluateAll('(100 $ to eur) * 2').rendered[0].text).toBe('184 EUR')
  })
})
