import { ref } from 'vue'
import {
  getSavedLibraryTabs,
  saveTabToLibrary,
  saveAllSavedLibrary,
  deleteSavedTabFromLibrary
} from '../../services/localDb.js'
import { throttledSyncLibraryToCloud, deleteCloudLibraryItem } from '../../services/syncService.js'

/**
 * The saved library: tabs kept for later, separate from the open tabs.
 * @param {{ tabsApi: ReturnType<typeof import('./useTabs.js').useTabs>, currentUser: import('vue').Ref,
 *           currentView: import('vue').Ref<string>, showToast: (message: string) => void }} options
 */
export function useLibrary({ tabsApi, currentUser, currentView, showToast }) {
  const savedLibrary = ref([])

  async function loadLibrary() {
    const library = await getSavedLibraryTabs()
    savedLibrary.value = Array.isArray(library) ? library : []
  }

  async function replaceLibrary(items) {
    savedLibrary.value = items
    await saveAllSavedLibrary(items)
  }

  async function saveActiveTabToLibrary() {
    const tab = tabsApi.activeTab.value
    if (!tab) return
    const alreadySaved = savedLibrary.value.some((i) => i.title === tab.title && i.content === tab.content)
    await saveTabToLibrary({ title: tab.title, content: tab.content })
    savedLibrary.value = await getSavedLibraryTabs()
    if (currentUser.value) throttledSyncLibraryToCloud(savedLibrary.value, currentUser.value.id)
    showToast(alreadySaved ? `"${tab.title}" is already in Library!` : `"${tab.title}" saved to Library!`)
  }

  // Opens a saved item as a tab (or switches to an identical open tab)
  function openSavedItem(savedItem) {
    const existing = tabsApi.tabs.value.find((t) => t.title === savedItem.title && t.content === savedItem.content)
    if (existing) {
      tabsApi.selectTab(existing.id)
    } else {
      tabsApi.addTab({ title: savedItem.title || 'Loaded Tab', content: savedItem.content || '' })
      tabsApi.triggerSave()
    }
    currentView.value = 'notepad'
    showToast(`Reloaded "${savedItem.title}" as active tab`)
  }

  async function deleteSavedItem(id) {
    await deleteSavedTabFromLibrary(id)
    savedLibrary.value = await getSavedLibraryTabs()
    if (currentUser.value) deleteCloudLibraryItem(id, currentUser.value.id)
    showToast('Saved tab deleted from Library')
  }

  return { savedLibrary, loadLibrary, replaceLibrary, saveActiveTabToLibrary, openSavedItem, deleteSavedItem }
}
