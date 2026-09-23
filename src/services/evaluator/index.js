import { RESERVED_KEYWORDS, EXAMPLE_TEXT } from './constants.js'
import { RATES, ratesVersion, ratesUpdatedAt, fetchLiveExchangeRates, convertCurrency } from './rates.js'
import { fmtDate, fmtDateTime, formatValue, formatValueWithSymbol } from './formatters.js'
import { Lexer } from './lexer.js'
import { Parser } from './parser.js'
import { evaluateAST } from './astEvaluator.js'

export {
  EXAMPLE_TEXT,
  RESERVED_KEYWORDS,
  RATES,
  ratesVersion,
  ratesUpdatedAt,
  fetchLiveExchangeRates,
  fmtDate,
  fmtDateTime,
  formatValue,
  formatValueWithSymbol,
  Lexer,
  Parser,
  evaluateAST
}

function cleanCommentText(text) {
  if (!text) return ''
  let s = text.trim()
  while (s.startsWith(';') || s.startsWith('/') || s.startsWith('"') || s.startsWith("'")) {
    s = s.slice(1).trim()
  }
  while (s.endsWith('*') || s.endsWith('/') || s.endsWith('"') || s.endsWith("'")) {
    s = s.slice(0, -1).trim()
  }
  return s.trim()
}

// Running sum that keeps a currency. Plain numbers add as they are; currency amounts are
// converted into the first currency the sum meets (10$ + 500 tl stays in dollars).
function createSum() {
  return { value: 0, currency: null }
}

function addToSum(acc, value, currency) {
  if (currency && acc.currency) {
    const converted = convertCurrency(value, currency, acc.currency)
    acc.value += converted === null ? value : converted
    return
  }
  if (currency) acc.currency = currency
  acc.value += value
}

export function formatAmount(value, currency, options = {}) {
  return currency ? formatValueWithSymbol(value, currency, options) : formatValue(value, options)
}

