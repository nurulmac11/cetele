<template>
  <div class="app-layout">
    <!-- Main Header with Brand, Page Navigation & Tab Bar -->
    <Header
      :tabs="tabs"
      :active-tab-id="activeTabId"
      :current-view="currentView"
      :show-decimals="userProfile.showDecimals"
      :theme="userProfile.theme"
      :user="currentUser"
      :show-sidebar="showSidebar"
      @select-tab="selectTab"
      @create-tab="createTab"
      @close-tab="closeTab"
      @rename-tab="renameTab"
      @reorder-tabs="reorderTabs"
      @clear-active-tab="clearActiveTab"
      @switch-view="(view) => (currentView = view)"
      @toggle-show-decimals="toggleShowDecimals"
      @toggle-theme="toggleTheme"
      @open-settings="isSettingsOpen = true"
      @open-auth="isAuthModalOpen = true"
      @open-welcome="isWelcomeModalOpen = true"
      @toggle-sidebar="toggleSidebar"
      @open-palette="isPaletteOpen = true"
    />

    <!-- View Mode 1: Main Notepad Workspace -->
    <main v-if="currentView === 'notepad'" class="workspace" :class="{ 'sidebar-hidden': !showSidebar }">
      <!-- Active Notepad Component -->
      <Notepad
        v-if="activeTab"
        ref="notepadRef"
        :key="activeTab.id"
        :tab="activeTab"
        :save-status="saveStatus"
        :disable-float="!userProfile.showDecimals"
        :show-sidebar="showSidebar"
        @update:content="updateActiveTabContent"
        @variables-updated="handleVariablesUpdated"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- Simple Syntax Reference Sidebar -->
      <ReferenceSidebar
        v-if="showSidebar"
        :declared-variables="activeVariables"
        @insert="handleInsertSnippet"
        @open-guide-page="currentView = 'guide'"
        @save-tab="handleSaveActiveTabToLibrary"
        @share-tab="handleShareActiveTab"
        @copy-all="copyAllWithResults"
        @open-history="openHistory"
      />
    </main>

    <!-- View Mode 2: Saved Tabs Library Page -->
    <SavedTabsPage
      v-else-if="currentView === 'library'"
      :library="savedLibrary"
      :disable-float="!userProfile.showDecimals"
      @switch-to-notepad="currentView = 'notepad'"
      @load-as-tab="handleLoadSavedTabAsTab"
      @delete-saved-tab="handleDeleteSavedTabFromLibrary"
      @toast="showToast"
    />

    <!-- View Mode 3: Dedicated Full Syntax Guide Page -->
    <SyntaxGuidePage
      v-else-if="currentView === 'guide'"
      @switch-to-notepad="currentView = 'notepad'"
      @insert-snippet="handleInsertSnippet"
    />

    <!-- Premium Modern Footer -->
    <footer class="app-footer">
      <div class="footer-container">
        <!-- Disclaimer Badge & Text -->
        <div class="footer-disclaimer">
          <span class="disclaimer-badge">Disclaimer</span>
          <p class="disclaimer-text">
            Exchange rates, spot gold prices, and crypto valuations are for calculation and informational purposes only.
            Data is stored 100% locally in your browser offline, or securely isolated to your private account when
            Google Cloud Sync is enabled.
          </p>
        </div>

        <!-- Footer Meta & Links -->
        <div class="footer-meta">
          <span class="meta-item built-by">
            Built by
            <a href="https://nmacun.com/" target="_blank" rel="noopener noreferrer" class="author-link"> nurulmac11 </a>
          </span>

          <span class="dot-sep">•</span>

          <a
            href="https://github.com/nurulmac11/cetele"
            target="_blank"
            rel="noopener noreferrer"
            class="meta-item github-link"
            title="Star çetele on GitHub"
          >
            <svg class="github-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
              />
            </svg>
            <span>Star on GitHub</span>
          </a>

          <span class="dot-sep">•</span>

          <span class="meta-item domain-badge">cetele.online</span>
        </div>
      </div>
    </footer>

    <!-- Toast Feedback Banner -->
    <div v-if="toastMessage" class="toast-banner">
      {{ toastMessage }}
    </div>

    <!-- Settings & Local Database Modal -->
    <SettingsModal
      :is-open="isSettingsOpen"
      :user-profile="userProfile"
      @close="isSettingsOpen = false"
      @save-profile="saveProfile"
      @export-tabs="exportTabs"
      @import-tabs="importTabs"
      @reset-local-data="resetLocalData"
      @toast="showToast"
    />

    <!-- Optional Supabase Auth Modal -->
    <AuthModal
      :is-open="isAuthModalOpen"
      :user="currentUser"
      :tabs="tabs"
      @close="isAuthModalOpen = false"
      @user-updated="handleUserUpdated"
      @toast="showToast"
    />

    <!-- Version history of the active tab -->
    <TabHistoryModal
      :is-open="isHistoryOpen"
      :tab="activeTab"
      :disable-float="!userProfile.showDecimals"
      @close="isHistoryOpen = false"
      @restore="restoreTabVersion"
      @toast="showToast"
    />

    <!-- Ctrl+K: search all tabs and run commands -->
    <CommandPalette
      :is-open="isPaletteOpen"
      :commands="paletteCommands"
      :tabs="tabs"
      :active-tab-id="activeTabId"
      @close="isPaletteOpen = false"
      @run-command="runPaletteCommand"
      @select-tab="openTabFromPalette"
      @go-to-line="goToLineFromPalette"
    />

    <!-- In-app confirmation dialog (see services/confirmService.js) -->
    <ConfirmDialog />

    <!-- Welcome / Onboarding Tour Popup Modal -->
    <WelcomeModal :is-open="isWelcomeModalOpen" @close="closeWelcomeModal" @try-yourself="handleTryWelcomeYourself" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted, markRaw } from 'vue'
