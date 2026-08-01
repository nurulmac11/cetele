<template>
  <div class="app-layout">
    <!-- Main Header with Brand, Page Navigation & Tab Bar -->
    <Header
      :tabs="tabs"
      :active-tab-id="activeTabId"
      :current-view="currentView"
      :show-decimals="userProfile.showDecimals"
      :theme="userProfile.theme"
      @select-tab="selectTab"
      @create-tab="createTab"
      @close-tab="closeTab"
      @rename-tab="renameTab"
      @clear-active-tab="clearActiveTab"
      @switch-view="view => currentView = view"
      @toggle-show-decimals="toggleShowDecimals"
      @toggle-theme="toggleTheme"
      @open-settings="isSettingsOpen = true"
    />

    <!-- View Mode 1: Main Notepad Workspace -->
    <main v-if="currentView === 'notepad'" class="workspace">
      <!-- Active Notepad Component -->
      <Notepad
        v-if="activeTab"
        ref="notepadRef"
        :key="activeTab.id"
        :tab="activeTab"
        :save-status="saveStatus"
        :disable-float="!userProfile.showDecimals"
        @update:content="updateActiveTabContent"
      />

      <!-- Simple Syntax Reference Sidebar -->
      <ReferenceSidebar
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
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Header from './components/Header.vue'
import Notepad from './components/Notepad.vue'
import ReferenceSidebar from './components/ReferenceSidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
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
  deleteSavedTabFromLibrary,
  getLocalSettings,
  saveLocalSettings,
  clearLocalDatabase
} from './services/localDb.js'

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
    content: `// Monthly Budget Overview\nincome = 4500\n\nrent = 1650\ngroceries = 450\nutilities = 180\nsubscriptions = 45\n\ntotal_expenses = rent + groceries + utilities + subscriptions\nsavings = 20% of income\n\nnet_remaining = income - total_expenses - savings`,
    position: 1,
    isActive: false
  }
]

// App State
const tabs = ref(JSON.parse(JSON.stringify(defaultTabs)))
const savedLibrary = ref([])
const activeTabId = ref('tab-1')
const currentView = ref('notepad') // 'notepad' | 'library' | 'guide'
const isSettingsOpen = ref(false)
const userProfile = ref({ showDecimals: true, theme: 'dark' })
const saveStatus = ref('saved') // 'saved' | 'saving' | 'error'
const toastMessage = ref('')

const notepadRef = ref(null)
let saveDebounceTimer = null
let toastTimer = null

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
      userProfile.value = { showDecimals: true, theme: 'dark', ...settings }
    }
    applyTheme(userProfile.value.theme)
    saveStatus.value = 'saved'

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
  const tabToDelete = tabs.value[index]
  tabs.value = tabs.value.filter((t) => t.id !== id)

  if (activeTabId.value === id) {
    const nextIndex = Math.max(0, index - 1)
    activeTabId.value = tabs.value[nextIndex].id
    tabs.value[nextIndex].isActive = true
  }

  deleteLocalTab(tabToDelete.id).catch(console.error)
  triggerSave()
}

function renameTab({ id, title }) {
  const target = tabs.value.find((t) => t.id === id)
  if (target) {
    target.title = title
    triggerSave()
  }
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
  await saveTabToLibrary({
    title: activeTab.value.title,
    content: activeTab.value.content
  })
  const updatedLibrary = await getSavedLibraryTabs()
  savedLibrary.value = updatedLibrary
  showToast(`"${activeTab.value.title}" saved to Library!`)
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

  if (modifier && e.key === ',') {
    e.preventDefault()
    isSettingsOpen.value = true
    return
  }
}

// Auto Save (Debounced)
function triggerSave() {
  saveStatus.value = 'saving'
  clearTimeout(saveDebounceTimer)
  saveDebounceTimer = setTimeout(async () => {
    try {
      await saveLocalTabs(tabs.value)
      saveStatus.value = 'saved'
    } catch (err) {
      console.error('Error auto-saving local tabs:', err)
      saveStatus.value = 'error'
    }
  }, 400)
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
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalShortcuts)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

.workspace {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px 24px 24px;
  max-width: 1320px;
  width: 100%;
  margin: 0 auto;
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

@media (max-width: 860px) {
  .workspace {
    flex-direction: column;
    padding: 16px;
  }
}
</style>
