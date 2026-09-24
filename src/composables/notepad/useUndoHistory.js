import { ref } from 'vue'

const MAX_STEPS = 100
const GROUP_KEYSTROKES_MS = 300

/**
 * Undo/redo for the notepad. Keystrokes within 300 ms form one step. Each tab keeps its own
 * history while other tabs are shown.
 * @param {(content: string) => void} applyContent  replaces the document text (undo/redo)
 */
export function useUndoHistory(applyContent) {
  const stack = ref([])
  const index = ref(-1)
  let applying = false
  let groupTimer = null
  const byTab = new Map()

  function record(content) {
    if (applying) return
    if (index.value < stack.value.length - 1) {
      stack.value = stack.value.slice(0, index.value + 1)
    }
    if (stack.value[index.value] === content) return

    stack.value.push(content)
    index.value = stack.value.length - 1

    if (stack.value.length > MAX_STEPS) {
      stack.value.shift()
      index.value--
    }
  }

  // Records after typing pauses, so a burst of keystrokes is one undo step
  function recordSoon(content) {
    clearTimeout(groupTimer)
    groupTimer = setTimeout(() => record(content), GROUP_KEYSTROKES_MS)
  }

  function step(delta) {
    const target = index.value + delta
    if (target < 0 || target >= stack.value.length) return
    index.value = target
    applying = true
    applyContent(stack.value[target])
    setTimeout(() => {
      applying = false
    }, 50)
  }

  const undo = () => step(-1)
  const redo = () => step(1)

  // Keeps the old tab's history and restores (or starts) the new tab's
  function switchTab(oldId, newId, content) {
    clearTimeout(groupTimer)
    if (oldId) byTab.set(oldId, { stack: stack.value, index: index.value })
    const saved = newId ? byTab.get(newId) : null
    stack.value = saved ? saved.stack : []
    index.value = saved ? saved.index : -1
    // Content may have changed elsewhere (cloud sync, import) while the tab was hidden
    record(content)
  }

  return { record, recordSoon, undo, redo, switchTab }
}
