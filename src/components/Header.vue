<template>
  <header class="app-header">
    <!-- Top Bar: Brand & Navigation -->
    <div class="header-top">
      <div class="brand">
        <span class="mark">Σ=</span>
        <div class="brand-text">
          <h1>çetele</h1>
        </div>
      </div>

      <div class="header-actions">
        <!-- View Navigation -->
        <div class="nav-pills">
          <button
            class="btn-nav"
            :class="{ active: currentView === 'notepad' }"
            @click="$emit('switch-view', 'notepad')"
          >
            <Calculator class="icon-sm" /> Notepad
          </button>

          <button
            class="btn-nav"
            :class="{ active: currentView === 'library' }"
            @click="$emit('switch-view', 'library')"
          >
            <Bookmark class="icon-sm" /> Saved Tabs
          </button>

          <button
            class="btn-nav"
            :class="{ active: currentView === 'guide' }"
            @click="$emit('switch-view', 'guide')"
          >
            <BookOpen class="icon-sm" /> Syntax Guide
          </button>
        </div>

        <div class="divider"></div>

        <!-- Decimals Toggle Switch -->
        <div
          class="decimals-switch-box"
          :title="showDecimals ? 'Decimals ON (showing fractional values)' : 'Decimals OFF (rounding to integers)'"
        >
          <span class="switch-text">Decimals</span>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="showDecimals"
              @change="$emit('toggle-show-decimals')"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Obvious Clear Cloud Sync & Sign In Button -->
        <button
          class="btn-cloud-pill"
          :class="{ 'user-active': user }"
          @click="$emit('open-auth')"
          :title="user ? `Cloud Sync Active (${user.email})` : 'Sign in to sync tabs across devices'"
        >
          <Cloud class="icon-sm" />
          <span v-if="user" class="cloud-text">Sync Active</span>
          <span v-else class="cloud-text">Cloud Sync / Sign In</span>
          <span v-if="user" class="sync-dot"></span>
        </button>        <!-- Expand Calculation Area / Toggle Sidebar Button -->
        <button
          class="btn-icon desktop-only"
          :class="{ active: !showSidebar }"
          @click="$emit('toggle-sidebar')"
          :title="showSidebar ? 'Expand calculation area (hide right sidebar)' : 'Show right sidebar & syntax sheet'"
        >
          <Maximize2 v-if="showSidebar" class="icon" />
          <Minimize2 v-else class="icon" />
        </button>

        <!-- Light / Dark Theme Toggle -->
        <button
          class="btn-icon"
          @click="$emit('toggle-theme')"
          :title="theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
        >
          <Sun v-if="theme === 'dark'" class="icon" />
          <Moon v-else class="icon" />
        </button>

        <button class="btn-icon" @click="$emit('open-settings')" title="Settings & Data Management (Ctrl+,)">
          <Settings class="icon" />
        </button>
      </div>
    </div>    <!-- Bottom Bar: Tabs Strip (only shown in notepad view) -->
    <div v-if="currentView === 'notepad'" class="tabs-strip">
      <!-- Desktop & Tablet Tab Strip (100% Original Desktop HTML) -->
      <div class="tabs-desktop-strip desktop-tabs">
        <div class="tabs-list">
          <div
            v-for="(tab, index) in tabs"
            :key="tab.id"
            class="tab-item"
            :class="{
              active: tab.id === activeTabId,
              'is-dragging': draggedIndex === index,
              'drag-over': dragOverIndex === index
            }"
            draggable="true"
            @dragstart="onDragStart($event, index)"
            @dragover.prevent="onDragOver($event, index)"
            @dragenter.prevent
            @dragleave="onDragLeave(index)"
            @drop.prevent="onDrop($event, index)"
            @dragend="onDragEnd"
            @click="$emit('select-tab', tab.id)"
          >
            <!-- Editing tab title inline -->
            <template v-if="editingTabId === tab.id">
              <input
                ref="editInputRef"
                v-model="editingTitle"
                class="tab-title-input"
                @keyup.enter="saveRename(tab.id)"
                @keyup.esc="cancelRename"
                @blur="saveRename(tab.id)"
                @click.stop
              />
            </template>
            <template v-else>
              <span class="tab-title" @dblclick.stop="startRename(tab)" title="Double click to rename">
                {{ tab.title || 'Untitled' }}
              </span>
              <button
                class="btn-tab-rename"
                @click.stop="startRename(tab)"
                title="Rename tab"
              >
                <Edit3 class="icon-xs" />
              </button>
            </template>
            <button
              v-if="tabs.length > 1"
              class="btn-tab-close"
              @click.stop="$emit('close-tab', tab.id)"
              title="Close tab"
            >
              <X class="icon-xs" />
            </button>
          </div>
        </div>

        <button class="btn-add-tab" @click="$emit('create-tab')" title="Create new notepad tab (Ctrl+N)">
          <Plus class="icon-sm" />
          <span>New Tab</span>
        </button>
      </div>

      <!-- Mobile Touch Compact Tab Selector Bar (Shown ON MOBILE <= 600px) -->
      <div class="mobile-tab-bar">
        <button
          class="btn-mobile-tab-select"
          @click="isMobileTabMenuOpen = !isMobileTabMenuOpen"
        >
          <Folder class="icon-sm active-folder-icon" />
          <span class="mobile-active-title">{{ activeTabTitle }}</span>
          <span class="tab-count-badge">{{ tabs.length }} tabs</span>
          <ChevronDown class="icon-xs caret-icon" :class="{ open: isMobileTabMenuOpen }" />
        </button>

        <button class="btn-mobile-add-tab" @click="$emit('create-tab')" title="New tab">
          <Plus class="icon-sm" />
          <span>New</span>
        </button>

        <!-- Teleport mobile tab dropdown menu to body so no parent overflow clips it -->
        <Teleport to="body">
          <!-- Transparent Backdrop to dismiss dropdown on tap outside -->
          <div
            v-if="isMobileTabMenuOpen"
            class="mobile-dropdown-backdrop"
            @click="isMobileTabMenuOpen = false"
          ></div>

          <!-- Mobile Tab Dropdown Menu (Opens DOWNWARDS below header) -->
          <div v-if="isMobileTabMenuOpen" class="mobile-tab-dropdown-menu" @click.stop>
            <div class="dropdown-top-bar">
              <div class="dropdown-title">
                <Folder class="icon-sm" />
                <span>Notepad Tabs ({{ tabs.length }})</span>
              </div>
              <button class="btn-close-dropdown" @click="isMobileTabMenuOpen = false">
                <X class="icon-sm" />
              </button>
            </div>

            <div class="mobile-tabs-dropdown-list">
              <div
                v-for="tab in tabs"
                :key="tab.id"
                class="mobile-dropdown-item"
                :class="{ active: tab.id === activeTabId }"
                @click="selectMobileTab(tab.id)"
              >
                <div class="dropdown-item-left">
                  <span class="tab-dot" :class="{ active: tab.id === activeTabId }"></span>
                  <span class="dropdown-tab-name">{{ tab.title || 'Untitled' }}</span>
                </div>

                <div class="dropdown-item-actions">
                  <button
                    class="btn-dropdown-action"
                    @click.stop="startRename(tab); isMobileTabMenuOpen = false;"
                    title="Rename"
                  >
                    <Edit3 class="icon-xs" />
                    <span>Rename</span>
                  </button>
                  <button
                    v-if="tabs.length > 1"
                    class="btn-dropdown-action delete"
                    @click.stop="$emit('close-tab', tab.id)"
                    title="Close"
                  >
                    <X class="icon-xs" />
                  </button>
                </div>
              </div>
            </div>

            <button class="btn-dropdown-create-new" @click="$emit('create-tab'); isMobileTabMenuOpen = false;">
              <Plus class="icon-sm" />
              <span>Create New Notepad Tab</span>
            </button>
          </div>
        </Teleport>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { BookOpen, Calculator, Bookmark, Settings, Plus, X, Edit3, Sun, Moon, Cloud, Maximize2, Minimize2, Folder, ChevronDown } from '@lucide/vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, required: true },
  currentView: { type: String, default: 'notepad' }, // 'notepad' | 'library' | 'guide'
  showDecimals: { type: Boolean, default: true },
  theme: { type: String, default: 'dark' },
  user: { type: Object, default: null },
  showSidebar: { type: Boolean, default: true }
})

