<template>
  <!-- Tab strip for desktop and tablet: drag to reorder, double-click or F2 to rename -->
  <div class="tabs-desktop-strip desktop-tabs">
    <div class="tabs-list" role="tablist" aria-label="Notepad tabs">
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        role="tab"
        :aria-selected="tab.id === activeTabId"
        :tabindex="tab.id === activeTabId ? 0 : -1"
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
        @keydown.enter.self.prevent="$emit('select-tab', tab.id)"
        @keydown.space.self.prevent="$emit('select-tab', tab.id)"
        @keydown.f2.self.prevent="startRename(tab)"
        @keydown.left.self.prevent="focusSiblingTab($event, -1)"
        @keydown.right.self.prevent="focusSiblingTab($event, 1)"
      >
        <!-- Editing tab title inline -->
        <template v-if="editingTabId === tab.id">
          <input
            ref="inputRef"
            v-model="editingTitle"
            aria-label="Tab name"
            class="tab-title-input"
            @keyup.enter="saveRename(tab.id)"
            @keyup.esc="cancelRename"
            @blur="saveRename(tab.id)"
            @click.stop
          />
        </template>
        <template v-else>
          <span class="tab-title" title="Double click to rename" @dblclick.stop="startRename(tab)">
            {{ tab.title || 'Untitled' }}
          </span>
          <button
            :aria-label="`Rename ${tab.title || 'Untitled'}`"
            class="btn-tab-rename"
            title="Rename tab (F2)"
            @click.stop="startRename(tab)"
          >
            <Edit3 class="icon-xs" />
          </button>
        </template>
        <button
          v-if="tabs.length > 1"
          :aria-label="`Close ${tab.title || 'Untitled'}`"
          class="btn-tab-close"
          title="Close tab"
          @click.stop="$emit('close-tab', tab.id)"
        >
          <X class="icon-xs" />
        </button>
      </div>
    </div>

    <button class="btn-add-tab" title="Create new notepad tab (Alt+N)" @click="$emit('create-tab')">
      <Plus class="icon-sm" />
      <span>New Tab</span>
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus, X, Edit3 } from '@lucide/vue'
import { useTabRename } from '../../composables/useTabRename.js'

const props = defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, required: true }
})

const emit = defineEmits(['select-tab', 'create-tab', 'close-tab', 'rename-tab', 'reorder-tabs'])

const { editingTabId, editingTitle, inputRef, startRename, saveRename, cancelRename } = useTabRename((payload) =>
  emit('rename-tab', payload)
)

// Arrow keys move focus between tabs (select with Enter or Space)
function focusSiblingTab(event, direction) {
  const tabEls = [...event.currentTarget.parentElement.querySelectorAll('[role="tab"]')]
  const idx = tabEls.indexOf(event.currentTarget)
  tabEls[(idx + direction + tabEls.length) % tabEls.length]?.focus()
}

// --- Drag and drop reordering ---

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
  if (draggedIndex.value !== null && draggedIndex.value !== index) dragOverIndex.value = index
}

function onDragLeave(index) {
  if (dragOverIndex.value === index) dragOverIndex.value = null
}

function onDrop(e, index) {
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    const reordered = [...props.tabs]
    const [moved] = reordered.splice(draggedIndex.value, 1)
    reordered.splice(index, 0, moved)
    emit('reorder-tabs', reordered)
  }
  onDragEnd()
}

function onDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
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

.tabs-list {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
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
  background: rgba(17, 29, 45, 0.5);
  color: var(--paper);
}

.tab-item.active {
  background: var(--card-bg);
  color: var(--accent);
  border-color: var(--line-soft);
  border-bottom: 2px solid var(--accent);
  border-top: 1px solid var(--line-soft);
  font-weight: 600;
}

.tab-item[draggable='true'] {
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
  background: rgba(229, 83, 83, 0.12);
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
  border: 1px solid transparent;
}

.btn-add-tab:hover {
  color: var(--accent);
  background: rgba(22, 217, 196, 0.08);
  border-color: rgba(22, 217, 196, 0.2);
}

.tabs-desktop-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

@media (max-width: 600px) {
  .desktop-tabs,
  .desktop-only {
    display: none !important;
  }
}
</style>
