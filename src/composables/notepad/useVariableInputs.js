import { ref, computed } from 'vue'
import { getVariableInputs } from '../../services/variableInputs.js'
import { caretCoordinates } from './useAutocomplete.js'

const WORD_CHAR = /[\p{L}\p{N}_]/u
const WORD_START = /[\p{L}_]/u

/**
 * Clicking a variable in the editor shows what it is calculated from.
 * @param {{ inputRef: import('vue').Ref, text: import('vue').WritableComputedRef<string>,
 *           content: () => string, visibleLines: import('vue').Ref<object[]>,
 *           evaluation: import('vue').Ref<object> }} options
 */
export function useVariableInputs({ inputRef, text, content, visibleLines, evaluation }) {
  // { name, lineIdx, isDefinition } of the clicked variable
  const target = ref(null)
  const position = ref({ top: 40, left: 10 })

  // Recomputed as the document changes, so values stay current while the panel is open
  const panel = computed(() => {
    if (!target.value) return null
    const { name, lineIdx, isDefinition } = target.value
    return getVariableInputs(content().split('\n'), evaluation.value.rendered, name, lineIdx, isDefinition)
  })
  const panelStyle = computed(() => ({ top: `${position.value.top}px`, left: `${position.value.left}px` }))

  // Opens the panel when the caret sits on a variable name. Returns true when it opened.
  function inspectAtCaret() {
    const textarea = inputRef.value
    target.value = null
    if (!textarea || textarea.selectionStart !== textarea.selectionEnd) return false

    const value = text.value
    const pos = textarea.selectionStart || 0
    const lineStart = value.lastIndexOf('\n', pos - 1) + 1
    const nextBreak = value.indexOf('\n', pos)
    const line = value.slice(lineStart, nextBreak === -1 ? value.length : nextBreak)
    const col = pos - lineStart

    let start = col
    let end = col
    while (start > 0 && WORD_CHAR.test(line[start - 1])) start--
    while (end < line.length && WORD_CHAR.test(line[end])) end++
    if (start === end || !WORD_START.test(line[start])) return false

    // The textarea may show folded text; map its row back to the document line
    const row = value.slice(0, lineStart).split('\n').length - 1
    const lineIdx = visibleLines.value[row]?.origIdx ?? row
    const isDefinition = !line.slice(0, start).trim() && /^\s*=(?!=)/.test(line.slice(end))

    target.value = { name: line.slice(start, end), lineIdx, isDefinition }
    if (!panel.value) {
      target.value = null
      return false
    }
    position.value = caretCoordinates(textarea, value)
    return true
  }

  function close() {
    target.value = null
  }

  // Keeps the panel under the caret while scrolling
  function reposition() {
    if (target.value && inputRef.value) position.value = caretCoordinates(inputRef.value, text.value)
  }

  return {
    variableInputs: panel,
    variableInputsStyle: panelStyle,
    inspectVariableAtCaret: inspectAtCaret,
    closeVariableInputs: close,
    repositionVariableInputs: reposition
  }
}
