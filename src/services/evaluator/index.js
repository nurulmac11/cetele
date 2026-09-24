import { RESERVED_KEYWORDS, EXAMPLE_TEXT, variableKey, emptyTable } from './constants.js'
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
  return { value: 0, currency: null, count: 0 }
}

function addToSum(acc, value, currency) {
  acc.count++
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

// --- Incremental evaluation ---
//
// Editing one line used to re-evaluate the whole document. Now each run saves the evaluation
// state every CHECKPOINT_EVERY lines; the next run of a similar document reuses the results
// above the first changed line and resumes from the nearest checkpoint.

const CHECKPOINT_EVERY = 64
const MAX_REMEMBERED_RUNS = 4
let recentRuns = []

// Results depend on more than the text: rates, formatting options and the clock (today, now)
function runKey(options) {
  return `${ratesVersion.value}|${options.disableFloat ? 1 : 0}|${Math.floor(Date.now() / 60000)}`
}

function copySum(sum) {
  return { ...sum }
}

// Snapshot of everything the loop carries from one line to the next. Tables are copied
// shallowly: their values are replaced on assignment, never mutated.
function takeCheckpoint(st) {
  return {
    scope: emptyTable(st.ctx.scope),
    varCurrencies: emptyTable(st.ctx.varCurrencies),
    scopeDates: emptyTable(st.ctx.scopeDates),
    varLines: emptyTable(st.ctx.varLines),
    prev: st.ctx.prev,
    prevCurrency: st.ctx.prevCurrency,
    prevDate: st.ctx.prevDate,
    prevLine: st.ctx.prevLine,
    total: copySum(st.total),
    sectionSum: copySum(st.sectionSum),
    sectionTotal: copySum(st.sectionTotal),
    currentSectionTitle: st.currentSectionTitle,
    currentSectionHeaderIdx: st.currentSectionHeaderIdx,
    sectionLineCount: st.sectionLineCount,
    sectionsLength: st.sections.length,
    inMultiLineComment: st.inMultiLineComment,
    activeCommentDelimiter: st.activeCommentDelimiter
  }
}

function freshState(options) {
  return {
    ctx: {
      // Prototype-free tables: variable names like "constructor" or "__proto__" are ordinary keys
      scope: emptyTable({ pi: Math.PI, e: Math.E }),
      varCurrencies: emptyTable(),
      scopeDates: emptyTable(),
      lineResults: [],
      lineCurrencies: [],
      lineDates: [],
      prev: null,
      prevCurrency: null,
      prevDate: null,
      sum: 0,
      sumCurrency: null,
      rates: RATES,
      // Which line set each variable and prev, and the lines the current line reads
      varLines: emptyTable(),
      prevLine: null,
      deps: null,
      options
    },
    rendered: [],
    total: createSum(),
    sectionSum: createSum(), // since the last subtotal line
    sectionTotal: createSum(), // whole section, for the folded summary
    currentSectionTitle: null,
    currentSectionHeaderIdx: null,
    sectionLineCount: 0,
    sections: [],
    inMultiLineComment: false,
    activeCommentDelimiter: null
  }
}

// State at line `lineIdx` of an earlier run, from its checkpoint and its per-line arrays
function resumeState(run, lineIdx, options) {
  const cp = run.checkpoints.get(lineIdx)
  const st = freshState(options)
  Object.assign(st.ctx, {
    scope: emptyTable(cp.scope),
    varCurrencies: emptyTable(cp.varCurrencies),
    scopeDates: emptyTable(cp.scopeDates),
    varLines: emptyTable(cp.varLines),
    prev: cp.prev,
    prevCurrency: cp.prevCurrency,
    prevDate: cp.prevDate,
    prevLine: cp.prevLine,
    lineResults: run.result.lineResults.slice(0, lineIdx),
    lineCurrencies: run.result.lineCurrencies.slice(0, lineIdx),
    lineDates: run.lineDates.slice(0, lineIdx)
  })
  st.rendered = run.result.rendered.slice(0, lineIdx)
  st.total = copySum(cp.total)
  st.sectionSum = copySum(cp.sectionSum)
  st.sectionTotal = copySum(cp.sectionTotal)
  st.currentSectionTitle = cp.currentSectionTitle
  st.currentSectionHeaderIdx = cp.currentSectionHeaderIdx
  st.sectionLineCount = cp.sectionLineCount
  st.sections = run.closedSections.slice(0, cp.sectionsLength)
  st.inMultiLineComment = cp.inMultiLineComment
  st.activeCommentDelimiter = cp.activeCommentDelimiter
  return st
}

// The remembered run sharing the longest unchanged beginning with `lines`
function bestRun(lines, key) {
  let best = null
  let bestShared = -1
  for (const run of recentRuns) {
    if (run.key !== key) continue
    const max = Math.min(run.lines.length, lines.length)
    let shared = 0
    while (shared < max && run.lines[shared] === lines[shared]) shared++
    if (shared > bestShared) {
      best = run
      bestShared = shared
    }
  }
  return best ? { run: best, shared: bestShared } : null
}

// For tests
export function _clearEvaluationCache() {
  recentRuns = []
}

export function evaluateAll(text, options = {}) {
  if (text === null || text === undefined) text = ''
  const lines = text.split('\n')
  const key = runKey(options)

  let st = null
  let startLine = 0
  const match = bestRun(lines, key)
  if (match) {
    const { run, shared } = match
    // Same text: the previous result is still exact
    if (shared === lines.length && run.lines.length === lines.length) return run.result
    // Latest checkpoint at or before the first changed line (a run ending exactly on a
    // multiple of CHECKPOINT_EVERY has no checkpoint at its end)
    let resumeAt = Math.floor(shared / CHECKPOINT_EVERY) * CHECKPOINT_EVERY
    while (resumeAt > 0 && !run.checkpoints.has(resumeAt)) resumeAt -= CHECKPOINT_EVERY
    if (resumeAt > 0) {
      st = resumeState(run, resumeAt, options)
      startLine = resumeAt
    }
  }
  if (!st) st = freshState(options)

  const checkpoints = new Map()
  // Checkpoints before the resume point are still valid for this text
  if (match && startLine > 0) {
    for (const [idx, cp] of match.run.checkpoints) if (idx <= startLine) checkpoints.set(idx, cp)
  }

  for (let lineIdx = startLine; lineIdx < lines.length; lineIdx++) {
    if (lineIdx > 0 && lineIdx % CHECKPOINT_EVERY === 0 && !checkpoints.has(lineIdx)) {
      checkpoints.set(lineIdx, takeCheckpoint(st))
    }
    evaluateLine(st, lines[lineIdx], lineIdx, options)
  }

  // Sections closed inside the loop, before the last one is closed below
  const closedSections = st.sections.slice()
  closeSection(st, lines.length - 1, options)

  const { ctx, total } = st
  const result = {
    rendered: st.rendered,
    lineResults: ctx.lineResults,
    lineCurrencies: ctx.lineCurrencies,
    sum: total.value,
    sumCurrency: total.currency,
    sumText: formatAmount(total.value, total.currency, options),
    sections: st.sections,
    count: lines.length
  }

  recentRuns = [
    { key, lines, checkpoints, closedSections, lineDates: ctx.lineDates, result },
    ...recentRuns.filter((r) => r !== match?.run)
  ].slice(0, MAX_REMEMBERED_RUNS)
  return result
}

function pushLine(st, entry, value = null, currency = null, date = null) {
  const { ctx } = st
  if (ctx.deps?.size) entry.deps = [...ctx.deps].sort((a, b) => a - b)
  ctx.deps = null
  st.rendered.push(entry)
  ctx.lineResults.push(value)
  ctx.lineCurrencies.push(currency)
  ctx.lineDates.push(date)
}

function closeSection(st, endIdx, options) {
  if (st.currentSectionHeaderIdx === null) return
  st.sections.push({
    headerIdx: st.currentSectionHeaderIdx,
    title: st.currentSectionTitle,
    subtotal: st.sectionTotal.value,
    currency: st.sectionTotal.currency,
    subtotalText: formatAmount(st.sectionTotal.value, st.sectionTotal.currency, options),
    count: st.sectionLineCount,
    endIdx
  })
}

function evaluateLine(st, raw, lineIdx, options) {
  const { ctx } = st
  const push = (...args) => pushLine(st, ...args)
  ctx.deps = new Set()
  let lineToProcess = raw
  let trimmedRaw = raw.trim()

  // 1. Active multi-line comment block continuation
  if (st.inMultiLineComment) {
    const cText = cleanCommentText(trimmedRaw)
    if (
      (st.activeCommentDelimiter === '"""' && trimmedRaw.includes('"""')) ||
      (st.activeCommentDelimiter === "'''" && trimmedRaw.includes("'''")) ||
      (st.activeCommentDelimiter === '/*' && trimmedRaw.includes('*/'))
    ) {
      st.inMultiLineComment = false
      st.activeCommentDelimiter = null
    }
    push({ cls: 'comment', text: cText })
    return
  }

  if (trimmedRaw === '') {
    push({ cls: 'empty', text: '' })
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
        push({ cls: 'comment', text: cleanCommentText(trimmedRaw) })
        return
      }
      // Comment closes on same line with trailing code: advance lineToProcess to afterComment
      lineToProcess = afterComment
    } else {
      st.inMultiLineComment = true
      st.activeCommentDelimiter = openingDelimiter
      push({ cls: 'comment', text: cleanCommentText(trimmedRaw) })
      return
    }
  }
  // Native Lexer & Parser execution
  try {
    const tokens = new Lexer(lineToProcess).tokenizeLine()
    const ast = new Parser(tokens).parseLine()

    if (!ast) {
      push({ cls: 'empty', text: '' })
      return
    }

    if (ast.type === 'Comment') {
      push({ cls: 'comment', text: cleanCommentText(ast.value) })
      return
    }

    if (ast.type === 'SectionHeader') {
      closeSection(st, lineIdx - 1, options)
      st.currentSectionHeaderIdx = lineIdx
      st.currentSectionTitle = ast.title
      st.sectionSum = createSum()
      st.sectionTotal = createSum()
      st.sectionLineCount = 0
      push({ cls: 'section-header', isSection: true, title: ast.title, text: ast.title })
      return
    }

    if (ast.type === 'Subtotal') {
      const { value, currency } = st.sectionSum
      push(
        { cls: 'num subtotal-line', isSubtotal: true, text: formatAmount(value, currency, options) },
        value,
        currency
      )
      ctx.prev = value
      ctx.prevLine = lineIdx
      ctx.prevCurrency = currency
      ctx.prevDate = null
      st.sectionSum = createSum()
      return
    }

    // avg / average / count: over the lines since the section header or last subtotal.
    // A variable with the same name wins, so existing documents keep working.
    if (ast.type === 'Aggregate' && ctx.scope[variableKey(ast.name)] === undefined) {
      const { value: sumValue, currency, count } = st.sectionSum
      const value = ast.kind === 'count' ? count : count > 0 ? sumValue / count : 0
      const valueCurrency = ast.kind === 'count' ? null : currency
      push(
        { cls: 'num aggregate-line', isAggregate: true, text: formatAmount(value, valueCurrency, options) },
        value,
        valueCurrency
      )
      ctx.prev = value
      ctx.prevLine = lineIdx
      ctx.prevCurrency = valueCurrency
      ctx.prevDate = null
      return
    }

    if (ast.type === 'Assignment' && RESERVED_KEYWORDS.has(variableKey(ast.varName))) {
      push({ cls: 'err', text: 'Reserved keyword', error: `"${ast.varName}" is a reserved word` })
      return
    }

    ctx.sum = st.total.value
    ctx.sumCurrency = st.total.currency
    const evalRes = evaluateAST(ast.type === 'Aggregate' ? { type: 'Identifier', name: ast.name } : ast, ctx)

    // Waiting for historical exchange rates; evaluation re-runs when they arrive
    if (evalRes.pending) {
      push({ cls: 'pending', text: '…', error: evalRes.error })
      return
    }

    if (evalRes.error) {
      push({ cls: 'err', text: '—', error: evalRes.error })
      return
    }

    const varName = evalRes.varName ? variableKey(evalRes.varName) : null

    // Date AST Result
    if (evalRes.isDate) {
      const date = { isTime: evalRes.isTimeIncluded }
      if (varName) {
        ctx.scopeDates[varName] = { timestamp: evalRes.value, isTime: evalRes.isTimeIncluded }
        ctx.varLines[varName] = lineIdx
        delete ctx.scope[varName]
        delete ctx.varCurrencies[varName]
      }
      const dObj = new Date(evalRes.value)
      const formattedDate = evalRes.isTimeIncluded ? fmtDateTime(dObj) : fmtDate(dObj)
      push({ cls: 'date', text: formattedDate }, evalRes.value, null, date)
      ctx.prev = evalRes.value
      ctx.prevLine = lineIdx
      ctx.prevCurrency = null
      ctx.prevDate = date
      return
    }

    const val = evalRes.value
    const curr = evalRes.currency || null

    if (varName) {
      ctx.scope[varName] = val
      ctx.varLines[varName] = lineIdx
      delete ctx.scopeDates[varName]
      if (curr) ctx.varCurrencies[varName] = curr
      else delete ctx.varCurrencies[varName]
    }

    let formattedText = ''
    if (val !== null && val !== undefined) {
      formattedText = formatAmount(val, curr, options)
    }

    push(
      evalRes.note ? { cls: 'num', text: formattedText, note: evalRes.note } : { cls: 'num', text: formattedText },
      val,
      curr
    )
    if (val !== null) {
      ctx.prev = val
      ctx.prevLine = lineIdx
      ctx.prevCurrency = curr
      ctx.prevDate = null
    }

    const isTotalKeywordLine = ast.type === 'Identifier' && ast.name.toLowerCase() === 'total'
    if (typeof val === 'number' && !isNaN(val) && !isTotalKeywordLine) {
      addToSum(st.total, val, curr)
      addToSum(st.sectionSum, val, curr)
      addToSum(st.sectionTotal, val, curr)
      st.sectionLineCount++
    }
  } catch (err) {
    // A RangeError here is a stack overflow from an extremely long expression (e.g. 50,000 terms)
    const message = err instanceof RangeError ? 'This line is too long to evaluate' : err.message
    push({ cls: 'err', text: '—', error: message || 'Could not evaluate this line' })
  }
}

export function getFormattedCopyAllText(text, options = {}) {
  const { rendered } = evaluateAll(text, options)
  const lines = (text || '').split('\n')
  return lines
    .map((line, idx) => {
      const res = rendered[idx]
      if (res && res.text && res.cls !== 'empty' && res.cls !== 'comment' && res.cls !== 'err') {
        return `${line} = ${res.text}`
      }
      return line
    })
    .join('\n')
}
