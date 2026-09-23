import { normalizeCurrency } from './rates.js'

// Words that may follow a percentage as a label: 1000 + %20 kdv, 50 + 8% vat
const TAX_WORDS = new Set(['kdv', 'vat', 'tax', 'gst', 'otv', 'ötv', 'stopaj'])

// Standalone words that summarise the lines above (like subtotal)
const AGGREGATE_WORDS = new Set(['avg', 'average', 'count'])

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
    if (
      ['IDENT', 'KEYWORD', 'DATE_KEYWORD', 'SUBTOTAL', 'TOTAL'].includes(tok.type) &&
      this.tokens[this.pos + 1]?.type === 'OPERATOR' &&
      this.tokens[this.pos + 1]?.value === '='
    ) {
      const varName = this.consume().value
      this.consume() // '='
      const expr = this.parseExpressionWithDate()
      if (this.peek().type !== 'EOF') {
        return { type: 'Error', message: 'Unexpected token' }
      }
      return { type: 'Assignment', varName, expr }
    }

    // avg / average / count on their own line
    if (
      tok.type === 'IDENT' &&
      AGGREGATE_WORDS.has(tok.value.toLowerCase()) &&
      this.tokens[this.pos + 1]?.type === 'EOF'
    ) {
      this.consume()
      const name = tok.value.toLowerCase()
      return { type: 'Aggregate', kind: name === 'count' ? 'count' : 'average', name: tok.value }
    }

    if (tok.type === 'SUBTOTAL') {
      this.consume()
      if (this.peek().type !== 'EOF') {
        return { type: 'Error', message: 'Unexpected token' }
      }
      return { type: 'Subtotal' }
    }

    const expr = this.parseExpressionWithDate()
    if (expr && this.peek().type !== 'EOF') {
      return { type: 'Error', message: 'Unexpected token' }
    }
    return expr
  }

  // expr, optionally followed by "@ 2025-01-01" to use that day's exchange rates
  parseExpressionWithDate() {
    const expr = this.parseExpression()
    if (!this.match('OPERATOR', '@')) return expr
    const dateTok = this.match('DATE_LITERAL')
    if (!dateTok) return { type: 'Error', message: 'Expected a date after @, e.g. @ 2025-01-01' }
    if (dateTok.value === null) return { type: 'Error', message: `Invalid date: ${dateTok.raw}` }
    return { type: 'AtDate', expr, timestamp: dateTok.value, raw: dateTok.raw }
  }

  // Consumes a tax label after a percentage (%20 kdv)
  skipTaxWord() {
    const tok = this.peek()
    if (tok.type === 'IDENT' && TAX_WORDS.has(String(tok.value).toLowerCase())) this.consume()
  }

  parseExpression() {
    const kw = this.peek()

    // days until 2026-12-31, weeks since start
    const next = this.tokens[this.pos + 1]
    if (kw.type === 'DATE_UNIT' && next?.type === 'KEYWORD' && (next.value === 'until' || next.value === 'since')) {
      const unit = this.consume().value
      const direction = this.consume().value
      const target = this.parseAdditive()
      return { type: 'DateSpan', unit, direction, target }
    }

    if (kw.type === 'KEYWORD' && (kw.value === 'increase' || kw.value === 'decrease')) {
      const verb = this.consume().value
      const baseExpr = this.parseAdditive()
      if (this.match('KEYWORD', 'by')) {
        const percentExpr = this.parseAdditive()
        return { type: 'PercentChange', verb, baseExpr, percentExpr }
      }
      return { type: 'Error', message: 'Expected by' }
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
        if (
          targetTok.type === 'CURRENCY_CODE' ||
          targetTok.type === 'CURRENCY_SYMBOL' ||
          targetTok.type === 'IDENT' ||
          targetTok.type === 'DATE_UNIT'
        ) {
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
    let left = this.parseUnary()

    while (true) {
      const tok = this.peek()
      if (tok.type === 'OPERATOR' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        const op = this.consume().value
        const right = this.parseUnary()
        left = { type: 'Binary', op, left, right }
      } else {
        break
      }
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
    return this.parsePower()
  }

  // Reads "+ 2 weeks - 1 day" style offsets after a date
  parseDateOffsets() {
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
    return offsets
  }

  // Is the '%' at the current position a postfix percent (10%) rather than modulo (10 % 3)?
  isPostfixPercent() {
    const tok = this.peek()
    if (tok.type !== 'OPERATOR' || tok.value !== '%') return false
    const after = this.tokens[this.pos + 1]
    const isModuloOperand =
      after &&
      (after.type === 'NUMBER' ||
        (after.type === 'IDENT' && !TAX_WORDS.has(String(after.value).toLowerCase())) ||
        after.type === 'LINE_REF' ||
        after.type === 'CURRENCY_SYMBOL' ||
        after.type === 'CURRENCY_CODE' ||
        (after.type === 'OPERATOR' && after.value === '('))
    return !isModuloOperand
  }

  parsePower() {
    let left = this.parsePrimary()

    // Postfix percent on a variable, line reference or group: x%, #2%, (a + b)%
    if (left && ['Identifier', 'LineRef', 'Paren'].includes(left.type) && this.isPostfixPercent()) {
      this.consume()
      left = { type: 'Percent', expr: left }
    }

    if (this.peek().type === 'OPERATOR' && this.peek().value === '^') {
      const op = this.consume().value
      // parseUnary allows a signed exponent (2^-1) and recurses back here for right associativity
      const right = this.parseUnary()
      left = { type: 'Binary', op, left, right }
    }

    return left
  }

  parsePrimary() {
    const tok = this.peek()

    // Prefix percent, as written in Turkish: %20
    if (tok.type === 'OPERATOR' && tok.value === '%' && this.tokens[this.pos + 1]?.type === 'NUMBER') {
      this.consume()
      const amount = this.consume().value
      this.skipTaxWord()
      return { type: 'PercentNumber', amount }
    }

    // Date literal, with optional offsets: 2026-12-31 + 2 weeks
    if (tok.type === 'DATE_LITERAL') {
      this.consume()
      if (tok.value === null) return { type: 'Error', message: `Invalid date: ${tok.raw}` }
      return { type: 'DateExpression', baseTimestamp: tok.value, offsets: this.parseDateOffsets() }
    }

    // Currency Prefix Symbol ($10, ₺500, €50)
    if (tok.type === 'CURRENCY_SYMBOL') {
      const sym = this.consume().value
      const numTok = this.match('NUMBER')
      const amount = numTok ? numTok.value : 0
      return { type: 'CurrencyNumber', amount, currency: normalizeCurrency(sym) || sym }
    }

    // Number (with optional Currency Suffix like 100 USD, Unit Suffix like 5 miles, 10%, or Spaced Multipliers like 500 k, 2 m)
    if (tok.type === 'NUMBER') {
      const numTok = this.consume()
      let amount = numTok.value
      let nextTok = this.peek()
      // 'm' may mean million or metres; keep the metres reading for unit arithmetic (5 m + 3 cm)
      let metresAmount = /[0-9.]m$/i.test(numTok.raw || '') ? amount / 1e6 : null

      // Spaced multiplier support (e.g. 500 k, 2 m, 1.5 b, 3 t)
      if (nextTok.type === 'IDENT') {
        const multKey = nextTok.value.toLowerCase()
        const MULTIPLIERS = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }
        if (MULTIPLIERS[multKey]) {
          const lookahead2 = this.tokens[this.pos + 1]
          // If 'm' is followed by 'to' or 'in' (e.g. 500 m to km), leave 'm' for unit conversion
          const isUnitConversionFollowup =
            multKey === 'm' &&
            lookahead2 &&
            lookahead2.type === 'KEYWORD' &&
            (lookahead2.value === 'to' || lookahead2.value === 'in')
          if (!isUnitConversionFollowup) {
            this.consume() // consume multiplier token 'k', 'm', 'b', or 't'
            if (multKey === 'm') metresAmount = amount
            amount = amount * MULTIPLIERS[multKey]
            nextTok = this.peek()
          }
        }
      }

      if (nextTok.type === 'CURRENCY_SYMBOL' || nextTok.type === 'CURRENCY_CODE') {
        const curr = this.consume().value
        return { type: 'CurrencyNumber', amount, currency: normalizeCurrency(curr) || curr }
      }
      // Distinguish postfix percentage (10%) from binary modulo operator (10 % 3)
      if (this.isPostfixPercent()) {
        this.consume() // '%'
        this.skipTaxWord()
        return { type: 'PercentNumber', amount }
      }
      // Unit identifier suffix (e.g. 5 miles)
      if (nextTok.type === 'IDENT' || nextTok.type === 'DATE_UNIT') {
        const lookahead2 = this.tokens[this.pos + 1]
        if (
          !lookahead2 ||
          lookahead2.type === 'EOF' ||
          (lookahead2.type === 'KEYWORD' && (lookahead2.value === 'to' || lookahead2.value === 'in')) ||
          (lookahead2.type === 'OPERATOR' && ['+', '-', '*', '/', '^', ')'].includes(lookahead2.value))
        ) {
          const unit = this.consume().value
          return { type: 'UnitNumber', amount, unit }
        }
      }
      return metresAmount !== null ? { type: 'Number', value: amount, metresAmount } : { type: 'Number', value: amount }
    }

    // Date Expression (e.g. today + 2 weeks, now - 1 hour, start + 2 weeks - 1 day)
    if (tok.type === 'DATE_KEYWORD' || tok.type === 'IDENT') {
      const lookaheadOp = this.tokens[this.pos + 1]
      const lookaheadNum = this.tokens[this.pos + 2]
      const lookaheadUnit = this.tokens[this.pos + 3]

      const isDateOffsetFollowup =
        lookaheadOp &&
        (lookaheadOp.value === '+' || lookaheadOp.value === '-') &&
        lookaheadNum &&
        lookaheadNum.type === 'NUMBER' &&
        lookaheadUnit &&
        lookaheadUnit.type === 'DATE_UNIT'

      if (tok.type === 'DATE_KEYWORD' || isDateOffsetFollowup) {
        const baseName = this.consume().value
        return { type: 'DateExpression', baseName, offsets: this.parseDateOffsets() }
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
      if (!this.match('OPERATOR', ')')) {
        return { type: 'Error', message: 'Expected closing parenthesis' }
      }
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
        if (!this.match('OPERATOR', ')')) {
          return { type: 'Error', message: 'Expected closing parenthesis' }
        }
        return { type: 'FunctionCall', name, args }
      }
      return { type: 'Identifier', name }
    }

    this.consume()
    return null
  }
}
