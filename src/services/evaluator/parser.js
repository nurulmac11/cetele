import { normalizeCurrency } from './rates.js'

export class Parser {
  constructor(tokens) {
    this.tokens = tokens
    this.pos = 0
  }

  peek() {
    return this.tokens[this.pos] || { type: 'EOF', value: '' }
  }

  consume() {
    const token = this.peek()
    if (token.type !== 'EOF') this.pos++
    return token
  }

  match(type, value = null) {
    const tok = this.peek()
    if (tok.type === type && (value === null || tok.value === value)) {
      return this.consume()
    }
    return null
  }

  parseLine() {
    const tok = this.peek()
    if (tok.type === 'EOF') return null
    if (tok.type === 'COMMENT') return { type: 'Comment', value: tok.value }
    if (tok.type === 'SECTION_HEADER') return { type: 'SectionHeader', title: tok.value }

    // Check for Variable Assignment: identifier = expr (or keyword/date/subtotal/total = expr)
    if (['IDENT', 'KEYWORD', 'DATE_KEYWORD', 'SUBTOTAL', 'TOTAL'].includes(tok.type) && this.tokens[this.pos + 1]?.type === 'OPERATOR' && this.tokens[this.pos + 1]?.value === '=') {
      const varName = this.consume().value
      this.consume() // '='
      const expr = this.parseExpression()
      return { type: 'Assignment', varName, expr }
    }

    if (tok.type === 'SUBTOTAL') return { type: 'Subtotal' }

    return this.parseExpression()
  }

  parseExpression() {
    const kw = this.peek()
    if (kw.type === 'KEYWORD' && (kw.value === 'increase' || kw.value === 'decrease')) {
      const verb = this.consume().value
      const baseExpr = this.parseAdditive()
      if (this.match('KEYWORD', 'by')) {
        const percentExpr = this.parseAdditive()
        return { type: 'PercentChange', verb, baseExpr, percentExpr }
      }
    }

    return this.parseAdditive()
  }

  parseAdditive() {
    let left = this.parseMultiplicative()

    while (true) {
      const tok = this.peek()
      if (tok.type === 'OPERATOR' && (tok.value === '+' || tok.value === '-')) {
        const op = this.consume().value
        const right = this.parseMultiplicative()
        left = { type: 'Binary', op, left, right }
      } else if (tok.type === 'KEYWORD' && (tok.value === 'to' || tok.value === 'in')) {
        this.consume()
        const targetTok = this.peek()
        let targetUnit = ''
        if (targetTok.type === 'CURRENCY_CODE' || targetTok.type === 'CURRENCY_SYMBOL' || targetTok.type === 'IDENT') {
          targetUnit = this.consume().value
        }
        left = { type: 'Conversion', expr: left, targetUnit }
      } else if (tok.type === 'KEYWORD' && (tok.value === 'of' || tok.value === 'off')) {
        const kind = this.consume().value
        const baseExpr = this.parseAdditive()
        left = { type: 'PercentageOf', percentExpr: left, baseExpr, kind }
      } else {
        break
      }
    }

    return left
  }

  parseMultiplicative() {
    let left = this.parsePower()

    while (true) {
      const tok = this.peek()
      if (tok.type === 'OPERATOR' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        const op = this.consume().value
        const right = this.parsePower()
        left = { type: 'Binary', op, left, right }
      } else {
        break
      }
    }

    return left
  }

  parsePower() {
    let left = this.parseUnary()

    if (this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      const op = this.consume().value
      const right = this.parsePower()
      left = { type: 'Binary', op, left, right }
    }

    return left
  }

  parseUnary() {
    const tok = this.peek()
    if (tok.type === 'OPERATOR' && (tok.value === '+' || tok.value === '-')) {
      const op = this.consume().value
      const expr = this.parseUnary()
      return { type: 'Unary', op, expr }
    }
    return this.parsePrimary()
  }

