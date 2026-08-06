import { describe, it, expect } from 'vitest'
import { evaluateAll } from '../../src/services/evaluator.js'

describe('Evaluator Engine - Currency, Gold & Crypto', () => {
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
    expect(rendered[3].text).toContain('TL')
    const val = parseFloat(rendered[3].text.replace(/[^0-9.]/g, ''))
    expect(val).toBeGreaterThan(9000)

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
})
