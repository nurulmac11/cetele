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
    <!-- Always present, so screen readers announce each message placed in it -->
    <div class="toast-region" role="status" aria-live="polite" aria-atomic="true">
      <div v-if="toastMessage" :key="toastId" class="toast-banner">
        {{ toastMessage }}
      </div>
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
import { ref, nextTick, onMounted } from 'vue'
import Header from './components/Header.vue'
import Notepad from './components/Notepad.vue'
import ReferenceSidebar from './components/ReferenceSidebar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import WelcomeModal from './components/WelcomeModal.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import CommandPalette from './components/CommandPalette.vue'
import TabHistoryModal from './components/TabHistoryModal.vue'
import SyntaxGuidePage from './components/SyntaxGuidePage.vue'
import SavedTabsPage from './components/SavedTabsPage.vue'
import { getSessionUser } from './services/syncService.js'
import { clearLocalDatabase } from './services/localDb.js'
import { askConfirm } from './services/confirmService.js'
import { flushCheckpoint, clearVersionHistory, VERSION_REASONS } from './services/versionService.js'
import { useToast } from './composables/app/useToast.js'
import { useSettings } from './composables/app/useSettings.js'
import { useTabs } from './composables/app/useTabs.js'
import { useLibrary } from './composables/app/useLibrary.js'
import { useCloudSync } from './composables/app/useCloudSync.js'
import { useSharing } from './composables/app/useSharing.js'
import { usePaletteCommands } from './composables/app/usePaletteCommands.js'
import { useGlobalShortcuts } from './composables/app/useGlobalShortcuts.js'

// --- View and dialog state ---

const currentView = ref('notepad') // 'notepad' | 'library' | 'guide'
const currentUser = ref(null)
const activeVariables = ref([])
const notepadRef = ref(null)
const isSettingsOpen = ref(false)
const isAuthModalOpen = ref(false)
const isWelcomeModalOpen = ref(false)
const isPaletteOpen = ref(false)
const isHistoryOpen = ref(false)

// --- Features (see composables/app) ---

const { toastMessage, toastId, showToast } = useToast()
const { userProfile, showSidebar, loadSettings, saveProfile, toggleShowDecimals, toggleTheme, toggleSidebar } =
  useSettings({ showToast })

const tabsApi = useTabs({ currentUser, showToast })
const {
  tabs,
  activeTabId,
  activeTab,
  saveStatus,
  selectTab,
  createTab,
  closeTab,
  reopenLastClosedTab,
  renameTab,
  reorderTabs,
  updateActiveTabContent,
  clearActiveTab,
  exportTabs,
  importTabs
} = tabsApi

const libraryApi = useLibrary({ tabsApi, currentUser, currentView, showToast })
const {
  savedLibrary,
  saveActiveTabToLibrary: handleSaveActiveTabToLibrary,
  openSavedItem: handleLoadSavedTabAsTab,
  deleteSavedItem: handleDeleteSavedTabFromLibrary
} = libraryApi

const { pullFromCloud, handleUserUpdated } = useCloudSync({ tabsApi, libraryApi, currentUser })
const {
  shareActiveTab: handleShareActiveTab,
  copyAllWithResults,
  openSharedLinkFromUrl
} = useSharing({ tabsApi, currentUser, userProfile, showToast })

function handleVariablesUpdated(vars) {
  activeVariables.value = Array.isArray(vars) ? vars : []
}

function handleInsertSnippet(snippet) {
  currentView.value = 'notepad'
  nextTick(() => {
    notepadRef.value?.insertTextAtCursor(snippet)
    showToast('Snippet inserted into notepad!')
  })
}

// --- Version history ---

// Save any pending checkpoint first, so the list includes the latest edits
async function openHistory() {
  await flushCheckpoint()
  isHistoryOpen.value = true
}

async function restoreTabVersion(version) {
  if (!version) return
  // The current text is saved as a version first, so a restore can be undone from the same list
  if (!(await tabsApi.replaceActiveContent(version.content, VERSION_REASONS.restore))) return
  isHistoryOpen.value = false
  currentView.value = 'notepad'
  showToast(`Restored the version from ${new Date(version.createdAt).toLocaleString()}`)
}

// --- Welcome tour ---

function closeWelcomeModal() {
  localStorage.setItem('cetele_welcome_seen', 'true')
  isWelcomeModalOpen.value = false
}

function handleTryWelcomeYourself() {
  closeWelcomeModal()
  currentView.value = 'notepad'
}

// --- Local data reset ---

async function resetLocalData() {
  const confirmed = await askConfirm({
    title: 'Reset local data?',
    message:
      'All tabs and your saved library on this device will be replaced with the example tabs. This cannot be undone.',
    confirmLabel: 'Reset data',
    danger: true
  })
  if (!confirmed) return
  await clearLocalDatabase()
  await clearVersionHistory()
  tabsApi.resetToDefaults()
  savedLibrary.value = []
  tabsApi.triggerSave()
}

// --- Command palette and shortcuts ---

const actions = {
  createTab,
  reopenLastClosedTab,
  copyAll: copyAllWithResults,
  share: handleShareActiveTab,
  saveToLibrary: handleSaveActiveTabToLibrary,
  openHistory,
  clearTab: clearActiveTab,
  toggleDecimals: toggleShowDecimals,
  toggleTheme,
  toggleSidebar,
  togglePalette: () => (isPaletteOpen.value = !isPaletteOpen.value),
  openSettings: () => (isSettingsOpen.value = true),
  openGuide: () => (currentView.value = 'guide'),
  openLibrary: () => (currentView.value = 'library'),
  openAccount: () => (isAuthModalOpen.value = true),
  openTour: () => (isWelcomeModalOpen.value = true)
}

const { paletteCommands, runPaletteCommand } = usePaletteCommands({ actions, userProfile, showSidebar, showToast })
useGlobalShortcuts({ actions, hasClosedTabs: () => tabsApi.closedTabsStack.value.length > 0 })

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

// --- Startup ---

async function initLocalData() {
  try {
    await tabsApi.loadTabs()
    await libraryApi.loadLibrary()
    await loadSettings()

    const user = await getSessionUser()
    currentUser.value = user
    // Finish merging cloud tabs before adding a shared tab, so the merge can't drop it
    if (user) await pullFromCloud(user.id)

    await openSharedLinkFromUrl()

    if (!localStorage.getItem('cetele_welcome_seen')) isWelcomeModalOpen.value = true
  } catch (err) {
    console.error('Failed to initialize local data:', err)
    saveStatus.value = 'error'
  }
}

onMounted(initLocalData)
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