const emit = defineEmits([
  'select-tab',
  'create-tab',
  'close-tab',
  'rename-tab',
  'reorder-tabs',
  'switch-view',
  'toggle-show-decimals',
  'toggle-theme',
  'open-settings',
  'open-auth',
  'toggle-sidebar'
])

const editingTabId = ref(null)
const editingTitle = ref('')
const editInputRef = ref(null)
const isMobileTabMenuOpen = ref(false)

const activeTabTitle = computed(() => {
  const t = props.tabs.find(x => x.id === props.activeTabId)
  return t ? (t.title || 'Untitled') : 'Untitled'
})

function selectMobileTab(id) {
  emit('select-tab', id)
  isMobileTabMenuOpen.value = false
}

function startRename(tab) {
  editingTabId.value = tab.id
  editingTitle.value = tab.title
  nextTick(() => {
    if (editInputRef.value) {
      if (Array.isArray(editInputRef.value)) {
        editInputRef.value[0]?.focus()
        editInputRef.value[0]?.select()
      } else {
        editInputRef.value.focus()
        editInputRef.value.select()
      }
    }
  })
}

function saveRename(tabId) {
  if (editingTabId.value === tabId) {
    const trimmed = editingTitle.value.trim()
    if (trimmed) {
      emit('rename-tab', { id: tabId, title: trimmed })
    }
    editingTabId.value = null
  }
}

