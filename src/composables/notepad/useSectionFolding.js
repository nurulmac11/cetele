import { ref, computed } from 'vue'

/**
 * Folding sections (=== Title ===). The textarea then shows a shortened projection of the text,
 * and editing is disabled so the hidden lines can't be lost.
 * @param {() => string} getContent  the full document
 * @param {() => object[]} getSections  evaluateAll(...).sections
 */
export function useSectionFolding(getContent, getSections) {
  const collapsedSections = ref({})

  // Lines as shown: a folded section becomes its header with a summary
  const visibleLines = computed(() => {
    const lines = (getContent() || '').split('\n')
    // Map by header line: looking sections up with find() for every line was O(lines × sections)
    const sectionByHeader = new Map((getSections() || []).map((sec) => [sec.headerIdx, sec]))
    const result = []
    let skipUntil = -1

    lines.forEach((lineText, origIdx) => {
      if (origIdx <= skipUntil) return
      const sec = sectionByHeader.get(origIdx)
      if (sec && collapsedSections.value[origIdx]) {
        const hiddenCount = sec.endIdx - sec.headerIdx
        result.push({
          origIdx,
          lineText: `${lineText} // [▶ ${hiddenCount} lines folded | Subtotal: ${sec.subtotalText}]`,
          isSection: true,
          isCollapsed: true,
          sec
        })
        skipUntil = sec.endIdx
      } else {
        result.push({ origIdx, lineText, isSection: Boolean(sec), isCollapsed: false, sec })
      }
    })
    return result
  })

  const collapsedLineIndices = computed(() => {
    const hidden = new Set()
    for (const sec of getSections() || []) {
      if (!collapsedSections.value[sec.headerIdx]) continue
      for (let i = sec.headerIdx + 1; i <= sec.endIdx; i++) hidden.add(i)
    }
    return hidden
  })

  // Only folds on sections that exist in this document count
  const hasCollapsedSections = computed(() => collapsedLineIndices.value.size > 0)

  function toggleSectionCollapse(headerIdx) {
    collapsedSections.value[headerIdx] = !collapsedSections.value[headerIdx]
  }

  function unfoldAll() {
    collapsedSections.value = {}
  }

  return {
    collapsedSections,
    visibleLines,
    collapsedLineIndices,
    hasCollapsedSections,
    toggleSectionCollapse,
    unfoldAll
  }
}
