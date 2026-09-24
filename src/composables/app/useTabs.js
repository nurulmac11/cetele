import { ref, computed, watch } from 'vue'
import { defaultTabs, FIRST_DEFAULT_TAB_ID } from '../../services/defaultTabs.js'
import { getLocalTabs, saveLocalTabs, deleteLocalTab, StorageFullError } from '../../services/localDb.js'
import { throttledSyncTabsToCloud, deleteCloudTab } from '../../services/syncService.js'
import { snapshotTab, scheduleCheckpoint, flushCheckpoint, VERSION_REASONS } from '../../services/versionService.js'
import { askConfirm } from '../../services/confirmService.js'

const SAVE_DEBOUNCE_MS = 350

function newTabId(prefix = 'tab') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// Record when a tab's synced fields (title, content) last changed
export function markEdited(tab) {
  tab.updatedAt = new Date().toISOString()
}

/**
 * Open tabs: state, tab actions, and saving on this device (plus cloud sync when signed in).
 * @param {{ currentUser: import('vue').Ref<object|null>, showToast: (message: string) => void }} options
 */
export function useTabs({ currentUser, showToast }) {
  const tabs = ref(defaultTabs())
  const activeTabId = ref(FIRST_DEFAULT_TAB_ID)
  const closedTabsStack = ref([])
  const saveStatus = ref('saved') // 'saved' | 'saving' | 'error'

  const activeTab = computed(() => {
    if (!Array.isArray(tabs.value)) return null
    return tabs.value.find((t) => t.id === activeTabId.value) || tabs.value[0] || null
  })

  // Keep state valid: there is always at least one tab, and activeTabId points at one of them
  watch(
    [tabs, activeTabId],
    () => {
      if (!Array.isArray(tabs.value) || tabs.value.length === 0) {
        tabs.value = defaultTabs()
        activeTabId.value = FIRST_DEFAULT_TAB_ID
      } else if (!tabs.value.some((t) => t.id === activeTabId.value)) {
        activeTabId.value = tabs.value[0].id
      }
    },
    { immediate: true }
  )

  // --- Saving ---

  let saveTimer = null
  let storageWarningShown = false

  // Saves tabs on this device. Failures are shown (status badge and a toast) instead of only logged.
  async function persistTabs(list = tabs.value) {
    try {
      await saveLocalTabs(list)
      saveStatus.value = 'saved'
      storageWarningShown = false
      return true
    } catch (err) {
      console.error('Could not save tabs on this device:', err)
      saveStatus.value = 'error'
      if (!storageWarningShown) {
        storageWarningShown = true
        showToast(
          err instanceof StorageFullError
            ? 'Could not save: browser storage is full. Delete unused tabs or saved items, or export a backup.'
            : 'Could not save your tabs on this device. Export a backup from Settings to be safe.'
        )
      }
      return false
    }
  }

  // Debounced save after any change, then a throttled cloud sync
  function triggerSave() {
    saveStatus.value = 'saving'
    clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      await persistTabs()
      if (currentUser.value) {
        throttledSyncTabsToCloud(() => tabs.value, currentUser.value.id)
      }
    }, SAVE_DEBOUNCE_MS)
  }

  // Loads saved tabs, or starts with the examples
  async function loadTabs() {
    const loaded = await getLocalTabs()
    if (Array.isArray(loaded) && loaded.length > 0) {
      tabs.value = loaded
      activeTabId.value = (loaded.find((t) => t.isActive) || loaded[0]).id
    } else {
      resetToDefaults()
      await persistTabs()
    }
    saveStatus.value = 'saved'
  }

  // Back to the example tabs (sign-out, local data reset)
  function resetToDefaults() {
    tabs.value = defaultTabs()
    activeTabId.value = FIRST_DEFAULT_TAB_ID
    closedTabsStack.value = []
  }

  // --- Tab actions ---

  function activate(id) {
    activeTabId.value = id
    tabs.value.forEach((t) => {
      t.isActive = t.id === id
    })
  }

  // Adds a tab after the others and shows it. Returns the new tab.
  function addTab({ title, content, idPrefix = 'tab' }) {
    const tab = { id: newTabId(idPrefix), title, content, position: tabs.value.length, isActive: true }
    markEdited(tab)
    tabs.value.forEach((t) => (t.isActive = false))
    tabs.value.push(tab)
    activeTabId.value = tab.id
    return tab
  }

  function selectTab(id) {
    if (id !== activeTabId.value) flushCheckpoint()
    activate(id)
    triggerSave()
  }

  function createTab() {
    addTab({ title: `Tab ${tabs.value.length + 1}`, content: '// New document\n' })
    triggerSave()
  }

  function closeTab(id) {
    if (tabs.value.length <= 1) return
    const index = tabs.value.findIndex((t) => t.id === id)
    if (index === -1) return

    const closing = tabs.value[index]
    closedTabsStack.value.push({ ...JSON.parse(JSON.stringify(closing)), closedIndex: index })
    tabs.value = tabs.value.filter((t) => t.id !== id)

    if (activeTabId.value === id) {
      const next = tabs.value[Math.max(0, index - 1)]
      activeTabId.value = next.id
      next.isActive = true
    }

    deleteLocalTab(closing.id).catch(console.error)
    if (currentUser.value) {
      deleteCloudTab(closing.id, currentUser.value.id).catch(console.error)
    }
    triggerSave()
  }

  function reopenLastClosedTab() {
    if (closedTabsStack.value.length === 0) return false

    const restored = closedTabsStack.value.pop()
    const insertIndex = Math.min(
      typeof restored.closedIndex === 'number' ? restored.closedIndex : tabs.value.length,
      tabs.value.length
    )
    if (tabs.value.some((t) => t.id === restored.id)) restored.id = newTabId()

    restored.isActive = true
    // The cloud copy was deleted on close, so mark it for upload again
    markEdited(restored)
    tabs.value.forEach((t) => (t.isActive = false))
    tabs.value.splice(insertIndex, 0, restored)
    activeTabId.value = restored.id

    triggerSave()
    showToast(`Reopened closed tab "${restored.title}"`)
    return true
  }

  function renameTab({ id, title }) {
    const target = tabs.value.find((t) => t.id === id)
    if (!target) return
    target.title = title
    markEdited(target)
    triggerSave()
  }

  function reorderTabs(newTabsList) {
    if (!Array.isArray(newTabsList)) return
    newTabsList.forEach((tab, idx) => {
      tab.position = idx
    })
    tabs.value = newTabsList
    triggerSave()
  }

  function updateActiveTabContent(newContent) {
    const tab = activeTab.value
    if (!tab) return
    // Keeps the text from before this editing burst (at most every 5 minutes)
    snapshotTab(tab, VERSION_REASONS.edit)
    tab.content = newContent
    markEdited(tab)
    triggerSave()
    // ...and the edited text once typing pauses
    scheduleCheckpoint(tab)
  }

  // Replaces the active tab's text, saving the old text as a version first
  async function replaceActiveContent(content, reason) {
    const tab = activeTab.value
    if (!tab) return false
    await snapshotTab(tab, reason, { force: true })
    tab.content = content
    markEdited(tab)
    triggerSave()
    return true
  }

  async function clearActiveTab() {
    const tab = activeTab.value
    if (!tab) return
    const confirmed = await askConfirm({
      title: 'Clear this tab?',
      message: `All text in "${tab.title}" will be removed.`,
      confirmLabel: 'Clear tab',
      danger: true
    })
    if (!confirmed) return
    await replaceActiveContent('', VERSION_REASONS.clear)
    showToast('Tab cleared')
  }

  // --- Backup ---

  function exportTabs() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tabs.value, null, 2))
    const link = document.createElement('a')
    link.setAttribute('href', dataStr)
    link.setAttribute('download', `cetele-local-tabs-${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  async function importTabs(importedArray) {
    const valid = Array.isArray(importedArray)
      ? importedArray.filter((t) => t && typeof t === 'object' && typeof t.content === 'string')
      : []
    if (valid.length === 0) {
      showToast('No tabs found in this backup')
      return
    }
    // The import replaces every tab; keep what they held
    await Promise.all(tabs.value.map((t) => snapshotTab(t, VERSION_REASONS.import, { force: true })))

    const usedIds = new Set()
    const now = new Date().toISOString()
    tabs.value = valid.map((t, idx) => {
      let id = typeof t.id === 'string' && t.id ? t.id : ''
      if (!id || usedIds.has(id)) id = newTabId()
      usedIds.add(id)
      return {
        id,
        title: typeof t.title === 'string' && t.title.trim() ? t.title : `Tab ${idx + 1}`,
        content: t.content,
        position: idx,
        isActive: idx === 0,
        updatedAt: now
      }
    })
    activeTabId.value = tabs.value[0].id
    triggerSave()
    const skipped = importedArray.length - valid.length
    showToast(
      `Imported ${valid.length} tab${valid.length === 1 ? '' : 's'}${skipped ? ` (skipped ${skipped} invalid)` : ''}`
    )
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    closedTabsStack,
    saveStatus,
    persistTabs,
    triggerSave,
    loadTabs,
    resetToDefaults,
    addTab,
    selectTab,
    createTab,
    closeTab,
    reopenLastClosedTab,
    renameTab,
    reorderTabs,
    updateActiveTabContent,
    replaceActiveContent,
    clearActiveTab,
    exportTabs,
    importTabs
  }
}
