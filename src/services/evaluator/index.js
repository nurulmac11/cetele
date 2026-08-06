import { RESERVED_KEYWORDS, EXAMPLE_TEXT } from './constants.js'
import { RATES, ratesVersion, fetchLiveExchangeRates } from './rates.js'
import { stripCommaSeparators, fmtDate, fmtDateTime, formatValue, formatValueWithSymbol } from './formatters.js'
import { Lexer } from './lexer.js'
import { Parser } from './parser.js'
import { evaluateAST } from './astEvaluator.js'

export {
  EXAMPLE_TEXT,
  RESERVED_KEYWORDS,
  RATES,
  ratesVersion,
  fetchLiveExchangeRates,
  stripCommaSeparators,
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
  let s = text
    .replace(/^;\s*/, '')
    .replace(/^"""/, '')
    .replace(/"""$/, '')
    .replace(/^'''/, '')
    .replace(/'''$/, '')
    .replace(/^\/\*/, '')
    .replace(/\*\/$/, '')
    .replace(/^\/\//, '')
    .replace(/^#/, '')
    .trim()
  return s
}

function preprocessGoldAndCrypto(line) {
  let l = line
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:grams?|g)?\s*(?:of\s*)?(?:gold|alt[ıi]n)\b/gi, '$1 GRAM_GOLD')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:troy\s*)?(?:oz|ounces?)\s*(?:of\s*)?gold\b/gi, '$1 XAU')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*(?:[çc]eyrek(?:\s*(?:alt[ıi]n|gold))?)\b/gi, '$1 CEYREK_GOLD')

  l = l.replace(/(-?\d+(?:\.\d+)?)\s*bitcoins?\b/gi, '$1 BTC')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*ethereums?\b/gi, '$1 ETH')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*solanas?\b/gi, '$1 SOL')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*dogecoins?\b/gi, '$1 DOGE')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*tethers?\b/gi, '$1 USDT')
  l = l.replace(/(-?\d+(?:\.\d+)?)\s*cardanos?\b/gi, '$1 ADA')

  return l
}

