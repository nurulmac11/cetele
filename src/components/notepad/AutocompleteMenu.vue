<template>
  <div class="autocomplete-menu" :style="menuStyle" role="listbox" aria-label="Suggestions">
    <div class="ac-header">Tab to insert · ↑↓ then Enter</div>
    <div
      v-for="(item, idx) in suggestions"
      :key="item.kind + item.insert"
      class="ac-item"
      role="option"
      :aria-selected="idx === activeIndex"
      :class="{ active: idx === activeIndex }"
      :title="item.detail"
      @mousedown.prevent="$emit('choose', item)"
    >
      <span class="ac-kind" :class="`ac-kind-${item.kind}`">{{ item.kind }}</span>
      <span class="ac-name">{{ item.label }}</span>
      <span class="ac-val">{{ item.detail }}</span>
    </div>
  </div>
</template>

<script setup>
// Suggestion list shown under the caret (see composables/notepad/useAutocomplete.js)
defineProps({
  suggestions: { type: Array, required: true },
  activeIndex: { type: Number, default: 0 },
  menuStyle: { type: Object, default: () => ({}) }
})

defineEmits(['choose'])
</script>

<style scoped>
.autocomplete-menu {
  position: absolute;
  z-index: 100;
  background: var(--panel-solid);
  border: 1px solid var(--line-hover);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  width: 300px;
  max-width: calc(100vw - 32px);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.ac-header {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  padding: 4px 8px;
  font-weight: 700;
  border-bottom: 1px solid var(--line-soft);
  margin-bottom: 2px;
}

.ac-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  cursor: pointer;
  color: var(--paper);
  transition: all 0.1s ease;
}

.ac-item:hover,
.ac-item.active {
  background: rgba(22, 217, 196, 0.1);
  color: var(--accent);
}

.ac-name {
  font-weight: 600;
  color: var(--var-color);
}

.ac-val {
  font-size: 11.5px;
  color: var(--muted);
  margin-left: auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ac-name {
  flex-shrink: 0;
}

.ac-kind {
  flex-shrink: 0;
  width: 58px;
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--muted);
}

.ac-kind-variable {
  color: var(--syn-variable);
}

.ac-kind-function,
.ac-kind-keyword {
  color: var(--syn-keyword);
}

.ac-kind-currency {
  color: var(--syn-currency);
}

.ac-kind-unit {
  color: var(--syn-unit);
}
</style>