import Header from './components/Header.vue'
import Notepad from './components/Notepad.vue'
import ReferenceSidebar from './components/ReferenceSidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import WelcomeModal from './components/WelcomeModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import CommandPalette from './components/CommandPalette.vue'
import TabHistoryModal from './components/TabHistoryModal.vue'
import {
  snapshotTab,
  scheduleCheckpoint,
  flushCheckpoint,
  clearVersionHistory,
  VERSION_REASONS
} from './services/versionService.js'
import {
  Plus,
  RotateCcw,
  Copy,
  Share2,
  Bookmark,
  Eraser,
  Hash,
  SunMoon,
  PanelRight,
  Settings,
  BookOpen,
  Library,
  Cloud,
  HelpCircle,
  History
} from '@lucide/vue'
import { askConfirm } from './services/confirmService.js'
import SyntaxGuidePage from './components/SyntaxGuidePage.vue'
import SavedTabsPage from './components/SavedTabsPage.vue'
import { EXAMPLE_TEXT, getFormattedCopyAllText } from './services/evaluator.js'
import { MONTHLY_BUDGET_TEXT, LEGACY_DEFAULT_TAB_CONTENTS } from './services/evaluator/constants.js'
import { encodeSharePayload, decodeSharePayload } from './services/shareService.js'
import {
  getLocalTabs,
  saveLocalTabs,
  deleteLocalTab,
  getSavedLibraryTabs,
  saveTabToLibrary,
  saveAllSavedLibrary,
  deleteSavedTabFromLibrary,
  getLocalSettings,
  saveLocalSettings,
  clearLocalDatabase
} from './services/localDb.js'
import {
  getSessionUser,
  subscribeToAuth,
  throttledSyncTabsToCloud,
  deleteCloudTab,
  fetchCloudTabs,
  throttledSyncLibraryToCloud,
  deleteCloudLibraryItem,
  fetchCloudLibrary,
  syncTabsToCloud,
  syncLibraryToCloud,
  mergeCloudTabs,
  flushPendingSync
} from './services/syncService.js'

const defaultTabs = [
  {
    id: 'tab-1',
    title: 'Calculator',
    content: EXAMPLE_TEXT,
    position: 0,
    isActive: true
  },
  {
    id: 'tab-2',
    title: 'Monthly Budget',
    content: MONTHLY_BUDGET_TEXT,
    position: 1,
    isActive: false
  }
]

// App State
const tabs = ref(JSON.parse(JSON.stringify(defaultTabs)))
const savedLibrary = ref([])
const closedTabsStack = ref([])
const activeTabId = ref('tab-1')
const activeVariables = ref([])
const currentView = ref('notepad') // 'notepad' | 'library' | 'guide'

