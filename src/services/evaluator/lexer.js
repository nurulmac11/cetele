import { CURRENCY_MAP, RATES, CORE_CURRENCY_CODES } from './rates.js'

function isDigit(ch) {
  return ch >= '0' && ch <= '9'
}

// Any Unicode letter, so Turkish words like maaş, ödeme, altın and çeyrek stay whole
function isAlpha(ch) {
  return ch === '_' || (ch !== '' && /\p{L}/u.test(ch))
}

function isAlphaNum(ch) {
  return isAlpha(ch) || isDigit(ch)
}

function isWhitespace(ch) {
  return ch === ' ' || ch === '\t' || ch === '\r'
}

// Local-midnight timestamp for a calendar date, or null when the date doesn't exist (2026-02-30)
function calendarDate(year, month, day) {
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return d.getTime()
}

// Date literals: ISO 2026-12-31 and Turkish/European 31.12.2026
function matchDateLiteral(rest) {
  let m = rest.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?![\d.])/)
  if (m) return { length: m[0].length, timestamp: calendarDate(+m[1], +m[2], +m[3]) }
  m = rest.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?![\d.])/)
  if (m) return { length: m[0].length, timestamp: calendarDate(+m[3], +m[2], +m[1]) }
  return null
}

// Compound or powered unit written without spaces: km/h, m/s^2, kg*m/s^2, m^2, cm^3
const COMPOUND_UNIT_RE = /^[A-Za-z]+(?:\^\d+(?:[/*][A-Za-z]+(?:\^\d+)?)*|(?:[/*][A-Za-z]+(?:\^\d+)?)+)/

function checkPhraseMapping(word, input, pos) {
  // The longest phrase is " ounces gold"; a short window keeps lexing long lines linear
  const rest = input.slice(pos, pos + 24).toLowerCase()
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
    // Comment ranges within the line ({ start, end }), for syntax highlighting.
    // Inline comments produce no token, so the parser never sees them.
    this.comments = []
  }

  // True when only whitespace follows (stops at the first other character)
  onlySpaceFrom(pos) {
    for (let i = pos; i < this.length; i++) {
      if (!isWhitespace(this.input[i])) return false
    }
    return true
  }

  peek(offset = 0) {
    return this.input[this.pos + offset] || ''
  }

  consume() {
    return this.input[this.pos++] || ''
  }

  tokenizeLine() {
    const tokens = []

    // Check for Section Header (=== Title ===, --- Title ---, // === Title ===)
    let sLine = this.input.trim()
    if (sLine.startsWith('//')) sLine = sLine.slice(2).trim()

    const isAssignAttempt = sLine.includes('=') && !sLine.startsWith('===')
    if (!isAssignAttempt && (sLine.startsWith('===') || sLine.startsWith('---'))) {
      let title = sLine
      while (title.startsWith('=') || title.startsWith('-') || title.startsWith(' ')) title = title.slice(1)
      while (title.endsWith('=') || title.endsWith('-') || title.endsWith(' ')) title = title.slice(0, -1)

      if (title && !isDigit(title[0])) {
        return [
          { type: 'SECTION_HEADER', value: title, raw: this.input.trim() },
          { type: 'EOF', value: '' }
        ]
      }
    }

    // Each loop pass emits at most one token; record its source range as start/end
    let passStart = 0
    let countBefore = 0
    const markPassToken = () => {
      const last = tokens[tokens.length - 1]
      if (tokens.length > countBefore && last.start === undefined) {
        last.start = passStart
        last.end = this.pos
      }
    }

    while (this.pos < this.length) {
      markPassToken()
      passStart = this.pos
      countBefore = tokens.length
      const ch = this.peek()

      if (isWhitespace(ch)) {
        this.consume()
        continue
      }

      // Single line comments //
      if (ch === '/' && this.peek(1) === '/') {
        const commentText = this.input.slice(this.pos)
        this.comments.push({ start: this.pos, end: this.length })
        // If this comment is standalone on line, emit COMMENT token
        if (tokens.length === 0) {
          tokens.push({ type: 'COMMENT', value: commentText })
        }
        this.pos = this.length
        break
      }

      // Multi-line / Block comment openers /* or """ or '''
      if (
        (ch === '/' && this.peek(1) === '*') ||
        (ch === '"' && this.peek(1) === '"' && this.peek(2) === '"') ||
        (ch === "'" && this.peek(1) === "'" && this.peek(2) === "'")
      ) {
        const delim = ch === '/' ? '*/' : ch === '"' ? '"""' : "'''"
        const openLen = ch === '/' ? 2 : 3
        this.pos += openLen
        const closeIdx = this.input.indexOf(delim, this.pos)
        if (closeIdx !== -1) {
          const commentContent = this.input.slice(this.pos, closeIdx)
          this.pos = closeIdx + delim.length
          this.comments.push({ start: passStart, end: this.pos })
          const restOfLine = this.onlySpaceFrom(this.pos) ? '' : 'code'

          // Emit COMMENT token ONLY if it is a standalone comment line (no preceding or trailing code)
          if (tokens.length === 0 && restOfLine === '') {
            tokens.push({ type: 'COMMENT', value: commentContent })
          }
          // Inline comment inside expression: skip comment and continue tokenizing rest of expression
          continue
        } else {
          const commentContent = this.input.slice(this.pos)
          this.pos = this.length
          this.comments.push({ start: passStart, end: this.length })
          if (tokens.length === 0) {
            tokens.push({ type: 'COMMENT', value: commentContent })
          }
          break
        }
      }

      // Line References #1, #2, #10
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
      if (this.input.slice(this.pos, this.pos + 4).toLowerCase() === 'line' && isDigit(this.peek(4))) {
        this.pos += 4 // 'line'
        let numStr = ''
        while (isDigit(this.peek())) {
          numStr += this.consume()
        }
        tokens.push({ type: 'LINE_REF', value: parseInt(numStr, 10), raw: 'line' + numStr })
        continue
      }

      // Date literals (2026-12-31, 31.12.2026)
      if (isDigit(ch)) {
        const date = matchDateLiteral(this.input.slice(this.pos, this.pos + 16))
        if (date) {
          const raw = this.input.slice(this.pos, this.pos + date.length)
          this.pos += date.length
          tokens.push({ type: 'DATE_LITERAL', value: date.timestamp, raw })
          continue
        }
      }

      // Numbers (with optional thousands commas like 1,250.50, and suffix multipliers like 500k, 2m, 1.5b, 3t)
      if (isDigit(ch) || (ch === '.' && isDigit(this.peek(1)))) {
        let numStr = ''
        while (isDigit(this.peek()) || this.peek() === '.' || this.peek() === ',') {
          const cur = this.peek()
          if (cur === ',') {
            // Only consume comma as thousands separator if followed by exactly 3 digits not followed by a 4th digit
            if (isDigit(this.peek(1)) && isDigit(this.peek(2)) && isDigit(this.peek(3)) && !isDigit(this.peek(4))) {
              this.consume() // skip thousands comma separator
              continue
            } else {
              break // leave comma as separator for functions like min(1,2)
            }
          }
          numStr += this.consume()
        }

        // Scientific notation (1e3, 2.5E-4)
        const expSign = this.peek(1) === '+' || this.peek(1) === '-'
        if ((this.peek() === 'e' || this.peek() === 'E') && isDigit(this.peek(expSign ? 2 : 1))) {
          numStr += this.consume()
          if (expSign) numStr += this.consume()
          while (isDigit(this.peek())) numStr += this.consume()
        }

        let numVal = parseFloat(numStr)

        const MULTIPLIERS = {
          k: 1e3,
          m: 1e6,
          b: 1e9,
          t: 1e12
        }
        const nextCh = this.peek()
        const nextLower = nextCh ? nextCh.toLowerCase() : ''

        // An attached 'm' before a conversion (500m to km) means metres, not million
        const afterSuffix = this.input.slice(this.pos + 1, this.pos + 65)
        // ...and so does 'm' starting a compound unit (500m/s, 9.8m/s^2)
        const isMetresBeforeConversion =
          nextLower === 'm' && (/^\s+(to|in)\b/i.test(afterSuffix) || /^(\/[A-Za-z]|\^\d)/.test(afterSuffix))
        if (MULTIPLIERS[nextLower] && !isAlpha(this.peek(1)) && !isMetresBeforeConversion) {
          const suffixChar = this.consume()
          numVal = numVal * MULTIPLIERS[nextLower]
          numStr = numStr + suffixChar
        }

        tokens.push({ type: 'NUMBER', value: numVal, raw: numStr })
        continue
      }

      // Currency Prefix Symbols ($10, ₺500, €50, £20, ¥1000, ₹500)
      if (['$', '€', '£', '₺', '¥', '₹'].includes(ch)) {
        tokens.push({ type: 'CURRENCY_SYMBOL', value: this.consume() })
        continue
      }

      // Identifiers / Keywords / Multi-word phrases
      if (isAlpha(ch)) {
        // In unit position (after a number, or after to/in), read km/h or m/s^2 as one unit
        const prevTok = tokens[tokens.length - 1]
        const isUnitPosition =
          prevTok?.type === 'NUMBER' ||
          (prevTok?.type === 'KEYWORD' && (prevTok.value === 'to' || prevTok.value === 'in'))
        const compound = isUnitPosition ? this.input.slice(this.pos, this.pos + 64).match(COMPOUND_UNIT_RE) : null
        if (compound) {
          this.pos += compound[0].length
          tokens.push({ type: 'IDENT', value: compound[0], isCompoundUnit: true })
          continue
        }

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
        // Extra ISO codes from the live feed (MXN, PLN...) only count when written in capitals,
        // so words like 'all', 'top' or 'cup' stay usable as variables and units
        const isExtraCurrency = RATES[upper] && !CORE_CURRENCY_CODES.has(upper) && word === upper
        if (CURRENCY_MAP[upper] || (RATES[upper] && CORE_CURRENCY_CODES.has(upper)) || isExtraCurrency) {
          tokens.push({ type: 'CURRENCY_CODE', value: CURRENCY_MAP[upper] || upper, raw: word })
        } else if (['to', 'in', 'of', 'off', 'increase', 'decrease', 'by', 'until', 'since'].includes(lowerWord)) {
          tokens.push({ type: 'KEYWORD', value: lowerWord })
        } else if (['today', 'now'].includes(lowerWord)) {
          tokens.push({ type: 'DATE_KEYWORD', value: lowerWord })
        } else if (
          [
            'days',
            'day',
            'weeks',
            'week',
            'months',
            'month',
            'years',
            'year',
            'hours',
            'hour',
            'mins',
            'min',
            'minutes',
            'minute'
          ].includes(lowerWord)
        ) {
          let peekIdx = 0
          while (isWhitespace(this.peek(peekIdx))) peekIdx++
          if (this.peek(peekIdx) === '(') {
            tokens.push({ type: 'IDENT', value: word })
          } else {
            tokens.push({ type: 'DATE_UNIT', value: lowerWord })
          }
        } else if (lowerWord === 'subtotal') {
          tokens.push({ type: 'SUBTOTAL', value: 'subtotal' })
        } else if (lowerWord === 'total') {
          tokens.push({ type: 'TOTAL', value: 'total' })
        } else {
          tokens.push({ type: 'IDENT', value: word })
        }
        continue
      }

      // Typographic multiply / divide signs
      if (ch === '×' || ch === '÷') {
        this.consume()
        tokens.push({ type: 'OPERATOR', value: ch === '×' ? '*' : '/' })
        continue
      }

      // Operators
      if (['+', '-', '*', '/', '^', '%', '=', '(', ')', ',', '@'].includes(ch)) {
        tokens.push({ type: 'OPERATOR', value: this.consume() })
        continue
      }

      this.consume()
    }

    markPassToken()
    tokens.push({ type: 'EOF', value: '' })
    return tokens
  }
}
