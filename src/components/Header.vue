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
    </div>

    <!-- Bottom Bar: Tabs Strip (only shown in notepad view) -->
    <div v-if="currentView === 'notepad'" class="tabs-strip">
      <div class="tabs-list">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: tab.id === activeTabId }"
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
  </header>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { BookOpen, Calculator, Bookmark, Settings, Plus, X, Edit3, Sun, Moon } from '@lucide/vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, required: true },
  currentView: { type: String, default: 'notepad' }, // 'notepad' | 'library' | 'guide'
  showDecimals: { type: Boolean, default: true },
  theme: { type: String, default: 'dark' }
})

const emit = defineEmits([
  'select-tab',
  'create-tab',
  'close-tab',
  'rename-tab',
  'switch-view',
  'toggle-show-decimals',
  'toggle-theme',
  'open-settings'
])

const editingTabId = ref(null)
const editingTitle = ref('')
const editInputRef = ref(null)

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
</style>
