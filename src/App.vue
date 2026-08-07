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
      @switch-view="view => currentView = view"
      @toggle-show-decimals="toggleShowDecimals"
      @toggle-theme="toggleTheme"
      @open-settings="isSettingsOpen = true"
      @open-auth="isAuthModalOpen = true"
      @toggle-sidebar="toggleSidebar"
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
      />
    </main>

    <!-- View Mode 2: Saved Tabs Library Page -->
    <SavedTabsPage
      v-else-if="currentView === 'library'"
      :library="savedLibrary"
      @switch-to-notepad="currentView = 'notepad'"
      @load-as-tab="handleLoadSavedTabAsTab"
      @delete-saved-tab="handleDeleteSavedTabFromLibrary"
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
            Exchange rates, spot gold prices, and crypto valuations are for calculation and informational purposes only. Data is stored 100% locally in your browser offline, or securely isolated to your private account when Google Cloud Sync is enabled.
          </p>
        </div>

        <!-- Footer Meta & Links -->
        <div class="footer-meta">
          <span class="meta-item built-by">
            Built by
            <a href="https://nmacun.com/" target="_blank" rel="noopener noreferrer" class="author-link">
              nurulmac11
            </a>
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
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
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
    />

    <!-- Optional Supabase Auth Modal -->
    <AuthModal
      :is-open="isAuthModalOpen"
      :user="currentUser"
      @close="isAuthModalOpen = false"
      @user-updated="handleUserUpdated"
      @toast="showToast"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Header from './components/Header.vue'
import Notepad from './components/Notepad.vue'
import ReferenceSidebar from './components/ReferenceSidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import SyntaxGuidePage from './components/SyntaxGuidePage.vue'
import SavedTabsPage from './components/SavedTabsPage.vue'
import { EXAMPLE_TEXT, getFormattedCopyAllText } from './services/evaluator.js'
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
  syncLibraryToCloud
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
    content: `=== Monthly Income ===\nsalary = 4,500\nfreelance = 1,200\nsubtotal\n\n=== Fixed & Living Expenses ===\nrent = 1,650\ngroceries = 450\nutilities = 180\nsubscriptions = 45\nsubtotal\n\n=== Budget Summary ===\ntotal_expenses = L9\nsavings = 20% of L4\nnet_remaining = L4 - total_expenses - savings`,
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
const currentUser = ref(null)
const userProfile = ref({ showDecimals: true, theme: 'dark' })
const saveStatus = ref('saved') // 'saved' | 'saving' | 'error'
const toastMessage = ref('')

const notepadRef = ref(null)
let saveDebounceTimer = null
let toastTimer = null
let authUnsubscribe = null

const activeTab = computed(() => {
  if (!Array.isArray(tabs.value) || tabs.value.length === 0) {
    tabs.value = JSON.parse(JSON.stringify(defaultTabs))
    activeTabId.value = defaultTabs[0].id
  }
  const found = tabs.value.find((t) => t.id === activeTabId.value)
  if (found) return found
  if (tabs.value[0]) {
    activeTabId.value = tabs.value[0].id
    return tabs.value[0]
  }
  return null
})

// Apply Theme Attribute
function applyTheme(themeName) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeName || 'dark')
  }
}

watch(() => userProfile.value.theme, (newTheme) => {
  applyTheme(newTheme)
})

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
    // User signed out: revert active tabs to default guest state and reset saved tabs library
    tabs.value = JSON.parse(JSON.stringify(defaultTabs))
    activeTabId.value = defaultTabs[0].id
    savedLibrary.value = []
    closedTabsStack.value = []
    await saveLocalTabs(tabs.value)
    await saveAllSavedLibrary([])
  }
}

async function handleCloudFetch(userId) {
  // Fetch Cloud Tabs
  const cloudTabs = await fetchCloudTabs(userId)
  if (cloudTabs && cloudTabs.length > 0) {
    // Preserve current activeTabId if it exists in fetched cloudTabs
    const currentActiveId = activeTabId.value
    const matchingTab = cloudTabs.find((t) => t.id === currentActiveId)
    const targetActiveId = matchingTab ? currentActiveId : cloudTabs[0].id

    cloudTabs.forEach((t) => {
      t.isActive = t.id === targetActiveId
    })
    tabs.value = cloudTabs
    activeTabId.value = targetActiveId
    await saveLocalTabs(cloudTabs)
  } else {
    // Upsert existing local tabs to cloud for new user
    syncTabsToCloud(tabs.value, userId)
  }

  // Fetch Cloud Saved Library
  const cloudLibrary = await fetchCloudLibrary(userId)
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
      handleCloudFetch(user.id)
    }

    // Check if opened via a Share URL
    const sharedDoc = decodeSharePayload()
    if (sharedDoc) {
      const newId = 'tab-shared-' + Date.now()
      const newTab = {
        id: newId,
        title: sharedDoc.title || 'Shared Tab',
        content: sharedDoc.content !== undefined ? sharedDoc.content : (sharedDoc.text || ''),
        position: tabs.value.length,
        isActive: true
      }
      tabs.value.forEach((t) => (t.isActive = false))
      tabs.value.push(newTab)
      activeTabId.value = newId
      await saveLocalTabs(tabs.value)
      history.replaceState(null, '', window.location.pathname)
      showToast(`Opened shared tab "${sharedDoc.title}"!`)
    }
  } catch (err) {
    console.error('Failed to initialize local data:', err)
    saveStatus.value = 'error'
  }
}

