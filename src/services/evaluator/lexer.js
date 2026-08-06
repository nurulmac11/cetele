import { CURRENCY_MAP, RATES } from './rates.js'

export class Lexer {
  constructor(input) {
    this.input = input
    this.pos = 0
    this.length = input.length
  }

  tokenizeLine() {
    const tokens = []
    while (this.pos < this.length) {
      const ch = this.input[this.pos]

      if (/\s/.test(ch)) {
        this.pos++
        continue
      }

      // Single line comments
      if (this.input.startsWith('//', this.pos) || (ch === '#' && !/^(?:#\d+|L\d+|line\d+)/i.test(this.input.slice(this.pos)))) {
        const commentText = this.input.slice(this.pos)
        tokens.push({ type: 'COMMENT', value: commentText })
        this.pos = this.length
        break
      }

      // Numbers
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(this.input[this.pos + 1]))) {
        let numStr = ''
        while (this.pos < this.length && (/\d/.test(this.input[this.pos]) || this.input[this.pos] === '.')) {
          numStr += this.input[this.pos]
          this.pos++
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr), raw: numStr })
        continue
      }

      // Currency Prefix Symbols ($10, ₺500, €50, £20, ¥1000, ₹500)
      if (['$', '€', '£', '₺', '¥', '₹'].includes(ch)) {
        tokens.push({ type: 'CURRENCY_SYMBOL', value: ch })
        this.pos++
        continue
      }

      // Line References (#1, L1, line1)
      const refMatch = this.input.slice(this.pos).match(/^(?:#|L|line)(\d+)\b/i)
      if (refMatch) {
        tokens.push({ type: 'LINE_REF', value: parseInt(refMatch[1], 10), raw: refMatch[0] })
        this.pos += refMatch[0].length
        continue
      }

      // Identifiers / Keywords / Currency Codes
      if (/[a-zA-Z_]/.test(ch)) {
        let ident = ''
        while (this.pos < this.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
          ident += this.input[this.pos]
          this.pos++
        }
        const upper = ident.toUpperCase()
        if (CURRENCY_MAP[upper] || RATES[upper]) {
          tokens.push({ type: 'CURRENCY_CODE', value: CURRENCY_MAP[upper] || upper, raw: ident })
        } else if (['to', 'in', 'of', 'off', 'increase', 'decrease', 'by'].includes(ident.toLowerCase())) {
          tokens.push({ type: 'KEYWORD', value: ident.toLowerCase() })
        } else {
          tokens.push({ type: 'IDENT', value: ident })
        }
        continue
      }

      // Operators & Punctuation
      if (['+', '-', '*', '/', '^', '%', '=', '(', ')', ','].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: ch })
        this.pos++
        continue
      }

      this.pos++
    }
    tokens.push({ type: 'EOF', value: '' })
    return tokens
  }
}