function cancelRename() {
  editingTabId.value = null
}

// Drag and Drop Tab Reordering
const draggedIndex = ref(null)
const dragOverIndex = ref(null)

function onDragStart(e, index) {
  draggedIndex.value = index
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(e, index) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function onDragLeave(index) {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null
  }
}

function onDrop(e, index) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const updatedTabs = [...props.tabs]
    const [movedTab] = updatedTabs.splice(draggedIndex.value, 1)
    updatedTabs.splice(index, 0, movedTab)
    emit('reorder-tabs', updatedTabs)
  }
  onDragEnd()
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
}

.header-top {
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line-soft);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand .mark {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--bg);
  background: var(--accent);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  letter-spacing: .02em;
  box-shadow: 0 0 12px var(--accent-dim);
}

.brand-text h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--paper);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-pills {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.15);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--line);
}

.btn-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  padding: 5px 12px;
  border-radius: 6px;
  color: var(--muted);
  transition: all 0.15s ease;
}

.btn-nav:hover {
  color: var(--paper);
}

.btn-nav.active {
  background: var(--panel);
  color: var(--accent);
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--line);
  margin: 0 4px;
}

/* Decimals Switch Box */
.decimals-switch-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid var(--line);
  border-radius: 8px;
  user-select: none;
}

.switch-text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--paper);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background-color: var(--line);
  transition: .2s ease;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background-color: var(--muted-light);
  transition: .2s ease;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(16px);
  background-color: var(--bg);
}

/* Obvious Cloud Sync Button */
.btn-cloud-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--paper);
  border: 1px solid var(--line);
  background: var(--line-soft);
  padding: 5px 12px;
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;
}