function handleVariablesUpdated(vars) {
  activeVariables.value = Array.isArray(vars) ? vars : []
}
const showSidebar = ref(true)
const isSettingsOpen = ref(false)
const isAuthModalOpen = ref(false)
const isWelcomeModalOpen = ref(false)
const currentUser = ref(null)
const userProfile = ref({ showDecimals: true, theme: 'dark' })
const saveStatus = ref('saved') // 'saved' | 'saving' | 'error'
const toastMessage = ref('')
const isPaletteOpen = ref(false)

const notepadRef = ref(null)
let saveDebounceTimer = null
let toastTimer = null
let authUnsubscribe = null
let cloudFetchInFlight = null
let lastCloudFetchAt = 0
const CLOUD_REFETCH_MIN_INTERVAL = 30000

// Record when a tab's synced fields (title, content) last changed
function markEdited(tab) {
  tab.updatedAt = new Date().toISOString()
}

// Guest example tabs nobody has edited; not worth adding to an account that already has tabs
function isUntouchedDefaultTab(tab) {
  const def = defaultTabs.find((d) => d.id === tab.id)
  return Boolean(
    def && def.title === tab.title && (def.content === tab.content || LEGACY_DEFAULT_TAB_CONTENTS.includes(tab.content))
  )
}

const activeTab = computed(() => {
  if (!Array.isArray(tabs.value)) return null
  return tabs.value.find((t) => t.id === activeTabId.value) || tabs.value[0] || null
})

// Keep state valid: there is always at least one tab, and activeTabId points at one of them
watch(
  [tabs, activeTabId],
  () => {
    if (!Array.isArray(tabs.value) || tabs.value.length === 0) {
      tabs.value = JSON.parse(JSON.stringify(defaultTabs))
      activeTabId.value = defaultTabs[0].id
    } else if (!tabs.value.some((t) => t.id === activeTabId.value)) {
      activeTabId.value = tabs.value[0].id
    }
  },
  { immediate: true }
)

// Apply Theme Attribute
function applyTheme(themeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName || 'dark')
  }
}

watch(
  () => userProfile.value.theme,
  (newTheme) => {
    applyTheme(newTheme)
  }
)

function showToast(msg) {
  toastMessage.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2200)
}

async function handleUserUpdated(newUser, session, event) {
  const prevUser = currentUser.value
  currentUser.value = newUser

  if (newUser) {
    // Only refetch cloud tabs if the user actually changed (e.g. initial login, new account)
    // or on explicit SIGNED_IN event. Avoid refetching/resetting active tab on background
    // TOKEN_REFRESHED / window focus events when user is already logged in.
    const isNewUserSession = !prevUser || prevUser.id !== newUser.id || event === 'SIGNED_IN'
    if (isNewUserSession) {
      handleCloudFetch(newUser.id)
    }
  } else if (prevUser && !newUser) {
    // User signed out: revert active tabs to default guest state and reset saved tabs library.
    // Version history goes too, so the next person on this device can't read it.
    clearVersionHistory()
    tabs.value = JSON.parse(JSON.stringify(defaultTabs))
    activeTabId.value = defaultTabs[0].id
    savedLibrary.value = []
    closedTabsStack.value = []
    await saveLocalTabs(tabs.value)
    await saveAllSavedLibrary([])
  }
}

// Concurrent callers (initial load, auth events, window focus) share one fetch
function handleCloudFetch(userId) {
  if (!cloudFetchInFlight) {
    cloudFetchInFlight = pullFromCloud(userId).finally(() => {
      cloudFetchInFlight = null
    })
  }
  return cloudFetchInFlight
}

