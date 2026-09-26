// What a variable is calculated from: the variables and lines its definition reads, and what
// those read in turn. Pure functions, used by the notepad's inputs panel.
import { ASSIGNMENT_RE, getLineLeftLabel } from './rowDetails.js'
import { variableKey } from './evaluator/constants.js'

// Deep chains are cut here; the panel stays readable and cycles can't run away
const MAX_DEPTH = 6

function assignedName(line) {
  const match = (line || '').trim().match(ASSIGNMENT_RE)
  return match ? match[1] : null
}

// The line whose value `name` has when read on line `atLine`: the latest assignment before it
// (or on it, when the click was on the name being assigned there)
export function findDefinitionLine(lines, name, atLine, isDefinition = false) {
  const key = variableKey(name)
  let before = null
  let first = null
  lines.forEach((line, idx) => {
    const assigned = assignedName(line)
    if (!assigned || variableKey(assigned) !== key) return
    if (first === null) first = idx
    if (idx < atLine || (isDefinition && idx === atLine)) before = idx
  })
  return before ?? first
}

/**
 * @param {string[]} lines  the document's lines
 * @param {object[]} rendered  evaluateAll(...).rendered
 * @param {string} name  the variable
 * @param {number} atLine  the line it was read on
 * @param {boolean} isDefinition  true when `name` is the variable being assigned on `atLine`
 * @returns {{ name: string, lineIdx: number, valueText: string, isError: boolean,
 *             rows: Array<{ lineIdx: number, depth: number, label: string, detail: string,
 *                           valueText: string, isError: boolean, repeated: boolean }> } | null}
 *   rows are the inputs as a flattened tree, in reading order
 */
export function getVariableInputs(lines, rendered, name, atLine, isDefinition = false) {
  const defIdx = findDefinitionLine(lines, name, atLine, isDefinition)
  if (defIdx === null) return null

  const rows = []
  const seen = new Set([defIdx])
  const walk = (lineIdx, depth) => {
    for (const dep of rendered?.[lineIdx]?.deps || []) {
      const res = rendered[dep] || {}
      const varName = assignedName(lines[dep])
      const repeated = seen.has(dep)
      rows.push({
        lineIdx: dep,
        depth,
        label: varName || `#${dep + 1}`,
        detail: varName ? '' : getLineLeftLabel(lines[dep]),
        valueText: res.text || '',
        isError: res.cls === 'err',
        repeated
      })
      if (repeated) continue
      seen.add(dep)
      if (depth < MAX_DEPTH) walk(dep, depth + 1)
    }
  }
  walk(defIdx, 0)

  const res = rendered?.[defIdx] || {}
  return {
    name: assignedName(lines[defIdx]) || name,
    lineIdx: defIdx,
    valueText: res.text || '',
    isError: res.cls === 'err',
    rows
  }
}