export function evaluateAll(text, options = {}) {
  const _v = ratesVersion.value

  if (text === null || text === undefined) text = ''
  const lines = text.split('\n')
  const ctx = {
    scope: { pi: Math.PI, e: Math.E },
    varCurrencies: {},
    scopeDates: {},
    lineResults: [],
    lineCurrencies: [],
    lineDates: [],
    prev: null,
    prevCurrency: null,
    prevDate: null,
    sum: 0,
    sumCurrency: null,
    options
  }
  const rendered = []
  const total = createSum()
  let sectionSum = createSum() // since the last subtotal line
  let sectionTotal = createSum() // whole section, for the folded summary
  let currentSectionTitle = null
  let currentSectionHeaderIdx = null
  let sectionLineCount = 0
  const sections = []

  function pushLine(entry, value = null, currency = null, date = null) {
    rendered.push(entry)
    ctx.lineResults.push(value)
    ctx.lineCurrencies.push(currency)
    ctx.lineDates.push(date)
  }

  function closeSection(endIdx) {
    if (currentSectionHeaderIdx === null) return
    sections.push({
      headerIdx: currentSectionHeaderIdx,
      title: currentSectionTitle,
      subtotal: sectionTotal.value,
      currency: sectionTotal.currency,
      subtotalText: formatAmount(sectionTotal.value, sectionTotal.currency, options),
      count: sectionLineCount,
      endIdx
    })
  }

  let inMultiLineComment = false
  let activeCommentDelimiter = null

  lines.forEach((raw, lineIdx) => {
    let lineToProcess = raw
    let trimmedRaw = raw.trim()

    // 1. Active multi-line comment block continuation
    if (inMultiLineComment) {
      const cText = cleanCommentText(trimmedRaw)
      if (
        (activeCommentDelimiter === '"""' && trimmedRaw.includes('"""')) ||
        (activeCommentDelimiter === "'''" && trimmedRaw.includes("'''")) ||
        (activeCommentDelimiter === '/*' && trimmedRaw.includes('*/'))
      ) {
        inMultiLineComment = false
        activeCommentDelimiter = null
      }
      pushLine({ cls: 'comment', text: cText })
      return
    }

    if (trimmedRaw === '') {
      pushLine({ cls: 'empty', text: '' })
      return
    }

    // 2. Opening multi-line comment block
    let openingDelimiter = null
    if (trimmedRaw.startsWith('"""')) openingDelimiter = '"""'
    else if (trimmedRaw.startsWith("'''")) openingDelimiter = "'''"
    else if (trimmedRaw.startsWith('/*')) openingDelimiter = '/*'

    if (openingDelimiter) {
      const rest = trimmedRaw.slice(openingDelimiter.length)
      const closingDelimiter = openingDelimiter === '/*' ? '*/' : openingDelimiter
      if (rest.includes(closingDelimiter)) {
        const afterCloseIdx = rest.indexOf(closingDelimiter) + closingDelimiter.length
        const afterComment = rest.slice(afterCloseIdx).trim()
        if (!afterComment) {
          pushLine({ cls: 'comment', text: cleanCommentText(trimmedRaw) })
          return
        }
        // Comment closes on same line with trailing code: advance lineToProcess to afterComment
        lineToProcess = afterComment
      } else {
        inMultiLineComment = true
        activeCommentDelimiter = openingDelimiter
        pushLine({ cls: 'comment', text: cleanCommentText(trimmedRaw) })
        return
      }
    }

    // Native Lexer & Parser execution
    try {
      const tokens = new Lexer(lineToProcess).tokenizeLine()
      const ast = new Parser(tokens).parseLine()

      if (!ast) {
        pushLine({ cls: 'empty', text: '' })
        return
      }

      if (ast.type === 'Comment') {
        pushLine({ cls: 'comment', text: cleanCommentText(ast.value) })
        return
      }

      if (ast.type === 'SectionHeader') {
        closeSection(lineIdx - 1)
        currentSectionHeaderIdx = lineIdx
        currentSectionTitle = ast.title
        sectionSum = createSum()
        sectionTotal = createSum()
        sectionLineCount = 0
        pushLine({ cls: 'section-header', isSection: true, title: ast.title, text: ast.title })
        return
      }

      if (ast.type === 'Subtotal') {
        const { value, currency } = sectionSum
        pushLine({ cls: 'num subtotal-line', isSubtotal: true, text: formatAmount(value, currency, options) }, value, currency)
        ctx.prev = value
        ctx.prevCurrency = currency
        ctx.prevDate = null
        sectionSum = createSum()
        return
      }

      if (ast.type === 'Assignment' && RESERVED_KEYWORDS.has(ast.varName.toLowerCase())) {
        pushLine({ cls: 'err', text: 'Reserved keyword', error: `"${ast.varName}" is a reserved word` })
        return
      }

      ctx.sum = total.value
      ctx.sumCurrency = total.currency
      const evalRes = evaluateAST(ast, ctx)

      if (evalRes.error) {
        pushLine({ cls: 'err', text: '—', error: evalRes.error })
        return
      }

      const varName = evalRes.varName ? evalRes.varName.toLowerCase() : null

      // Date AST Result
      if (evalRes.isDate) {
        const date = { isTime: evalRes.isTimeIncluded }
        if (varName) {
          ctx.scopeDates[varName] = { timestamp: evalRes.value, isTime: evalRes.isTimeIncluded }
          delete ctx.scope[varName]
          delete ctx.varCurrencies[varName]
        }
        const dObj = new Date(evalRes.value)
        const formattedDate = evalRes.isTimeIncluded ? fmtDateTime(dObj) : fmtDate(dObj)
        pushLine({ cls: 'date', text: formattedDate }, evalRes.value, null, date)
        ctx.prev = evalRes.value
        ctx.prevCurrency = null
        ctx.prevDate = date
        return
      }

      const val = evalRes.value
      const curr = evalRes.currency || null

      if (varName) {
        ctx.scope[varName] = val
        delete ctx.scopeDates[varName]
        if (curr) ctx.varCurrencies[varName] = curr
        else delete ctx.varCurrencies[varName]
      }

      let formattedText = ''
      if (val !== null && val !== undefined) {
        formattedText = formatAmount(val, curr, options)
      }

      pushLine({ cls: 'num', text: formattedText }, val, curr)
      if (val !== null) {
        ctx.prev = val
        ctx.prevCurrency = curr
        ctx.prevDate = null
      }

      const isTotalKeywordLine = (ast.type === 'Identifier' && ast.name.toLowerCase() === 'total')
      if (typeof val === 'number' && !isNaN(val) && !isTotalKeywordLine) {
        addToSum(total, val, curr)
        addToSum(sectionSum, val, curr)
        addToSum(sectionTotal, val, curr)
        sectionLineCount++
      }
    } catch (err) {
      pushLine({ cls: 'err', text: '—', error: err.message || 'Could not evaluate this line' })
    }
  })

  closeSection(lines.length - 1)

  return {
    rendered,
    lineResults: ctx.lineResults,
    lineCurrencies: ctx.lineCurrencies,
    sum: total.value,
    sumCurrency: total.currency,
    sumText: formatAmount(total.value, total.currency, options),
    sections,
    count: lines.length
  }
}

export function getFormattedCopyAllText(text, options = {}) {
  const { rendered } = evaluateAll(text, options)
  const lines = (text || '').split('\n')
  return lines.map((line, idx) => {
    const res = rendered[idx]
    if (res && res.text && res.cls !== 'empty' && res.cls !== 'comment' && res.cls !== 'err') {
      return `${line} = ${res.text}`
    }
    return line
  }).join('\n')
}