async function pullFromCloud(userId) {
  const cloudTabs = await fetchCloudTabs(userId)
  // Skip when the fetch failed or the user changed while it was running
  if (cloudTabs && currentUser.value?.id === userId) {
    lastCloudFetchAt = Date.now()
    const merged = mergeCloudTabs(tabs.value, cloudTabs, isUntouchedDefaultTab)
    // Keep local text that the cloud copy is about to replace
    for (const tab of merged) {
      const local = tabs.value.find((t) => t.id === tab.id)
      if (local && local !== tab && local.content !== tab.content) {
        snapshotTab(local, VERSION_REASONS.cloud, { force: true })
      }
    }
    if (merged.length > 0) {
      // Preserve current activeTabId if it survived the merge
      const targetActiveId = merged.some((t) => t.id === activeTabId.value) ? activeTabId.value : merged[0].id
      merged.forEach((t) => {
        t.isActive = t.id === targetActiveId
      })
      tabs.value = merged
      activeTabId.value = targetActiveId
      await saveLocalTabs(merged)
    }
    // Upload local-only tabs and local edits that are newer than the cloud copy
    syncTabsToCloud(() => tabs.value, userId)
  }

  // Fetch Cloud Saved Library
  const cloudLibrary = await fetchCloudLibrary(userId)
  if (currentUser.value?.id !== userId) return
  if (cloudLibrary && cloudLibrary.length > 0) {
    savedLibrary.value = cloudLibrary
    await saveAllSavedLibrary(cloudLibrary)
  } else if (savedLibrary.value.length > 0) {
    syncLibraryToCloud(savedLibrary.value, userId)
  }
}

// Initialize Local DB & Library
async function initLocalData() {
  try {
    const loadedTabs = await getLocalTabs()
    if (Array.isArray(loadedTabs) && loadedTabs.length > 0) {
      tabs.value = loadedTabs
      const active = loadedTabs.find((t) => t.isActive)
      activeTabId.value = active ? active.id : loadedTabs[0].id
    } else {
      tabs.value = JSON.parse(JSON.stringify(defaultTabs))
      activeTabId.value = defaultTabs[0].id
      await saveLocalTabs(tabs.value)
    }

    const library = await getSavedLibraryTabs()
    savedLibrary.value = Array.isArray(library) ? library : []

    const settings = await getLocalSettings()
    if (settings) {
      userProfile.value = { showDecimals: true, theme: 'dark', showSidebar: true, ...settings }
      showSidebar.value = userProfile.value.showSidebar !== false
    }
    applyTheme(userProfile.value.theme)
    saveStatus.value = 'saved'

    // Check Supabase session
    const user = await getSessionUser()
    currentUser.value = user
    if (user) {
      // Finish merging cloud tabs before adding a shared tab, so the merge can't drop it
      await handleCloudFetch(user.id)
    }

    // Check if opened via a Share URL
    const sharedDoc = await decodeSharePayload()
    if (sharedDoc?.tooLarge) {
      history.replaceState(null, '', window.location.pathname)
      showToast('This share link holds a document over 1 MB, so it was not opened')
    } else if (sharedDoc) {
      const newId = 'tab-shared-' + Date.now()
      const newTab = {
        id: newId,
        title: sharedDoc.title || 'Shared Tab',
        content: sharedDoc.content !== undefined ? sharedDoc.content : sharedDoc.text || '',
        position: tabs.value.length,
        isActive: true
      }
      markEdited(newTab)
      tabs.value.forEach((t) => (t.isActive = false))
      tabs.value.push(newTab)
      activeTabId.value = newId
      await saveLocalTabs(tabs.value)
      if (currentUser.value) {
        throttledSyncTabsToCloud(() => tabs.value, currentUser.value.id)
      }
      history.replaceState(null, '', window.location.pathname)
      showToast(`Opened shared tab "${sharedDoc.title}"!`)
    }

    // Check if first time opening application
    const hasSeenWelcome = localStorage.getItem('cetele_welcome_seen')
    if (!hasSeenWelcome) {
      isWelcomeModalOpen.value = true
    }
  } catch (err) {
    console.error('Failed to initialize local data:', err)
    saveStatus.value = 'error'
  }
}

function closeWelcomeModal() {
  localStorage.setItem('cetele_welcome_seen', 'true')
  isWelcomeModalOpen.value = false
}

function handleTryWelcomeYourself() {
  closeWelcomeModal()
  currentView.value = 'notepad'
}

// Tab Switching & Management
function selectTab(id) {
  if (id !== activeTabId.value) flushCheckpoint()
  activeTabId.value = id
  tabs.value.forEach((t) => {
    t.isActive = t.id === id
  })
  triggerSave()
}

function createTab() {
  const newId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
  const count = tabs.value.length + 1
  const newTab = {
    id: newId,
    title: `Tab ${count}`,
    content: '// New document\n',
    position: tabs.value.length,
    isActive: true
  }
  markEdited(newTab)

  tabs.value.forEach((t) => (t.isActive = false))
  tabs.value.push(newTab)
  activeTabId.value = newId

  triggerSave()
}

