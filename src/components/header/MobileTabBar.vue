<template>
  <!-- Compact tab picker for phones (max-width: 600px) -->
  <div class="mobile-tab-bar">
    <button
      class="btn-mobile-tab-select"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      aria-label="Choose tab"
      @click="isOpen = !isOpen"
    >
      <Folder class="icon-sm active-folder-icon" />
      <span class="mobile-active-title">{{ activeTabTitle }}</span>
      <span class="tab-count-badge">{{ tabs.length }} tabs</span>
      <ChevronDown class="icon-xs caret-icon" :class="{ open: isOpen }" />
    </button>

    <!-- Teleport mobile tab dropdown menu to body so no parent overflow clips it -->
    <Teleport to="body">
      <!-- Transparent Backdrop to dismiss dropdown on tap outside -->
      <div v-if="isOpen" class="mobile-dropdown-backdrop" @click="isOpen = false"></div>

      <!-- Mobile Tab Dropdown Menu (Opens DOWNWARDS below header) -->
      <div v-if="isOpen" class="mobile-tab-dropdown-menu" @click.stop>
        <div class="dropdown-top-bar">
          <div class="dropdown-title">
            <Folder class="icon-sm" />
            <span>Notepad Tabs ({{ tabs.length }})</span>
          </div>
          <button aria-label="Close tab list" class="btn-close-dropdown" @click="isOpen = false">
            <X class="icon-sm" />
          </button>
        </div>

        <div class="mobile-tabs-dropdown-list">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            class="mobile-dropdown-item"
            :class="{ active: tab.id === activeTabId, editing: editingTabId === tab.id }"
            @click="editingTabId !== tab.id && selectTab(tab.id)"
          >
            <template v-if="editingTabId === tab.id">
              <div class="mobile-dropdown-rename-form" @click.stop>
                <input
                  ref="inputRef"
                  v-model="editingTitle"
                  class="mobile-tab-title-input"
                  placeholder="Tab title..."
                  @keyup.enter="saveRename(tab.id)"
                  @keyup.esc="cancelRename"
                  @click.stop
                />
                <button aria-label="Save" class="btn-mobile-rename-save" title="Save" @click.stop="saveRename(tab.id)">
                  <Check class="icon-xs" />
                </button>
                <button aria-label="Cancel" class="btn-mobile-rename-cancel" title="Cancel" @click.stop="cancelRename">
                  <X class="icon-xs" />
                </button>
              </div>
            </template>
            <template v-else>
              <div class="dropdown-item-left">
                <span class="tab-dot" :class="{ active: tab.id === activeTabId }"></span>
                <span class="dropdown-tab-name">{{ tab.title || 'Untitled' }}</span>
              </div>

              <div class="dropdown-item-actions">
                <button class="btn-dropdown-action" title="Rename" @click.stop="startRename(tab)">
                  <Edit3 class="icon-xs" />
                  <span>Rename</span>
                </button>
                <button
                  v-if="tabs.length > 1"
                  class="btn-dropdown-action delete"
                  title="Close"
                  @click.stop="$emit('close-tab', tab.id)"
                >
                  <X class="icon-xs" />
                </button>
              </div>
            </template>
          </div>
        </div>

        <button class="btn-dropdown-create-new" @click="createTab">
          <Plus class="icon-sm" />
          <span>Create New Notepad Tab</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, X, Edit3, Folder, ChevronDown, Check } from '@lucide/vue'
import { useTabRename } from '../../composables/useTabRename.js'

const props = defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, required: true }
})

const emit = defineEmits(['select-tab', 'create-tab', 'close-tab', 'rename-tab'])

const isOpen = ref(false)
const { editingTabId, editingTitle, inputRef, startRename, saveRename, cancelRename } = useTabRename((payload) =>
  emit('rename-tab', payload)
)

const activeTabTitle = computed(() => props.tabs.find((t) => t.id === props.activeTabId)?.title || 'Untitled')

function selectTab(id) {
  emit('select-tab', id)
  isOpen.value = false
}

function createTab() {
  emit('create-tab')
  isOpen.value = false
}
</script>

<style scoped>
.icon-sm {
  width: 14px;
  height: 14px;
}

.icon-xs {
  width: 12px;
  height: 12px;
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

.mobile-dropdown-rename-form {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.mobile-tab-title-input {
  flex: 1;
  background: var(--bg);
  color: var(--paper);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.btn-mobile-rename-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--bg);
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.btn-mobile-rename-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--line-soft);
  color: var(--muted);
  border: 1px solid var(--line);
  cursor: pointer;
}

.mobile-only,
.mobile-nav-wrapper,
.mobile-tab-bar {
  display: none !important;
}

@media (max-width: 600px) {
  .mobile-only,
  .mobile-nav-wrapper,
  .mobile-tab-bar {
    display: flex !important;
  }
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
</style>
