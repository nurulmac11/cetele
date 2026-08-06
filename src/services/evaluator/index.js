import { RESERVED_KEYWORDS, EXAMPLE_TEXT } from './constants.js'
import { RATES, ratesVersion, fetchLiveExchangeRates } from './rates.js'
import { fmtDate, fmtDateTime, formatValue, formatValueWithSymbol } from './formatters.js'
import { Lexer } from './lexer.js'
import { Parser } from './parser.js'
import { evaluateAST } from './astEvaluator.js'

export {
  EXAMPLE_TEXT,
  RESERVED_KEYWORDS,
  RATES,
  ratesVersion,
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

export function evaluateAll(text, options = {}) {
  const _v = ratesVersion.value

  if (text === null || text === undefined) text = ''
  const lines = text.split('\n')
  const scope = { pi: Math.PI, e: Math.E }
  const varCurrencies = {}
  const lineCurrencies = []
  const scopeDates = {}
  let prev = null
  let prevCurrency = null
  let sum = 0
  const rendered = []
  const lineResults = []
  let currentSectionTitle = null
  let currentSectionHeaderIdx = null
  let sectionSum = 0
  let sectionTotalSum = 0
  let sectionLineCount = 0
  const sections = []

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
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    if (trimmedRaw === '') {
      rendered.push({ cls: 'empty', text: '' })
      lineResults.push(null)
      lineCurrencies.push(null)
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
          const cText = cleanCommentText(trimmedRaw)
          rendered.push({ cls: 'comment', text: cText })
          lineResults.push(null)
          lineCurrencies.push(null)
          return
        } else {
          // Comment closes on same line with trailing code: advance lineToProcess to afterComment
          lineToProcess = afterComment
        }
      } else {
        inMultiLineComment = true
        activeCommentDelimiter = openingDelimiter
        const cText = cleanCommentText(trimmedRaw)
        rendered.push({ cls: 'comment', text: cText })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
    }

    // Native Lexer & Parser execution
    try {
      const lexer = new Lexer(lineToProcess)
      const tokens = lexer.tokenizeLine()
      const parser = new Parser(tokens)
      const ast = parser.parseLine()

      if (!ast) {
        rendered.push({ cls: 'empty', text: '' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      if (ast.type === 'Comment') {
        const cText = cleanCommentText(ast.value)
        rendered.push({ cls: 'comment', text: cText })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      if (ast.type === 'SectionHeader') {
        const sectionTitle = ast.title
        if (currentSectionHeaderIdx !== null) {
          sections.push({
            headerIdx: currentSectionHeaderIdx,
            title: currentSectionTitle,
            subtotal: sectionTotalSum,
            count: sectionLineCount,
            endIdx: lineIdx - 1
          })
        }
        currentSectionHeaderIdx = lineIdx
        currentSectionTitle = sectionTitle
        sectionSum = 0
        sectionTotalSum = 0
        sectionLineCount = 0

        rendered.push({ cls: 'section-header', isSection: true, title: sectionTitle, text: `=== ${sectionTitle} ===` })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      if (ast.type === 'Subtotal') {
        const formatted = formatValue(sectionSum, options)
        rendered.push({ cls: 'num subtotal-line', isSubtotal: true, text: formatted })
        lineResults.push(sectionSum)
        lineCurrencies.push(null)
        prev = sectionSum
        sectionSum = 0
        return
      }

      if (ast.type === 'Assignment' && RESERVED_KEYWORDS.has(ast.varName.toLowerCase())) {
        rendered.push({ cls: 'err', text: 'Reserved keyword' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      const evalRes = evaluateAST(ast, scope, varCurrencies, lineCurrencies, lineResults, scopeDates, prev, prevCurrency, sum, options)

      if (evalRes.error) {
        rendered.push({ cls: 'err', text: '—' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      // Date AST Result
      if (evalRes.isDate) {
        if (evalRes.varName) {
          scopeDates[evalRes.varName] = {
            timestamp: evalRes.value,
            isTime: evalRes.isTimeIncluded
          }
        }
        const dObj = new Date(evalRes.value)
        const formattedDate = evalRes.isTimeIncluded ? fmtDateTime(dObj) : fmtDate(dObj)

        rendered.push({ cls: 'date', text: formattedDate })
        lineResults.push(evalRes.value)
        lineCurrencies.push(null)
        prev = evalRes.value
        prevCurrency = null
        return
      }

      const val = evalRes.value
      const curr = evalRes.currency

      if (evalRes.varName) {
        scope[evalRes.varName] = val
        if (curr) varCurrencies[evalRes.varName] = curr
      }

      let formattedText = ''
      if (val === null || val === undefined) {
        formattedText = ''
      } else if (curr) {
        formattedText = formatValueWithSymbol(val, curr, options)
      } else {
        formattedText = formatValue(val, options)
      }

      rendered.push({ cls: 'num', text: formattedText })
      lineResults.push(val)
      lineCurrencies.push(curr || null)
      if (val !== null) {
        prev = val
        prevCurrency = curr || null
      }

      const isTotalKeywordLine = (ast.type === 'Identifier' && ast.name.toLowerCase() === 'total')
      if (typeof val === 'number' && !isNaN(val) && !isTotalKeywordLine) {
        sum += val
        sectionSum += val
        sectionTotalSum += val
        sectionLineCount++
      }
    } catch (err) {
      rendered.push({ cls: 'err', text: '—' })
      lineResults.push(null)
      lineCurrencies.push(null)
    }
  })

  if (currentSectionHeaderIdx !== null) {
    sections.push({
      headerIdx: currentSectionHeaderIdx,
      title: currentSectionTitle,
      subtotal: sectionTotalSum,
      count: sectionLineCount,
      endIdx: lines.length - 1
    })
  }

  return {
    rendered,
    lineResults,
    lineCurrencies,
    sum,
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