function closeTab(id) {
  if (tabs.value.length <= 1) return

  const index = tabs.value.findIndex((t) => t.id === id)
  if (index === -1) return

  const tabToDelete = tabs.value[index]
  closedTabsStack.value.push({
    ...JSON.parse(JSON.stringify(tabToDelete)),
    closedIndex: index
  })

  tabs.value = tabs.value.filter((t) => t.id !== id)

  if (activeTabId.value === id) {
    const nextIndex = Math.max(0, index - 1)
    activeTabId.value = tabs.value[nextIndex].id
    tabs.value[nextIndex].isActive = true
  }

  deleteLocalTab(tabToDelete.id).catch(console.error)
  if (currentUser.value) {
    deleteCloudTab(tabToDelete.id, currentUser.value.id).catch(console.error)
  }
  triggerSave()
}

function reopenLastClosedTab() {
  if (closedTabsStack.value.length === 0) return false

  const restoredTab = closedTabsStack.value.pop()
  const insertIndex = Math.min(
    typeof restoredTab.closedIndex === 'number' ? restoredTab.closedIndex : tabs.value.length,
    tabs.value.length
  )

  if (tabs.value.some((t) => t.id === restoredTab.id)) {
    restoredTab.id = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
  }

  restoredTab.isActive = true
  // The cloud copy was deleted on close, so mark it for upload again
  markEdited(restoredTab)
  tabs.value.forEach((t) => (t.isActive = false))
  tabs.value.splice(insertIndex, 0, restoredTab)
  activeTabId.value = restoredTab.id

  triggerSave()
  showToast(`Reopened closed tab "${restoredTab.title}"`)
  return true
}

function renameTab({ id, title }) {
  const target = tabs.value.find((t) => t.id === id)
  if (target) {
    target.title = title
    markEdited(target)
    triggerSave()
  }
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
  if (activeTab.value) {
    // Keeps the text from before this editing burst (at most every 5 minutes)
    snapshotTab(activeTab.value, VERSION_REASONS.edit)
    activeTab.value.content = newContent
    markEdited(activeTab.value)
    triggerSave()
    // ...and the edited text once typing pauses
    scheduleCheckpoint(activeTab.value)
  }
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
  await snapshotTab(tab, VERSION_REASONS.clear, { force: true })
  tab.content = ''
  markEdited(tab)
  triggerSave()
  showToast('Tab cleared')
}

// Copies text, falling back to a hidden textarea where the Clipboard API is blocked
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = text
    document.body.appendChild(textInput)
    textInput.select()
    let copied = false
    try {
      copied = document.execCommand('copy')
    } catch (err) {}
    document.body.removeChild(textInput)
    return copied
  }
}

// Share Active Tab
async function handleShareActiveTab() {
  if (!activeTab.value) return
  const shareUrl = await encodeSharePayload(activeTab.value)
  if (!shareUrl) {
    showToast('Could not create a share link')
    return
  }
  const copied = await copyText(shareUrl)
  showToast(copied ? 'Share link copied to clipboard' : 'Could not copy the share link: clipboard access was blocked')
}

// Saved Library Actions
async function handleSaveActiveTabToLibrary() {
  if (!activeTab.value) return
  const isAlreadySaved = savedLibrary.value.some(
    (i) => i.title === activeTab.value.title && i.content === activeTab.value.content
  )
  await saveTabToLibrary({
    title: activeTab.value.title,
    content: activeTab.value.content
  })
  const updatedLibrary = await getSavedLibraryTabs()
  savedLibrary.value = updatedLibrary

  if (currentUser.value) {
    throttledSyncLibraryToCloud(updatedLibrary, currentUser.value.id)
  }

  if (isAlreadySaved) {
    showToast(`"${activeTab.value.title}" is already in Library!`)
  } else {
    showToast(`"${activeTab.value.title}" saved to Library!`)
  }
}

