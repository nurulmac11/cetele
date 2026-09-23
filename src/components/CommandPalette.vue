<template>
  <div v-if="isOpen" class="palette-overlay" @click.self="$emit('close')">
    <div
      ref="dialogRef"
      class="palette-card"
      role="dialog"
      aria-modal="true"
      aria-label="Search tabs and commands"
      tabindex="-1"
    >
      <div class="palette-search">
        <Search class="search-icon" aria-hidden="true" />
        <input
          v-model="query"
          class="palette-input"
          type="text"
          placeholder="Search lines in all tabs, switch tabs, or run a command…"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          :aria-activedescendant="items.length ? `palette-item-${activeIndex}` : undefined"
          autocomplete="off"
          spellcheck="false"
          autofocus
          @keydown="handleKeydown"
        />
        <kbd class="palette-kbd">Esc</kbd>
      </div>

      <div id="palette-results" ref="listRef" class="palette-results" role="listbox">
        <p v-if="items.length === 0" class="palette-empty">No tabs, lines or commands match “{{ query }}”.</p>

        <template v-for="group in groups" :key="group.name">
          <div class="palette-group" role="presentation">{{ group.name }}</div>
          <div
            v-for="item in group.items"
            :id="`palette-item-${item.index}`"
            :key="item.key"
            class="palette-item"
            :class="{ active: item.index === activeIndex }"
            role="option"
            :aria-selected="item.index === activeIndex"
            @mousemove="activeIndex = item.index"
            @click="choose(item)"
          >
            <template v-if="item.type === 'command'">
              <component :is="item.icon" class="item-icon" aria-hidden="true" />
              <span class="item-title">{{ item.label }}</span>
              <kbd v-if="item.hint" class="item-hint">{{ item.hint }}</kbd>
            </template>

            <template v-else-if="item.type === 'tab'">
              <FileText class="item-icon" aria-hidden="true" />
              <span class="item-title">{{ item.title }}</span>
              <span v-if="item.id === activeTabId" class="item-meta">current tab</span>
            </template>

            <template v-else>
              <span class="line-number">{{ item.line + 1 }}</span>
              <span class="line-text">
                {{ item.text.slice(0, item.matchStart)
                }}<mark>{{ item.text.slice(item.matchStart, item.matchStart + item.matchLength) }}</mark
                >{{ item.text.slice(item.matchStart + item.matchLength) }}
              </span>
              <span class="item-meta">{{ item.tabTitle }}</span>
            </template>
          </div>
        </template>
      </div>

      <footer class="palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Ctrl</kbd><kbd>K</kbd> toggle</span>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Search, FileText } from '@lucide/vue'
import { searchPalette } from '../services/paletteSearch.js'
import { useModalA11y } from '../composables/useModalA11y.js'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  // { id, label, hint?, keywords?, icon }
  commands: { type: Array, default: () => [] },
  tabs: { type: Array, default: () => [] },
  activeTabId: { type: String, default: '' }
})

const emit = defineEmits(['close', 'run-command', 'select-tab', 'go-to-line'])

const query = ref('')
const activeIndex = ref(0)
const dialogRef = ref(null)
const listRef = ref(null)

useModalA11y(
  () => props.isOpen,
  dialogRef,
  () => emit('close')
)

// Each open starts fresh
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      query.value = ''
      activeIndex.value = 0
    }
  }
)

const results = computed(() => searchPalette(query.value, { commands: props.commands, tabs: props.tabs }))

// With a query, matching lines come first; without one, commands then tabs
const groups = computed(() => {
  const { commands, tabs, lines } = results.value
  const hasQuery = Boolean(query.value.trim())
  const ordered = [
    ...(hasQuery
      ? [{ name: 'Lines', items: lines.map((l) => ({ ...l, type: 'line', key: `l-${l.tabId}-${l.line}` })) }]
      : []),
    { name: 'Tabs', items: tabs.map((t) => ({ ...t, type: 'tab', key: `t-${t.id}` })) },
    { name: 'Commands', items: commands.map((c) => ({ ...c, type: 'command', key: `c-${c.id}` })) }
  ].filter((g) => g.items.length > 0)

  let index = 0
  return ordered.map((g) => ({ ...g, items: g.items.map((item) => ({ ...item, index: index++ })) }))
})

const items = computed(() => groups.value.flatMap((g) => g.items))

watch(query, () => {
  activeIndex.value = 0
})

function scrollActiveIntoView() {
  nextTick(() => {
    listRef.value?.querySelector('.palette-item.active')?.scrollIntoView({ block: 'nearest' })
  })
}

function handleKeydown(e) {
  const count = items.value.length
  if (e.key === 'ArrowDown' && count) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % count
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp' && count) {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + count) % count
    scrollActiveIntoView()
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = items.value[activeIndex.value]
    if (item) choose(item)
  }
}

function choose(item) {
  emit('close')
  if (item.type === 'command') emit('run-command', item.id)
  else if (item.type === 'tab') emit('select-tab', item.id)
  else emit('go-to-line', { tabId: item.tabId, line: item.line })
}
</script>

<style scoped>
.palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(4, 8, 14, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12vh 16px 16px;
}

.palette-card {
  width: 100%;
  max-width: 620px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--panel-solid);
  border: 1px solid var(--line-hover);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.palette-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line-soft);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--muted);
  flex-shrink: 0;
}

.palette-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--paper-bright);
  font-size: 15px;
}

.palette-input::placeholder {
  color: var(--muted);
}

.palette-results {
  overflow-y: auto;
  padding: 6px;
}

.palette-empty {
  margin: 0;
  padding: 18px 12px;
  color: var(--muted);
  font-size: 13px;
}

.palette-group {
  padding: 8px 10px 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--paper);
  font-size: 13.5px;
  cursor: pointer;
}

.palette-item.active {
  background: var(--accent-dim);
  color: var(--paper-bright);
}

.item-icon {
  width: 15px;
  height: 15px;
  color: var(--muted-light);
  flex-shrink: 0;
}

.item-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.line-number {
  width: 32px;
  flex-shrink: 0;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.line-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}

.line-text mark {
  background: color-mix(in srgb, var(--amber) 30%, transparent);
  color: var(--paper-bright);
  border-radius: 2px;
}

kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
  color: var(--muted-light);
  background: var(--item-bg);
}

.item-hint {
  margin-left: auto;
  flex-shrink: 0;
}

.palette-kbd {
  flex-shrink: 0;
}

.palette-footer {
  display: flex;
  gap: 16px;
  padding: 8px 14px;
  border-top: 1px solid var(--line-soft);
  font-size: 11.5px;
  color: var(--muted);
}

.palette-footer kbd {
  margin-right: 3px;
}

@media (max-width: 600px) {
  .palette-overlay {
    padding-top: 8vh;
  }

  .palette-footer {
    display: none;
  }
}
</style>