.btn-cloud-pill:hover {
  background: var(--panel-hover);
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

.btn-cloud-pill.user-active {
  color: var(--accent);
  border-color: rgba(94, 234, 212, 0.35);
  background: rgba(94, 234, 212, 0.1);
}

.sync-dot {
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 6px var(--accent);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 6px;
  border-radius: 8px;
  transition: all 0.15s ease;
  background: transparent;
}
.btn-icon:hover {
  color: var(--paper);
  border-color: var(--accent);
  background: var(--line-soft);
}

.icon {
  width: 15px;
  height: 15px;
}
.icon-sm {
  width: 14px;
  height: 14px;
}
.icon-xs {
  width: 12px;
  height: 12px;
}

/* Tabs Strip */
.tabs-strip {
  padding: 8px 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid var(--line);
  border-bottom: none;
  font-size: 13px;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  position: relative;
  min-width: 100px;
  max-width: 200px;
}

.tab-item:hover {
  background: rgba(0, 0, 0, 0.1);
  color: var(--paper);
}

.tab-item.active {
  background: var(--panel);
  color: var(--accent);
  border-color: var(--line);
  border-top: 2px solid var(--accent);
  font-weight: 500;
}

.tab-item[draggable="true"] {
  cursor: grab;
}

.tab-item.is-dragging {
  opacity: 0.35;
  border-style: dashed;
  border-color: var(--accent);
  cursor: grabbing;
}

.tab-item.drag-over {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent);
  transform: translateY(-2px);
}

.tab-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tab-title-input {
  background: var(--bg);
  border: 1px solid var(--accent);
  color: var(--paper);
  font-family: inherit;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  width: 100%;
  outline: none;
}

.btn-tab-rename {
  opacity: 0;
  color: var(--muted);
  padding: 2px;
  border-radius: 4px;
  transition: opacity 0.15s;
}
.tab-item:hover .btn-tab-rename {
  opacity: 0.6;
}
.btn-tab-rename:hover {
  opacity: 1 !important;
  color: var(--paper);
}

.btn-tab-close {
  color: var(--muted);
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.btn-tab-close:hover {
  color: var(--err);
  background: rgba(242, 112, 122, 0.15);
}

.btn-add-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 12.5px;
  transition: all 0.15s ease;
  margin-bottom: 2px;
}
.btn-add-tab:hover {
  color: var(--paper);
  background: var(--line-soft);
}

/* Mobile Touch Compact Tab Selector Bar (Hidden on Desktop) */
.tabs-desktop-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.mobile-tab-bar {
  display: none;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 4px 0 8px;
  position: relative;
}

.btn-mobile-tab-select {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--line);
  padding: 8px 12px;
  border-radius: 8px;
  color: var(--paper);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  min-height: 40px;
  cursor: pointer;
}

.active-folder-icon {
  color: var(--accent);
}

.mobile-active-title {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-count-badge {
  font-size: 11px;
  background: var(--accent-glow);
  color: var(--accent);
  padding: 2px 7px;
  border-radius: 10px;
  border: 1px solid var(--accent-dim);
}

.caret-icon {
  color: var(--muted);
  transition: transform 0.2s ease;
}

.caret-icon.open {
  transform: rotate(180deg);
}

.btn-mobile-add-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
  font-size: 12.5px;
  padding: 8px 12px;
  border-radius: 8px;
  min-height: 40px;
  cursor: pointer;
}

/* Mobile Tab Dropdown (Opens DOWNWARDS below header) */
.mobile-dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.mobile-tab-dropdown-menu {
  position: fixed;
  top: 96px;
  left: 12px;
  right: 12px;
  max-width: 500px;
  margin: 0 auto;
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  z-index: 10000;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.18s ease-out;
  transform-origin: top center;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.dropdown-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13.5px;
  color: var(--paper);
}

.btn-close-dropdown {
  color: var(--muted);
  padding: 4px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.mobile-tabs-dropdown-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  max-height: 55vh;
}

.mobile-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  font-size: 13.5px;
  color: var(--paper);
  cursor: pointer;
}

.mobile-dropdown-item.active {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}

.dropdown-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted);
}

.tab-dot.active {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.dropdown-tab-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-item-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-dropdown-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: 6px;
  background: var(--line-soft);
  color: var(--muted);
  font-size: 11.5px;
  border: 1px solid var(--line);
  cursor: pointer;
}

.btn-dropdown-action.delete {
  color: var(--err);
}

.btn-dropdown-create-new {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
  margin-top: 2px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .desktop-tabs,
  .desktop-only {
    display: none !important;
  }

  .mobile-tab-bar {
    display: flex;
  }

  .tabs-strip {
    padding: 6px 12px 0;
  }
}
</style>
