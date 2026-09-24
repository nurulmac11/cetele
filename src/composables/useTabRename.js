import { ref, nextTick } from 'vue'

/**
 * Inline tab renaming (desktop strip and mobile tab menu).
 * @param {(payload: { id: string, title: string }) => void} onRename
 */
export function useTabRename(onRename) {
  const editingTabId = ref(null)
  const editingTitle = ref('')
  const inputRef = ref(null)

  function startRename(tab) {
    editingTabId.value = tab.id
    editingTitle.value = tab.title || ''
    nextTick(() => {
      const el = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value
      el?.focus()
      el?.select()
    })
  }

  function saveRename(tabId) {
    if (editingTabId.value !== tabId) return
    const title = editingTitle.value.trim()
    if (title) onRename({ id: tabId, title })
    editingTabId.value = null
  }

  function cancelRename() {
    editingTabId.value = null
  }

  return { editingTabId, editingTitle, inputRef, startRename, saveRename, cancelRename }
}
