<template>
  <!-- Shown only on phones (max-width: 600px), where typing symbols is slow -->
  <div class="mobile-helper-bar">
    <button
      v-for="symbol in symbols"
      :key="symbol.label"
      class="btn-helper"
      :class="{ 'accent-op': symbol.accent }"
      @mousedown.prevent
      @click="$emit('insert', symbol.insert)"
    >
      {{ symbol.label }}
    </button>
    <button aria-label="Undo" class="btn-helper icon-btn" title="Undo" @mousedown.prevent @click="$emit('undo')">
      <RotateCcw class="icon-xs" />
    </button>
    <button aria-label="Redo" class="btn-helper icon-btn" title="Redo" @mousedown.prevent @click="$emit('redo')">
      <RotateCw class="icon-xs" />
    </button>
  </div>
</template>

<script setup>
import { RotateCcw, RotateCw } from '@lucide/vue'

defineEmits(['insert', 'undo', 'redo'])

const symbols = [
  { label: '=', insert: ' = ', accent: true },
  { label: '+', insert: ' + ' },
  { label: '-', insert: ' - ' },
  { label: '*', insert: ' * ' },
  { label: '/', insert: ' / ' },
  { label: '%', insert: ' % ' },
  { label: '#line', insert: '#' }
]
</script>

<style scoped>
.mobile-helper-bar {
  display: none;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--panel-solid);
  border-top: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.mobile-helper-bar::-webkit-scrollbar {
  display: none;
}

.btn-helper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: var(--line-soft);
  border: 1px solid var(--line);
  color: var(--paper);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 36px;
  cursor: pointer;
  transition: all 0.12s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.btn-helper:active {
  background: var(--accent-glow);
  border-color: var(--accent);
  color: var(--accent);
  transform: scale(0.96);
}

.btn-helper.accent-op {
  background: var(--accent-glow);
  border-color: var(--accent-dim);
  color: var(--accent);
  font-weight: 700;
}

.btn-helper.icon-btn {
  padding: 6px 10px;
}

@media (max-width: 600px) {
  .mobile-helper-bar {
    display: flex;
  }
}
</style>