function handleLoadSavedTabAsTab(savedItem) {
  const existing = tabs.value.find((t) => t.title === savedItem.title && t.content === savedItem.content)
  if (existing) {
    selectTab(existing.id)
  } else {
    const newId = 'tab-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)
    const newTab = {
      id: newId,
      title: savedItem.title || 'Loaded Tab',
      content: savedItem.content || '',
      position: tabs.value.length,
      isActive: true
    }
    markEdited(newTab)
    tabs.value.forEach((t) => (t.isActive = false))
    tabs.value.push(newTab)
    activeTabId.value = newId
    triggerSave()
  }

  currentView.value = 'notepad'
  showToast(`Reloaded "${savedItem.title}" as active tab`)
}

async function handleDeleteSavedTabFromLibrary(id) {
  await deleteSavedTabFromLibrary(id)
  const updatedLibrary = await getSavedLibraryTabs()
  savedLibrary.value = updatedLibrary

  if (currentUser.value) {
    deleteCloudLibraryItem(id, currentUser.value.id)
  }
  showToast('Saved tab deleted from Library')
}

function handleInsertSnippet(snippet) {
  currentView.value = 'notepad'
  nextTick(() => {
    if (notepadRef.value) {
      notepadRef.value.insertTextAtCursor(snippet)
    }
    showToast('Snippet inserted into notepad!')
  })
}

function toggleShowDecimals() {
  userProfile.value.showDecimals = !userProfile.value.showDecimals
  saveProfile(userProfile.value)
  showToast(userProfile.value.showDecimals ? 'Decimals Enabled' : 'Decimals Disabled (Whole Numbers)')
}

function toggleTheme() {
  const next = userProfile.value.theme === 'dark' ? 'light' : 'dark'
  userProfile.value.theme = next
  saveProfile(userProfile.value)
  showToast(`Switched to ${next === 'dark' ? 'Dark' : 'Light'} Theme`)
}

function toggleSidebar() {
  showSidebar.value = !showSidebar.value
  userProfile.value.showSidebar = showSidebar.value
  saveProfile(userProfile.value)
  showToast(showSidebar.value ? 'Right sidebar restored' : 'Calculation area expanded (sidebar hidden)')
}

async function copyAllWithResults() {
  if (!activeTab.value) return
  const fullFormattedText = getFormattedCopyAllText(activeTab.value.content, {
    disableFloat: !userProfile.value.showDecimals
  })
  const copied = await copyText(fullFormattedText)
  showToast(copied ? 'Copied all inputs with results (= result)!' : 'Could not copy: clipboard access was blocked')
}

// --- Version history ---

const isHistoryOpen = ref(false)

// Save any pending checkpoint first, so the list includes the latest edits
async function openHistory() {
  await flushCheckpoint()
  isHistoryOpen.value = true
}

async function restoreTabVersion(version) {
  const tab = activeTab.value
  if (!tab || !version) return
  // Save the current text first, so a restore can be undone from the same list
  await snapshotTab(tab, VERSION_REASONS.restore, { force: true })
  tab.content = version.content
  markEdited(tab)
  triggerSave()
  isHistoryOpen.value = false
  currentView.value = 'notepad'
  showToast(`Restored the version from ${new Date(version.createdAt).toLocaleString()}`)
}

// --- Command palette (Ctrl/Cmd+K) ---

