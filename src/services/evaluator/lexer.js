import { CURRENCY_MAP, RATES } from './rates.js'

function isDigit(ch) {
  return ch >= '0' && ch <= '9'
}

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

function isAlphaNum(ch) {
  return isAlpha(ch) || isDigit(ch)
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\r'
}

function checkPhraseMapping(word, input, pos) {
  const rest = input.slice(pos).toLowerCase()
  const lower = word.toLowerCase()

  if (lower === 'gram' || lower === 'g') {
    if (rest.startsWith(' gold')) return { code: 'GRAM_GOLD', raw: word + ' gold', consumedLength: 5 }
    if (rest.startsWith(' altin')) return { code: 'GRAM_GOLD', raw: word + ' altin', consumedLength: 6 }
    if (rest.startsWith(' altın')) return { code: 'GRAM_GOLD', raw: word + ' altın', consumedLength: 6 }
  }
  if (lower === 'ceyrek' || lower === 'çeyrek') {
    if (rest.startsWith(' gold')) return { code: 'CEYREK_GOLD', raw: word + ' gold', consumedLength: 5 }
    if (rest.startsWith(' altin')) return { code: 'CEYREK_GOLD', raw: word + ' altin', consumedLength: 6 }
    if (rest.startsWith(' altın')) return { code: 'CEYREK_GOLD', raw: word + ' altın', consumedLength: 6 }
    return { code: 'CEYREK_GOLD', raw: word, consumedLength: 0 }
  }
  if (lower === 'altin' || lower === 'altın') {
    return { code: 'GRAM_GOLD', raw: word, consumedLength: 0 }
  }
  if (lower === 'oz' || lower === 'ounce' || lower === 'ounces') {
    if (rest.startsWith(' gold')) return { code: 'XAU', raw: word + ' gold', consumedLength: 5 }
  }
  if (lower === 'troy') {
    if (rest.startsWith(' oz gold')) return { code: 'XAU', raw: word + ' oz gold', consumedLength: 8 }
    if (rest.startsWith(' ounce gold')) return { code: 'XAU', raw: word + ' ounce gold', consumedLength: 11 }
    if (rest.startsWith(' ounces gold')) return { code: 'XAU', raw: word + ' ounces gold', consumedLength: 12 }
  }
  return null
}

export class Lexer {
  constructor(input) {
    this.input = input || ''
    this.pos = 0
    this.length = this.input.length
  }

  peek(offset = 0) {
    return this.input[this.pos + offset] || ''
  }

  consume() {
    return this.input[this.pos++] || ''
  }