// Tab Switching & Management
function selectTab(id) {
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
    activeTab.value.content = newContent
    triggerSave()
  }
}

function clearActiveTab() {
  if (activeTab.value) {
    if (confirm('Are you sure you want to clear all text in this tab?')) {
      activeTab.value.content = ''
      triggerSave()
      showToast('Tab cleared')
    }
  }
}

// Share Active Tab
function handleShareActiveTab() {
  if (!activeTab.value) return
  const shareUrl = encodeSharePayload(activeTab.value)
  if (!shareUrl) return
  try {
    navigator.clipboard.writeText(shareUrl)
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = shareUrl
    document.body.appendChild(textInput)
    textInput.select()
    document.execCommand('copy')
    document.body.removeChild(textInput)
  }
  showToast('Live shareable link copied to clipboard!')
}

// Saved Library Actions
async function handleSaveActiveTabToLibrary() {
  if (!activeTab.value) return
  const isAlreadySaved = savedLibrary.value.some(
    i => i.title === activeTab.value.title && i.content === activeTab.value.content
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
  const existing = tabs.value.find(t => t.title === savedItem.title && t.content === savedItem.content)
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
  const fullFormattedText = getFormattedCopyAllText(activeTab.value.content, { disableFloat: !userProfile.value.showDecimals })
  try {
    await navigator.clipboard.writeText(fullFormattedText)
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = fullFormattedText
    document.body.appendChild(textInput)
    textInput.select()
    document.execCommand('copy')
    document.body.removeChild(textInput)
  }
  showToast('Copied all inputs with results (= result)!')
}

// Global Keyboard Shortcuts
function handleGlobalShortcuts(e) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? e.metaKey : e.ctrlKey

  const targetTag = e.target ? e.target.tagName.toUpperCase() : ''
  const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || e.target?.isContentEditable

  // Ctrl+Shift+T / Cmd+Shift+T: Always reopen last closed tab
  if (modifier && e.shiftKey && (e.key === 'T' || e.key === 't')) {
    e.preventDefault()
    reopenLastClosedTab()
    return
  }

  // Ctrl+Z / Cmd+Z: Reopen closed tab when focus is outside text input/textarea
  if (modifier && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
    if (!isInput && closedTabsStack.value.length > 0) {
      e.preventDefault()
      reopenLastClosedTab()
      return
    }
  }

  if (modifier && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
    e.preventDefault()
    copyAllWithResults()
    return
  }

  if (modifier && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault()
    createTab()
    return
  }

  if (modifier && (e.key === 'd' || e.key === 'D')) {
    e.preventDefault()
    toggleShowDecimals()
    return
  }

  if (modifier && (e.key === 'b' || e.key === 'B')) {
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
        throttledSyncTabsToCloud(tabs.value, currentUser.value.id)
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
  downloadAnchor.setAttribute('download', `cetele-local-tabs-${new Date().toISOString().slice(0,10)}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

async function importTabs(importedArray) {
  if (Array.isArray(importedArray) && importedArray.length > 0) {
    tabs.value = importedArray.map((t, idx) => ({
      id: t.id || 'tab-' + Date.now() + '-' + idx,
      title: t.title || `Tab ${idx + 1}`,
      content: t.content || '',
      position: idx,
      isActive: idx === 0
    }))
    activeTabId.value = tabs.value[0].id
    triggerSave()
  }
}

async function resetLocalData() {
  if (confirm('Are you sure you want to reset your local database to defaults?')) {
    await clearLocalDatabase()
    tabs.value = JSON.parse(JSON.stringify(defaultTabs))
    savedLibrary.value = []
    activeTabId.value = defaultTabs[0].id
    triggerSave()
  }
}

onMounted(() => {
  initLocalData()
  window.addEventListener('keydown', handleGlobalShortcuts)

  authUnsubscribe = subscribeToAuth((user, session, event) => {
    handleUserUpdated(user, session, event)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
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
  background: var(--panel);
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
  letter-spacing: .06em;
  font-weight: 700;
  color: var(--amber);
  background: rgba(245, 185, 113, 0.12);
  border: 1px solid rgba(245, 185, 113, 0.25);
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
  text-shadow: 0 0 8px var(--accent-dim);
}

.github-link {
  color: var(--paper);
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  transition: all 0.15s ease;
  background: rgba(0, 0, 0, 0.12);
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--line);
}

.github-link:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-glow);
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
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
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
