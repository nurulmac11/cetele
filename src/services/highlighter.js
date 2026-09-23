import { Lexer } from './evaluator/index.js'

// Words the highlighter shows as keywords even though the lexer treats them as identifiers
const KEYWORD_IDENTS = new Set(['prev', 'pi', 'e', 'avg', 'average', 'count'])

const TOKEN_CLASSES = {
  NUMBER: 'tok-number',
  DATE_LITERAL: 'tok-number',
  LINE_REF: 'tok-number',
  CURRENCY_SYMBOL: 'tok-currency',
  CURRENCY_CODE: 'tok-currency',
  KEYWORD: 'tok-keyword',
  DATE_KEYWORD: 'tok-keyword',
  DATE_UNIT: 'tok-keyword',
  SUBTOTAL: 'tok-keyword',
  TOTAL: 'tok-keyword',
  OPERATOR: 'tok-op',
  COMMENT: 'tok-comment'
}

function identifierClass(tokens, idx) {
  const tok = tokens[idx]
  const before = tokens[idx - 1]
  const after = tokens[idx + 1]
  if (after?.type === 'OPERATOR' && after.value === '(') return 'tok-keyword' // function call
  if (KEYWORD_IDENTS.has(String(tok.value).toLowerCase())) return 'tok-keyword'
  // A word right after a number or after to/in is a unit (5 km, 12 km to miles)
  if (before?.type === 'NUMBER' || (before?.type === 'KEYWORD' && (before.value === 'to' || before.value === 'in'))) {
    return 'tok-unit'
  }
  return 'tok-variable'
}

// Highlights one line with the evaluator's own lexer, so colours always match how the line is evaluated
export function tokenizeCodePart(code) {
  if (!code) return []

  const lexer = new Lexer(code)
  const tokens = lexer.tokenizeLine().filter((t) => t.type !== 'EOF')
  const spans = []
  tokens.forEach((tok, idx) => {
    if (tok.start === undefined) return
    const cls = tok.type === 'IDENT' ? identifierClass(tokens, idx) : TOKEN_CLASSES[tok.type] || 'tok-code'
    spans.push({ start: tok.start, end: tok.end, cls })
  })
  lexer.comments.forEach((c) => spans.push({ start: c.start, end: c.end, cls: 'tok-comment' }))
  spans.sort((a, b) => a.start - b.start)

  // Fill the gaps (spaces, characters the lexer skips) with plain text
  const result = []
  let cursor = 0
  for (const span of spans) {
    if (span.start < cursor) continue
    if (span.start > cursor) result.push({ cls: 'tok-code', text: code.slice(cursor, span.start) })
    result.push({ cls: span.cls, text: code.slice(span.start, span.end) })
    cursor = span.end
  }
  if (cursor < code.length) result.push({ cls: 'tok-code', text: code.slice(cursor) })
  return result
}

const isSpace = (ch) => ch === ' ' || ch === '\t' || ch === '\r'

// Splits "  // === Title ===  " into its parts with plain index scans. (A regex here backtracked
// badly: a header padded with a few thousand spaces froze the page.) Every character is kept,
// so the parts join back to the exact line.
function splitSectionLine(line) {
  const len = line.length
  let i = 0
  while (i < len && isSpace(line[i])) i++
  if (line.startsWith('//', i)) {
    i += 2
    while (i < len && isSpace(line[i])) i++
  }
  const marker = line[i]
  if (marker !== '=' && marker !== '-') return null
  let openEnd = i
  while (openEnd < len && line[openEnd] === marker) openEnd++
  if (openEnd - i < 3) return null

  let end = len
  while (end > openEnd && isSpace(line[end - 1])) end--
  let closeStart = end
  const closeMarker = line[end - 1]
  if (closeMarker === '=' || closeMarker === '-') {
    while (closeStart > openEnd && line[closeStart - 1] === closeMarker) closeStart--
    if (end - closeStart < 3) closeStart = end
  }
  let titleEnd = closeStart
  while (titleEnd > openEnd && isSpace(line[titleEnd - 1])) titleEnd--
  let titleStart = openEnd
  while (titleStart < titleEnd && isSpace(line[titleStart])) titleStart++

  return {
    lead: line.slice(0, i),
    open: line.slice(i, openEnd),
    gap1: line.slice(openEnd, titleStart),
    title: line.slice(titleStart, titleEnd),
    gap2: line.slice(titleEnd, closeStart),
    close: line.slice(closeStart, end),
    trail: line.slice(end)
  }
}

function highlightSectionHeader(line) {
  const parts = splitSectionLine(line)
  if (!parts) return [{ cls: 'tok-header-title', text: line }]
  return [
    { cls: 'tok-code', text: parts.lead },
    { cls: 'tok-header-line', text: parts.open + parts.gap1 },
    { cls: 'tok-header-title', text: parts.title },
    { cls: 'tok-header-line', text: parts.gap2 + parts.close },
    { cls: 'tok-code', text: parts.trail }
  ].filter((t) => t.text)
}

// Splits a document into lines of { cls, text } tokens for the editor's coloured backdrop.
// Tokens of each line join back to exactly the line's text, so the backdrop stays aligned.
export function highlightDocument(text) {
  const lines = (text || '').split('\n')
  const result = []

  let inComment = false
  let delim = null

  lines.forEach((line) => {
    const trimmed = line.trim()

    // Inside a multi-line comment block
    if (inComment) {
      const closingStr = delim === '/*' ? '*/' : delim
      if (line.includes(closingStr)) {
        inComment = false
        delim = null
      }
      result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
      return
    }

    let open = null
    if (trimmed.startsWith('"""')) open = '"""'
    else if (trimmed.startsWith("'''")) open = "'''"
    else if (trimmed.startsWith('/*')) open = '/*'

    // A block comment that doesn't close on this line starts a multi-line block
    if (open && !trimmed.slice(open.length).includes(open === '/*' ? '*/' : open)) {
      inComment = true
      delim = open
      result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
      return
    }

    // Only style a header when the lexer reads the line as one (=== 5 === and a === b are not)
    if (new Lexer(line).tokenizeLine()[0]?.type === 'SECTION_HEADER') {
      result.push({ tokens: highlightSectionHeader(line) })
      return
    }

    // Everything else, including inline and single-line comments, comes from the lexer
    result.push({ tokens: tokenizeCodePart(line) })
  })

  return result
}
