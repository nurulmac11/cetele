import { ref, computed } from 'vue'

/**
 * Which lines the hovered or edited line reads (#3, variables, prev), for highlighting, and a
 * brief flash after jumping to a line.
 */
export function useLineReferences({
  evaluation,
  visibleLines,
  text,
  cursorPosition,
  isEditorFocused,
  hoveredLineIndex
}) {
  const flashLineIndex = ref(null)
  let flashTimer = null

  // Line under the text cursor while the editor has focus
  const caretLineIndex = computed(() => {
    if (!isEditorFocused.value) return null
    // The textarea shows folded text, so map its row back to the document line
    const row = text.value.slice(0, cursorPosition.value).split('\n').length - 1
    return visibleLines.value[row]?.origIdx ?? null
  })

  const refTargets = computed(() => {
    const focusIdx = hoveredLineIndex.value ?? caretLineIndex.value
    const deps = focusIdx === null ? null : evaluation.value.rendered[focusIdx]?.deps
    return new Set(deps || [])
  })

  function flashLine(lineIdx) {
    flashLineIndex.value = lineIdx
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flashLineIndex.value = null
    }, 1600)
  }

  return { refTargets, flashLineIndex, flashLine, caretLineIndex }
}