function tryDateLine(rawLine, scopeDates = {}) {
  let line = rawLine.trim()
  let varName = null

  const mAssign = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (mAssign) {
    varName = mAssign[1]
    line = mAssign[2].trim()
  }

  if (!/\b(today|now)\b/i.test(line) && !Object.keys(scopeDates).some(k => new RegExp(`\\b${k}\\b`, 'i').test(line))) {
    return null
  }

  let baseTime = Date.now()
  let isTimeIncluded = /\bnow\b/i.test(line)

  const mBase = line.match(/^(today|now|[a-zA-Z_][a-zA-Z0-9_]*)/i)
  if (mBase) {
    const token = mBase[1].toLowerCase()
    if (token === 'today') {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      baseTime = d.getTime()
    } else if (token === 'now') {
      baseTime = Date.now()
      isTimeIncluded = true
    } else if (scopeDates[token]) {
      baseTime = scopeDates[token].timestamp
      if (scopeDates[token].isTime) isTimeIncluded = true
    }
  }

  const offsetRegex = /([+-])\s*(\d+)\s*(days?|weeks?|months?|years?|hours?|mins?|minutes?)/gi
  let m
  let currentTimestamp = baseTime

  while ((m = offsetRegex.exec(line)) !== null) {
    const sign = m[1] === '+' ? 1 : -1
    const amount = parseInt(m[2], 10) * sign
    const unit = m[3].toLowerCase()
    const d = new Date(currentTimestamp)

    if (unit.startsWith('day')) d.setDate(d.getDate() + amount)
    else if (unit.startsWith('week')) d.setDate(d.getDate() + amount * 7)
    else if (unit.startsWith('month')) d.setMonth(d.getMonth() + amount)
    else if (unit.startsWith('year')) d.setFullYear(d.getFullYear() + amount)
    else if (unit.startsWith('hour')) { d.setHours(d.getHours() + amount); isTimeIncluded = true }
    else if (unit.startsWith('min')) { d.setMinutes(d.getMinutes() + amount); isTimeIncluded = true }

    currentTimestamp = d.getTime()
  }

  return {
    varName,
    timestamp: currentTimestamp,
    isTimeIncluded
  }
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
    let trimmedRaw = raw.replace(/^;\s*/, '').trim()

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
          trimmedRaw = afterComment
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

    // 3. Strip inline block comments from calculation lines
    trimmedRaw = trimmedRaw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/"""[\s\S]*?"""/g, '')
      .replace(/'''[\s\S]*?'''/g, '')
      .trim()

    if (trimmedRaw === '') {
      const cText = cleanCommentText(raw)
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    // Check for Section Header (e.g. === Income ===, --- Expenses ---, # Income, // === Notes ===)
    const isAssign = /^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(trimmedRaw)
    const mSection = !isAssign ? trimmedRaw.match(/^(?:\/\/\s*)?(?:={3,}|-{3,}|#{1,3}\s+)\s*(.+?)(?:\s*(?:={3,}|-{3,}|#{1,3}))?$/) : null
    if (mSection) {
      const sectionTitle = mSection[1].replace(/^#+\s*/, '').trim()
      if (sectionTitle && !/^\d+$/.test(sectionTitle)) {
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
    }

    // Single-line comment (starts with // or # when not a section header or line reference)
    if (trimmedRaw.startsWith('//') || (trimmedRaw.startsWith('#') && !/^(?:#\d+|L\d+|line\d+)/i.test(trimmedRaw))) {
      const cText = cleanCommentText(trimmedRaw)
      rendered.push({ cls: 'comment', text: cText })
      lineResults.push(null)
      lineCurrencies.push(null)
      return
    }

    const cleanRaw = preprocessGoldAndCrypto(stripCommaSeparators(trimmedRaw))

    // Check for standalone subtotal keyword line
    if (/^subtotal\s*(?:\/\/.*)?$/i.test(cleanRaw)) {
      const formatted = formatValue(sectionSum, options)
      rendered.push({ cls: 'num subtotal-line', isSubtotal: true, text: formatted })
      lineResults.push(sectionSum)
      lineCurrencies.push(null)
      prev = sectionSum
      sectionSum = 0
      return
    }

    // Date Arithmetic Check
    const dateHit = tryDateLine(cleanRaw, scopeDates)
    if (dateHit) {
      if (dateHit.varName && RESERVED_KEYWORDS.has(dateHit.varName.toLowerCase())) {
        rendered.push({ cls: 'err', text: 'Reserved keyword' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }
      if (dateHit.varName) {
        scopeDates[dateHit.varName] = {
          timestamp: dateHit.timestamp,
          isTime: dateHit.isTimeIncluded
        }
      }
      const dObj = new Date(dateHit.timestamp)
      const formattedDate = dateHit.isTimeIncluded ? fmtDateTime(dObj) : fmtDate(dObj)

      rendered.push({ cls: 'date', text: formattedDate })
      lineResults.push(dateHit.timestamp)
      lineCurrencies.push(null)
      prev = dateHit.timestamp
      prevCurrency = null
      return
    }

    // Evaluate Math & Currency Expressions using Lexer & Recursive-Descent Parser
    try {
      const lexer = new Lexer(cleanRaw)
      const tokens = lexer.tokenizeLine()
      const parser = new Parser(tokens)
      const ast = parser.parseLine()

      if (!ast) {
        rendered.push({ cls: 'empty', text: '' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      if (ast.type === 'Assignment' && RESERVED_KEYWORDS.has(ast.varName.toLowerCase())) {
        rendered.push({ cls: 'err', text: 'Reserved keyword' })
        lineResults.push(null)
        lineCurrencies.push(null)
        return
      }

      const evalRes = evaluateAST(ast, scope, varCurrencies, lineCurrencies, lineResults, prev, prevCurrency, sum, options)

      if (evalRes.error) {
        rendered.push({ cls: 'err', text: evalRes.error })
        lineResults.push(null)
        lineCurrencies.push(null)
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

      const isTotalKeywordLine = /^total$/i.test(cleanRaw.trim())
      if (typeof val === 'number' && !isNaN(val) && !isTotalKeywordLine) {
        sum += val
        sectionSum += val
        sectionTotalSum += val
        sectionLineCount++
      }
    } catch (err) {
      rendered.push({ cls: 'empty', text: '' })
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
