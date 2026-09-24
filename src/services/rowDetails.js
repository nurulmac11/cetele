// What each result row shows: label on the left, value (split into number and unit) on the right.
// Pure functions, shared by the notepad's result column.

// Letters in any script, so Turkish variable names (maaş, ödeme) are recognised
const IDENT_PATTERN = '[\\p{L}_][\\p{L}\\p{N}_]*'
export const ASSIGNMENT_RE = new RegExp(`^(${IDENT_PATTERN})\\s*=\\s*(.+)$`, 'u')

// Splits "12 miles" / "$1,200" / "0.5 gram gold" into the number and its unit label
const RESULT_UNIT_RE = /^([-+]?[$€£₺¥₹]?[-+]?[\d.,]+(?:e[-+]?\d+)?)\s+(\S.*)$/i

/**
 * @param {{ origIdx: number, lineText: string, isSection: boolean, isCollapsed: boolean, sec?: object }} item  a visible line
 * @param {object[]} rendered  evaluateAll(...).rendered
 */
export function getRowDetails(item, rendered) {
  if (!item) return {}
  const origIdx = item.origIdx
  const res = rendered?.[origIdx] || {}
  const rawLine = item.lineText || ''

  if (item.isSection) {
    const sec = item.sec
    return {
      type: 'section',
      isCollapsed: item.isCollapsed,
      title: sec ? sec.title : res.title || res.text || '',
      subtotalText: sec ? sec.subtotalText : ''
    }
  }

  if (res.cls === 'comment') {
    return { type: 'comment', text: res.text }
  }

  if (res.cls === 'num subtotal-line' || res.isSubtotal) {
    return {
      type: 'subtotal',
      label: 'subtotal',
      valueText: res.text || ''
    }
  }

  if (res.cls === 'err') {
    return {
      type: 'error',
      label: getLineLeftLabel(rawLine),
      valueText: res.text || '—'
    }
  }

  if (!res.text || res.cls === 'empty') {
    return { type: 'empty' }
  }

  const label = getLineLeftLabel(rawLine)
  const isNegative = typeof res.text === 'string' && /^[$€£₺¥₹]?-/.test(res.text)

  let numPart = res.text
  let unitPart = ''

  // Dates have their own format; only split number + unit results
  if (typeof res.text === 'string' && res.cls !== 'date') {
    const m = res.text.match(RESULT_UNIT_RE)
    if (m) {
      numPart = m[1]
      unitPart = m[2]
    }
  }

  return {
    type: res.cls || 'num',
    label,
    valueText: res.text,
    numPart,
    unitPart,
    isNegative
  }
}

export function getLineLeftLabel(rawLine) {
  if (!rawLine) return ''
  const clean = rawLine.replace(/(\/\*[\s\S]*?\*\/|\/\/.*|"""[\s\S]*?"""|'''[\s\S]*?''')/g, '').trim()
  if (!clean) return ''

  const assignMatch = clean.match(ASSIGNMENT_RE)
  if (assignMatch) {
    return assignMatch[1]
  }

  if (clean.startsWith('===') || clean.startsWith('---')) {
    return ''
  }

  if (clean.includes(' to ') || clean.includes(' in ') || /[+\-*/%#]/.test(clean)) {
    return clean
  }

  if (['total', 'subtotal', 'prev'].includes(clean.toLowerCase())) {
    return clean.toLowerCase()
  }

  if (/^[0-9]+(?:\.[0-9]+)?[kmbT]?$/i.test(clean)) {
    return clean
  }

  return clean
}