  parsePrimary() {
    const tok = this.peek()

    // Currency Prefix Symbol ($10, ₺500, €50)
    if (tok.type === 'CURRENCY_SYMBOL') {
      const sym = this.consume().value
      const numTok = this.match('NUMBER')
      const amount = numTok ? numTok.value : 0
      return { type: 'CurrencyNumber', amount, currency: normalizeCurrency(sym) || sym }
    }

    // Number (with optional Currency Suffix like 100 USD, Unit Suffix like 5 miles, or 10%)
    if (tok.type === 'NUMBER') {
      const amount = this.consume().value
      const nextTok = this.peek()

      if (nextTok.type === 'CURRENCY_SYMBOL' || nextTok.type === 'CURRENCY_CODE') {
        const curr = this.consume().value
        return { type: 'CurrencyNumber', amount, currency: normalizeCurrency(curr) || curr }
      }
      if (nextTok.type === 'OPERATOR' && nextTok.value === '%') {
        this.consume() // '%'
        return { type: 'PercentNumber', amount }
      }
      // Unit identifier suffix (e.g. 5 miles)
      if (nextTok.type === 'IDENT') {
        const lookahead2 = this.tokens[this.pos + 1]
        if (lookahead2 && lookahead2.type === 'KEYWORD' && (lookahead2.value === 'to' || lookahead2.value === 'in')) {
          const unit = this.consume().value
          return { type: 'UnitNumber', amount, unit }
        }
      }
      return { type: 'Number', value: amount }
    }

    // Date Expression (e.g. today + 2 weeks, now - 1 hour, start + 2 weeks - 1 day)
    if (tok.type === 'DATE_KEYWORD' || tok.type === 'IDENT') {
      const lookaheadOp = this.tokens[this.pos + 1]
      const lookaheadNum = this.tokens[this.pos + 2]
      const lookaheadUnit = this.tokens[this.pos + 3]

      const isDateOffsetFollowup = lookaheadOp && (lookaheadOp.value === '+' || lookaheadOp.value === '-') &&
                                   lookaheadNum && lookaheadNum.type === 'NUMBER' &&
                                   lookaheadUnit && lookaheadUnit.type === 'DATE_UNIT'

      if (tok.type === 'DATE_KEYWORD' || isDateOffsetFollowup) {
        const baseName = this.consume().value
        const offsets = []
        while (true) {
          const opTok = this.peek()
          if (opTok.type === 'OPERATOR' && (opTok.value === '+' || opTok.value === '-')) {
            const lookAheadN = this.tokens[this.pos + 1]
            const lookAheadU = this.tokens[this.pos + 2]
            if (lookAheadN && lookAheadN.type === 'NUMBER' && lookAheadU && lookAheadU.type === 'DATE_UNIT') {
              const op = this.consume().value
              const numTok = this.consume()
              const unitTok = this.consume()
              offsets.push({ op, amount: numTok.value, unit: unitTok.value })
              continue
            }
          }
          break
        }
        return { type: 'DateExpression', baseName, offsets }
      }
    }

    // Line References (#1, L1, line1)
    if (tok.type === 'LINE_REF') {
      const refIdx = this.consume().value
      return { type: 'LineRef', refIdx }
    }

    // Total Keyword
    if (tok.type === 'TOTAL') {
      this.consume()
      return { type: 'Identifier', name: 'total' }
    }

    // Parenthesized Expression ( expr )
    if (tok.type === 'OPERATOR' && tok.value === '(') {
      this.consume()
      const expr = this.parseExpression()
      this.match('OPERATOR', ')')
      return { type: 'Paren', expr }
    }

    // Identifiers (Variables, Keywords, Functions)
    if (tok.type === 'IDENT') {
      const name = this.consume().value
      const nextTok = this.peek()
      if (nextTok.type === 'OPERATOR' && nextTok.value === '(') {
        this.consume()
        const args = []
        if (this.peek().type !== 'OPERATOR' || this.peek().value !== ')') {
          args.push(this.parseExpression())
          while (this.match('OPERATOR', ',')) {
            args.push(this.parseExpression())
          }
        }
        this.match('OPERATOR', ')')
        return { type: 'FunctionCall', name, args }
      }
      return { type: 'Identifier', name }
    }

    this.consume()
    return null
  }
}