const paletteCommands = computed(() => [
  { id: 'new-tab', label: 'New tab', hint: 'Alt+N', icon: markRaw(Plus), run: createTab },
  {
    id: 'reopen-tab',
    label: 'Reopen closed tab',
    hint: 'Alt+Shift+T',
    keywords: 'restore undo',
    icon: markRaw(RotateCcw),
    run: () => reopenLastClosedTab() || showToast('No closed tabs to reopen')
  },
  {
    id: 'copy-all',
    label: 'Copy all lines with results',
    hint: 'Ctrl+Shift+C',
    icon: markRaw(Copy),
    run: copyAllWithResults
  },
  {
    id: 'share',
    label: 'Copy share link for this tab',
    keywords: 'url',
    icon: markRaw(Share2),
    run: handleShareActiveTab
  },
  { id: 'save', label: 'Save tab to library', icon: markRaw(Bookmark), run: handleSaveActiveTabToLibrary },
  {
    id: 'history',
    label: 'Version history of this tab',
    keywords: 'versions restore undo backup',
    icon: markRaw(History),
    run: openHistory
  },
  { id: 'clear', label: 'Clear this tab', keywords: 'delete empty', icon: markRaw(Eraser), run: clearActiveTab },
  {
    id: 'decimals',
    label: userProfile.value.showDecimals ? 'Hide decimals' : 'Show decimals',
    hint: 'Alt+D',
    keywords: 'decimals round integers',
    icon: markRaw(Hash),
    run: toggleShowDecimals
  },
  {
    id: 'theme',
    label: userProfile.value.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
    keywords: 'dark light mode',
    icon: markRaw(SunMoon),
    run: toggleTheme
  },
  {
    id: 'sidebar',
    label: showSidebar.value ? 'Hide sidebar' : 'Show sidebar',
    hint: 'Ctrl+B',
    keywords: 'reference expand',
    icon: markRaw(PanelRight),
    run: toggleSidebar
  },
  {
    id: 'settings',
    label: 'Open settings',
    hint: 'Ctrl+,',
    keywords: 'import export backup',
    icon: markRaw(Settings),
    run: () => (isSettingsOpen.value = true)
  },
  {
    id: 'guide',
    label: 'Open syntax guide',
    keywords: 'help docs',
    icon: markRaw(BookOpen),
    run: () => (currentView.value = 'guide')
  },
  {
    id: 'library',
    label: 'Open saved library',
    keywords: 'saved',
    icon: markRaw(Library),
    run: () => (currentView.value = 'library')
  },
  {
    id: 'account',
    label: 'Cloud sync & account',
    keywords: 'login sign',
    icon: markRaw(Cloud),
    run: () => (isAuthModalOpen.value = true)
  },
  {
    id: 'tour',
    label: 'Quick tour',
    keywords: 'welcome intro',
    icon: markRaw(HelpCircle),
    run: () => (isWelcomeModalOpen.value = true)
  }
])

function runPaletteCommand(id) {
  paletteCommands.value.find((c) => c.id === id)?.run()
}

function openTabFromPalette(id) {
  currentView.value = 'notepad'
  selectTab(id)
}

async function goToLineFromPalette({ tabId, line }) {
  currentView.value = 'notepad'
  selectTab(tabId)
  // Wait for the notepad to mount (if another view was open) and to show the tab
  await nextTick()
  await nextTick()
  notepadRef.value?.goToLine(line)
}

// Global Keyboard Shortcuts
// Browsers don't let pages take over Ctrl/Cmd+N, Ctrl/Cmd+T or Ctrl/Cmd+Shift+T, and Ctrl/Cmd+D is the
// bookmark shortcut, so tab and decimal actions use Alt (Option on Mac). Alt combos are matched by
// e.code because Option changes e.key on macOS (Option+N types a dead key).
function handleGlobalShortcuts(e) {
  const platform = typeof navigator !== 'undefined' ? navigator.userAgentData?.platform || navigator.platform || '' : ''
  const isMac = /mac|iphone|ipad/i.test(platform)
  const modifier = isMac ? e.metaKey : e.ctrlKey
  const altOnly = e.altKey && !e.ctrlKey && !e.metaKey
  const key = (e.key || '').toLowerCase()

  const targetTag = e.target?.tagName ? e.target.tagName.toUpperCase() : ''
  const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable

  // Ctrl/Cmd+K: command palette (works while typing too)
  if (modifier && !e.shiftKey && !e.altKey && key === 'k') {
    e.preventDefault()
    isPaletteOpen.value = !isPaletteOpen.value
    return
  }

  // Alt+Shift+T: reopen last closed tab
  if (altOnly && e.shiftKey && e.code === 'KeyT') {
    e.preventDefault()
    reopenLastClosedTab()
    return
  }

  // Alt+N: new tab
  if (altOnly && !e.shiftKey && e.code === 'KeyN') {
    e.preventDefault()
    createTab()
    return
  }

  // Alt+D: toggle decimals
  if (altOnly && !e.shiftKey && e.code === 'KeyD') {
    e.preventDefault()
    toggleShowDecimals()
    return
  }

  // Ctrl/Cmd+Z outside the editor: reopen the last closed tab
  if (modifier && !e.shiftKey && !e.altKey && key === 'z') {
    if (!isInput && closedTabsStack.value.length > 0) {
      e.preventDefault()
      reopenLastClosedTab()
      return
    }
  }

  if (modifier && e.shiftKey && key === 'c') {
    e.preventDefault()
    copyAllWithResults()
    return
  }

  if (modifier && !e.shiftKey && key === 'b') {
    e.preventDefault()
    toggleSidebar()
    return
  }

  if (modifier && e.key === ',') {
    e.preventDefault()
    isSettingsOpen.value = true
    return
  }
}