  tokenizeLine() {
    const tokens = []

    // Check for Section Header (=== Title ===, --- Title ---, # Title, // === Title ===)
    let sLine = this.input.trim()
    if (sLine.startsWith('//')) sLine = sLine.slice(2).trim()

    const isAssignAttempt = (sLine.includes('=') && !sLine.startsWith('==='))
    if (!isAssignAttempt && (sLine.startsWith('===') || sLine.startsWith('---') || (sLine.startsWith('#') && !isDigit(sLine[1])))) {
      let title = sLine
      while (title.startsWith('=') || title.startsWith('-') || title.startsWith('#') || title.startsWith(' ')) title = title.slice(1)
      while (title.endsWith('=') || title.endsWith('-') || title.endsWith('#') || title.endsWith(' ')) title = title.slice(0, -1)

      if (title && !isDigit(title[0])) {
        return [{ type: 'SECTION_HEADER', value: title, raw: this.input.trim() }, { type: 'EOF', value: '' }]
      }
    }

    while (this.pos < this.length) {
      const ch = this.peek()

      if (isWhitespace(ch)) {
        this.consume()
        continue
      }

      // Single line comments // or #
      if ((ch === '/' && this.peek(1) === '/') || (ch === '#' && !isDigit(this.peek(1)))) {
        const commentText = this.input.slice(this.pos)
        tokens.push({ type: 'COMMENT', value: commentText })
        this.pos = this.length
        break
      }

      // Multi-line comment openers /* or """ or '''
      if (
        (ch === '/' && this.peek(1) === '*') ||
        (ch === '"' && this.peek(1) === '"' && this.peek(2) === '"') ||
        (ch === "'" && this.peek(1) === "'" && this.peek(2) === "'")
      ) {
        const delim = ch === '/' ? '*/' : (ch === '"' ? '"""' : "'''")
        const openLen = ch === '/' ? 2 : 3
        this.pos += openLen
        const closeIdx = this.input.indexOf(delim, this.pos)
        if (closeIdx !== -1) {
          const commentContent = this.input.slice(this.pos, closeIdx)
          this.pos = closeIdx + delim.length
          tokens.push({ type: 'COMMENT', value: commentContent })
          continue
        } else {
          const commentContent = this.input.slice(this.pos)
          this.pos = this.length
          tokens.push({ type: 'COMMENT', value: commentContent })
          break
        }
      }

      // Line References #1, #2
      if (ch === '#' && isDigit(this.peek(1))) {
        this.consume() // '#'
        let numStr = ''
        while (isDigit(this.peek())) {
          numStr += this.consume()
        }
        tokens.push({ type: 'LINE_REF', value: parseInt(numStr, 10), raw: '#' + numStr })
        continue
      }

      // Line References L1, L2
      if ((ch === 'L' || ch === 'l') && isDigit(this.peek(1))) {
        const prefix = this.consume()
        let numStr = ''
        while (isDigit(this.peek())) {
          numStr += this.consume()
        }
        tokens.push({ type: 'LINE_REF', value: parseInt(numStr, 10), raw: prefix + numStr })
        continue
      }

      // Line References line1, line2
      if (this.input.slice(this.pos).toLowerCase().startsWith('line') && isDigit(this.peek(4))) {
        this.pos += 4 // 'line'
        let numStr = ''
        while (isDigit(this.peek())) {
          numStr += this.consume()
        }
        tokens.push({ type: 'LINE_REF', value: parseInt(numStr, 10), raw: 'line' + numStr })
        continue
      }

      // Numbers (with optional thousands commas like 1,250.50)
      if (isDigit(ch) || (ch === '.' && isDigit(this.peek(1)))) {
        let numStr = ''
        while (isDigit(this.peek()) || this.peek() === '.' || this.peek() === ',') {
          const cur = this.peek()
          if (cur === ',') {
            if (isDigit(this.peek(1)) && isDigit(this.peek(2)) && isDigit(this.peek(3))) {
              this.consume() // skip thousands comma separator
              continue
            } else if (isDigit(this.peek(1))) {
              this.consume() // skip comma
              continue
            } else {
              break
            }
          }
          numStr += this.consume()
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr), raw: numStr })
        continue
      }

      // Currency Prefix Symbols ($10, ₺500, €50, £20, ¥1000, ₹500)
      if (['$', '€', '£', '₺', '¥', '₹'].includes(ch)) {
        tokens.push({ type: 'CURRENCY_SYMBOL', value: this.consume() })
        continue
      }

      // Identifiers / Keywords / Multi-word phrases
      if (isAlpha(ch)) {
        let word = ''
        while (isAlphaNum(this.peek())) {
          word += this.consume()
        }

        const lowerWord = word.toLowerCase()

        // Check multi-word phrase mapping (e.g. gram gold, gram altin, ceyrek gold, troy oz gold)
        const phraseMapped = checkPhraseMapping(word, this.input, this.pos)
        if (phraseMapped) {
          this.pos += phraseMapped.consumedLength
          tokens.push({ type: 'CURRENCY_CODE', value: phraseMapped.code, raw: phraseMapped.raw })
          continue
        }

        const upper = word.toUpperCase()
        if (CURRENCY_MAP[upper] || RATES[upper]) {
          tokens.push({ type: 'CURRENCY_CODE', value: CURRENCY_MAP[upper] || upper, raw: word })
        } else if (['to', 'in', 'of', 'off', 'increase', 'decrease', 'by'].includes(lowerWord)) {
          tokens.push({ type: 'KEYWORD', value: lowerWord })
        } else if (['today', 'now'].includes(lowerWord)) {
          tokens.push({ type: 'DATE_KEYWORD', value: lowerWord })
        } else if (['days', 'day', 'weeks', 'week', 'months', 'month', 'years', 'year', 'hours', 'hour', 'mins', 'min', 'minutes', 'minute'].includes(lowerWord)) {
          tokens.push({ type: 'DATE_UNIT', value: lowerWord })
        } else if (lowerWord === 'subtotal') {
          tokens.push({ type: 'SUBTOTAL', value: 'subtotal' })
        } else if (lowerWord === 'total') {
          tokens.push({ type: 'TOTAL', value: 'total' })
        } else {
          tokens.push({ type: 'IDENT', value: word })
        }
        continue
      }

      // Operators
      if (['+', '-', '*', '/', '^', '%', '=', '(', ')', ','].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: this.consume() })
        continue
      }

      this.consume()
    }

    tokens.push({ type: 'EOF', value: '' })
    return tokens
  }
}
