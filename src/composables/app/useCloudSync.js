import { onMounted, onUnmounted } from 'vue'
import {
  subscribeToAuth,
  fetchCloudTabs,
  fetchCloudLibrary,
  syncTabsToCloud,
  syncLibraryToCloud,
  mergeCloudTabs,
  flushPendingSync
} from '../../services/syncService.js'
import { isUntouchedDefaultTab } from '../../services/defaultTabs.js'
import { snapshotTab, flushCheckpoint, clearVersionHistory, VERSION_REASONS } from '../../services/versionService.js'

const CLOUD_REFETCH_MIN_INTERVAL = 30000

/**
 * Cloud sync for signed-in users: merging cloud and local tabs on sign-in, load and refocus,
 * and resetting to the examples on sign-out.
 * @param {{ tabsApi: ReturnType<typeof import('./useTabs.js').useTabs>,
 *           libraryApi: ReturnType<typeof import('./useLibrary.js').useLibrary>,
 *           currentUser: import('vue').Ref<object|null> }} options
 */
export function useCloudSync({ tabsApi, libraryApi, currentUser }) {
  const { tabs, activeTabId } = tabsApi
  let fetchInFlight = null
  let lastFetchAt = 0

  // Concurrent callers (initial load, auth events, window focus) share one fetch
  function pullFromCloud(userId) {
    if (!fetchInFlight) {
      fetchInFlight = pull(userId).finally(() => {
        fetchInFlight = null
      })
    }
    return fetchInFlight
  }

  async function pull(userId) {
    const cloudTabs = await fetchCloudTabs(userId)
    // Skip when the fetch failed or the user changed while it was running
    if (cloudTabs && currentUser.value?.id === userId) {
      lastFetchAt = Date.now()
      const merged = mergeCloudTabs(tabs.value, cloudTabs, isUntouchedDefaultTab)
      // Keep local text that the cloud copy is about to replace
      for (const tab of merged) {
        const local = tabs.value.find((t) => t.id === tab.id)
        if (local && local !== tab && local.content !== tab.content) {
          snapshotTab(local, VERSION_REASONS.cloud, { force: true })
        }
      }
      if (merged.length > 0) {
        // Preserve the active tab if it survived the merge
        const targetActiveId = merged.some((t) => t.id === activeTabId.value) ? activeTabId.value : merged[0].id
        merged.forEach((t) => {
          t.isActive = t.id === targetActiveId
        })
        tabs.value = merged
        activeTabId.value = targetActiveId
        await tabsApi.persistTabs(merged)
      }
      // Upload local-only tabs and local edits that are newer than the cloud copy
      syncTabsToCloud(() => tabs.value, userId)
    }

    const cloudLibrary = await fetchCloudLibrary(userId)
    if (currentUser.value?.id !== userId) return
    if (cloudLibrary && cloudLibrary.length > 0) {
      await libraryApi.replaceLibrary(cloudLibrary)
    } else if (libraryApi.savedLibrary.value.length > 0) {
      syncLibraryToCloud(libraryApi.savedLibrary.value, userId)
    }
  }

  async function handleUserUpdated(newUser, session, event) {
    const prevUser = currentUser.value
    currentUser.value = newUser

    if (newUser) {
      // Refetch only for a new session (sign-in, different account), not on background
      // TOKEN_REFRESHED / window focus events, which would reset the active tab
      const isNewSession = !prevUser || prevUser.id !== newUser.id || event === 'SIGNED_IN'
      if (isNewSession) pullFromCloud(newUser.id)
    } else if (prevUser) {
      // Signed out: back to the guest examples. Version history goes too, so the next person on
      // this device can't read it.
      clearVersionHistory()
      tabsApi.resetToDefaults()
      await tabsApi.persistTabs()
      await libraryApi.replaceLibrary([])
    }
  }

  // Push pending edits when the page is hidden; pick up other devices' edits when it returns
  function handleVisibilityChange() {
    // Leaving the page (tab switch, close) saves a pending version checkpoint
    if (document.visibilityState === 'hidden') flushCheckpoint()
    if (!currentUser.value) return
    if (document.visibilityState === 'hidden') {
      flushPendingSync()
    } else if (Date.now() - lastFetchAt > CLOUD_REFETCH_MIN_INTERVAL) {
      pullFromCloud(currentUser.value.id)
    }
  }

  let unsubscribe = null
  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    unsubscribe = subscribeToAuth((user, session, event) => handleUserUpdated(user, session, event))
  })
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    unsubscribe?.()
  })

  return { pullFromCloud, handleUserUpdated }
}