// Auto Save (Debounced & Rate-Limited Throttled Cloud Sync)
function triggerSave() {
  saveStatus.value = 'saving'
  clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(async () => {
    try {
      await saveLocalTabs(tabs.value)
      if (currentUser.value) {
        throttledSyncTabsToCloud(() => tabs.value, currentUser.value.id)
      }
      saveStatus.value = 'saved'
    } catch (err) {
      console.error('Error auto-saving local/cloud tabs:', err)
      saveStatus.value = 'error'
    }
  }, 350)
}

async function saveProfile(profileData) {
  userProfile.value = { ...userProfile.value, ...profileData }
  applyTheme(userProfile.value.theme)
  try {
    await saveLocalSettings(userProfile.value)
  } catch (err) {
    console.error('Failed to save profile settings:', err)
  }
}

function exportTabs() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tabs.value, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute('download', `cetele-local-tabs-${new Date().toISOString().slice(0, 10)}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
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
    if (!id || usedIds.has(id)) id = 'tab-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).slice(2, 6)
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

async function resetLocalData() {
  const confirmed = await askConfirm({
    title: 'Reset local data?',
    message:
      'All tabs and your saved library on this device will be replaced with the example tabs. This cannot be undone.',
    confirmLabel: 'Reset data',
    danger: true
  })
  if (confirmed) {
    await clearLocalDatabase()
    await clearVersionHistory()
    tabs.value = JSON.parse(JSON.stringify(defaultTabs))
    savedLibrary.value = []
    activeTabId.value = defaultTabs[0].id
    triggerSave()
  }
}

// Push pending edits when the page is hidden; pick up other devices' edits when it returns
function handleVisibilityChange() {
  // Leaving the page (tab switch, close) saves a pending version checkpoint
  if (document.visibilityState === 'hidden') flushCheckpoint()
  if (!currentUser.value) return
  if (document.visibilityState === 'hidden') {
    flushPendingSync()
  } else if (Date.now() - lastCloudFetchAt > CLOUD_REFETCH_MIN_INTERVAL) {
    handleCloudFetch(currentUser.value.id)
  }
}

onMounted(() => {
  initLocalData()
  window.addEventListener('keydown', handleGlobalShortcuts)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  authUnsubscribe = subscribeToAuth((user, session, event) => {
    handleUserUpdated(user, session, event)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (authUnsubscribe) authUnsubscribe()
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  background-color: var(--bg);
}

.workspace {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px 24px 24px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
  transition: max-width 0.25s ease;
}

.workspace.sidebar-hidden {
  max-width: 1540px;
}

/* Premium Footer */
.app-footer {
  border-top: 1px solid var(--line);
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background: var(--panel-solid);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  margin-top: auto;
}

.footer-container {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.footer-disclaimer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.disclaimer-badge {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--amber);
  background: rgba(245, 185, 76, 0.1);
  border: 1px solid rgba(245, 185, 76, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.disclaimer-text {
  font-size: 11.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.45;
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.meta-item {
  font-size: 12px;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.author-link {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
  transition: all 0.15s ease;
}

.author-link:hover {
  text-decoration: underline;
  color: var(--accent-hover);
}

.github-link {
  color: var(--paper);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  transition: all 0.15s ease;
  background: var(--card-bg);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
}

.github-link:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: rgba(32, 214, 192, 0.08);
  transform: translateY(-1px);
}

.github-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  color: var(--paper);
  flex-shrink: 0;
  fill: currentColor;
  transition: color 0.15s;
}

.github-link:hover .github-icon {
  color: var(--accent);
}

.domain-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--paper);
  font-weight: 600;
  background: var(--line-soft);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid var(--line);
}

.dot-sep {
  color: var(--line);
  font-size: 12px;
}

.toast-banner {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: var(--bg);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 18px;
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@media (max-width: 900px) {
  .workspace {
    flex-direction: column;
    padding: 16px;
  }

  .footer-container {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .footer-disclaimer {
    flex-direction: column;
  }

  .disclaimer-text {
    text-align: center;
  }
}
</style>
