<template>
  <div class="notepad">
    <div class="rows">
      <!-- Line number gutter -->
      <div ref="gutterRef" class="gutter">
        <div v-for="n in lineCount" :key="n" class="g-num">{{ n }}</div>
      </div>

      <!-- Textarea input container -->
      <div class="input-wrapper">
        <textarea
          ref="inputRef"
          v-model="tabContent"
          class="input-area"
          spellcheck="false"
          autocomplete="off"
          placeholder="// Type math expressions, unit conversions, or date math here..."
          @scroll="syncScroll"
          @keydown="handleKeyDown"
          @keyup="updateCursorState"
          @click="updateCursorState"
        ></textarea>

        <!-- Variable Autocomplete Overlay -->
        <div
          v-if="showAutocomplete && autocompleteSuggestions.length > 0"
          class="autocomplete-menu"
          :style="autocompleteStyle"
        >
          <div class="ac-header">Variables</div>
          <div
            v-for="(item, idx) in autocompleteSuggestions"
            :key="item.name"
            class="ac-item"
            :class="{ active: idx === autocompleteIndex }"
            @mousedown.prevent="applyAutocomplete(item.name)"
          >
            <span class="ac-name">{{ item.name }}</span>
            <span class="ac-val">{{ item.val }}</span>
          </div>
        </div>
      </div>

      <!-- Evaluated results column -->
      <div ref="resultsRef" class="results">
        <div
          v-for="(res, idx) in evaluation.rendered"
          :key="idx"
          class="r"
          :class="[res.cls, { copied: copiedIndex === idx }]"
          :title="res.text ? 'Click to copy ' + res.text : ''"
          @click="copyResult(res, idx)"
        >
          <span v-if="copiedIndex === idx" class="copied-badge">Copied!</span>
          <span v-else>{{ res.text || '&nbsp;' }}</span>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <footer class="status-bar">
      <div class="status-left">
        <span>lines: <b>{{ evaluation.count }}</b></span>
        <span class="sep">•</span>
        <span>total: <b class="total-val" title="Click to copy total" @click="copyTotal">{{ formattedTotal }}</b></span>
        <span v-if="copiedTotal" class="copied-mini">Copied!</span>
      </div>

      <div class="status-center">
        <span>direct lines: <b>#1, L1, line1</b></span>
      </div>

      <div class="status-right">
        <!-- Save Status Badge -->
        <div class="sync-badge" :class="saveStateClass">
          <HardDrive v-if="saveStatus === 'saved'" class="sync-icon" />
          <Loader2 v-else-if="saveStatus === 'saving'" class="sync-icon spin" />
          <AlertCircle v-else class="sync-icon err" />
          <span>{{ saveStatusText }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { evaluateAll, formatValue } from '../services/evaluator.js'
import { HardDrive, Loader2, AlertCircle } from '@lucide/vue'

const props = defineProps({
  tab: { type: Object, required: true },
  saveStatus: { type: String, default: 'saved' }, // 'saved' | 'saving' | 'error'
  disableFloat: { type: Boolean, default: false }
})

const emit = defineEmits(['update:content'])

const inputRef = ref(null)
const gutterRef = ref(null)
const resultsRef = ref(null)
const copiedIndex = ref(null)
const copiedTotal = ref(false)
let copyTimer = null
let totalCopyTimer = null

// Autocomplete State
const currentPrefix = ref('')
const autocompleteIndex = ref(0)
const showAutocomplete = ref(false)
const cursorPosition = ref(0)

const tabContent = computed({
  get: () => props.tab?.content || '',
  set: (val) => emit('update:content', val)
})

// Evaluation output
const evaluation = computed(() => {
  return evaluateAll(tabContent.value, { disableFloat: props.disableFloat })
})

const lineCount = computed(() => {
  return tabContent.value.split('\n').length
})

const formattedTotal = computed(() => {
  return formatValue(evaluation.value.sum, { disableFloat: props.disableFloat })
})

const saveStateClass = computed(() => {
  if (props.saveStatus === 'saving') return 'saving'
  if (props.saveStatus === 'error') return 'error'
  return 'saved'
})

const saveStatusText = computed(() => {
  if (props.saveStatus === 'saving') return 'Saving...'
  if (props.saveStatus === 'error') return 'Save error'
  return 'Saved'
})

// Extract declared variables from document
const declaredVariablesMap = computed(() => {
  const map = new Map()
  const lines = tabContent.value.split('\n')
  const scope = evaluation.value

  lines.forEach((l, idx) => {
    const m = l.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
    if (m) {
      const varName = m[1]
      if (!['prev', 'total', 'pi', 'e'].includes(varName)) {
        const lineRes = scope.rendered[idx]
        const valText = (lineRes && lineRes.cls === 'num' && lineRes.text) ? lineRes.text : ''
        map.set(varName, valText)
      }
    }
  })

  return map
})

// Autocomplete suggestions (active when word length >= 3)
const autocompleteSuggestions = computed(() => {
  if (!currentPrefix.value || currentPrefix.value.length < 3) return []

  const pref = currentPrefix.value.toLowerCase()
  const list = []

  declaredVariablesMap.value.forEach((val, name) => {
    if (name.toLowerCase().startsWith(pref) && name.toLowerCase() !== pref) {
      list.push({ name, val })
    }
  })

  return list
})

const autocompleteStyle = computed(() => {
  return {
    top: '40px',
    left: '60px'
  }
})

function updateCursorState() {
  if (!inputRef.value) return
  const pos = inputRef.value.selectionStart || 0
  cursorPosition.value = pos

  // Extract current word prefix before cursor
  const textBefore = tabContent.value.slice(0, pos)
  const match = textBefore.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/)
  if (match) {
    currentPrefix.value = match[1]
    if (currentPrefix.value.length >= 3 && autocompleteSuggestions.value.length > 0) {
      showAutocomplete.value = true
      if (autocompleteIndex.value >= autocompleteSuggestions.value.length) {
        autocompleteIndex.value = 0
      }
    } else {
      showAutocomplete.value = false
    }
  } else {
    currentPrefix.value = ''
    showAutocomplete.value = false
  }
}

function applyAutocomplete(varName) {
  if (!inputRef.value || !varName || !currentPrefix.value) return

  const pos = inputRef.value.selectionStart
  const startPos = pos - currentPrefix.value.length
  const current = tabContent.value

  const newText = current.substring(0, startPos) + varName + current.substring(pos)
  tabContent.value = newText

  showAutocomplete.value = false
  currentPrefix.value = ''

  setTimeout(() => {
    inputRef.value.focus()
    const newPos = startPos + varName.length
    inputRef.value.selectionStart = inputRef.value.selectionEnd = newPos
  }, 0)
}

function handleKeyDown(e) {
  // Handle autocomplete keyboard selection
  if (showAutocomplete.value && autocompleteSuggestions.value.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      autocompleteIndex.value = (autocompleteIndex.value + 1) % autocompleteSuggestions.value.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      autocompleteIndex.value = (autocompleteIndex.value - 1 + autocompleteSuggestions.value.length) % autocompleteSuggestions.value.length
      return
    }
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const selected = autocompleteSuggestions.value[autocompleteIndex.value]
      if (selected) {
        applyAutocomplete(selected.name)
      }
      return
    }
    if (e.key === 'Escape') {
      showAutocomplete.value = false
      return
    }
  }

  // Handle Tab key indentation
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = inputRef.value
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    tabContent.value = tabContent.value.substring(0, start) + '  ' + tabContent.value.substring(end)
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2
    }, 0)
  }
}

async function copyResult(res, idx) {
  if (!res.text || res.cls === 'empty' || res.cls === 'err') return

  try {
    await navigator.clipboard.writeText(res.text)
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = res.text
    document.body.appendChild(textInput)
    textInput.select()
    document.execCommand('copy')
    document.body.removeChild(textInput)
  }

  copiedIndex.value = idx
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedIndex.value = null
  }, 1000)
}

async function copyTotal() {
  const val = formattedTotal.value
  if (!val) return

  try {
    await navigator.clipboard.writeText(val)
  } catch (e) {
    const textInput = document.createElement('textarea')
    textInput.value = val
    document.body.appendChild(textInput)
    textInput.select()
    document.execCommand('copy')
    document.body.removeChild(textInput)
  }

  copiedTotal.value = true
  clearTimeout(totalCopyTimer)
  totalCopyTimer = setTimeout(() => {
    copiedTotal.value = false
  }, 1000)
}

function syncScroll() {
  if (!inputRef.value) return
  const scrollTop = inputRef.value.scrollTop
  if (gutterRef.value) gutterRef.value.scrollTop = scrollTop
  if (resultsRef.value) resultsRef.value.scrollTop = scrollTop
}

function insertTextAtCursor(textToInsert) {
  const textarea = inputRef.value
  if (!textarea) {
    tabContent.value += (tabContent.value ? '\n' : '') + textToInsert
    return
  }

  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  const current = tabContent.value

  const newText = current.substring(0, start) + textToInsert + current.substring(end)
  tabContent.value = newText

  setTimeout(() => {
    textarea.focus()
    const newPos = start + textToInsert.length
    textarea.selectionStart = textarea.selectionEnd = newPos
  }, 0)
}

defineExpose({
  insertTextAtCursor
})

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
})
</script>

<style scoped>
.notepad {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  flex: 1;
}

.rows {
  position: relative;
  display: flex;
  min-height: 520px;
  flex: 1;
}

.gutter {
  width: 42px;
  flex: none;
  background: var(--line-soft);
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 26px;
  padding: 16px 0;
  text-align: right;
  padding-right: 10px;
  overflow: hidden;
  user-select: none;
  border-right: 1px solid var(--line);
}

.g-num {
  height: 26px;
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
}

.input-area {
  flex: 1;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--paper);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14.5px;
  line-height: 26px;
  padding: 16px 16px;
  white-space: pre;
  overflow-y: auto;
  tab-size: 2;
}

.input-area::placeholder {
  color: var(--muted);
  opacity: 0.5;
}

/* Autocomplete Overlay Menu */
.autocomplete-menu {
  position: absolute;
  z-index: 100;
  background: var(--panel);
  border: 1px solid var(--accent);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
  width: 220px;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.ac-header {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--muted);
  padding: 4px 8px;
  font-weight: 700;
  border-bottom: 1px solid var(--line);
  margin-bottom: 2px;
}

.ac-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  cursor: pointer;
  color: var(--paper);
  transition: all 0.1s ease;
}

.ac-item:hover, .ac-item.active {
  background: rgba(94, 234, 212, 0.15);
  color: var(--accent);
}

.ac-name {
  font-weight: 600;
}

.ac-val {
  font-size: 11.5px;
  color: var(--muted);
}

.results {
  width: 260px;
  flex: none;
  border-left: 1px solid var(--line);
  font-family: 'JetBrains Mono', monospace;
  font-size: 14.5px;
  line-height: 26px;
  padding: 16px 12px;
  overflow-y: hidden;
  text-align: right;
  background: rgba(0, 0, 0, 0.15);
}

.r {
  height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  transition: all 0.15s ease;
  border-radius: 4px;
  padding: 0 6px;
}

.r:not(.empty):not(.err) {
  cursor: pointer;
}

.r:not(.empty):not(.err):hover {
  background: rgba(94, 234, 212, 0.12);
  color: var(--accent);
}

.r.copied {
  background: rgba(94, 234, 212, 0.25) !important;
  color: var(--accent) !important;
  font-weight: 600;
}

.copied-badge {
  font-size: 11.5px;
  color: var(--accent);
  letter-spacing: 0.03em;
  font-weight: 600;
}

.r.num {
  color: var(--accent);
  font-weight: 500;
}

.r.date {
  color: var(--amber);
}

.r.err {
  color: var(--err);
  opacity: 0.85;
  font-size: 13px;
}

.r.empty {
  color: transparent;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  border-top: 1px solid var(--line);
  background: var(--line-soft);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  color: var(--muted);
  flex-wrap: wrap;
  gap: 10px;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-left b {
  color: var(--paper);
}

.total-val {
  color: var(--accent) !important;
  font-weight: 600;
  cursor: pointer;
  padding: 1px 4px;
  border-radius: 4px;
  transition: background 0.15s;
}

.total-val:hover {
  background: rgba(94, 234, 212, 0.15);
}

.copied-mini {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.sep {
  color: var(--line);
}

.status-center b {
  color: var(--amber);
}

.status-right {
  display: flex;
  align-items: center;
}

.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line);
}

.sync-badge.saved {
  color: var(--accent);
  border-color: rgba(94, 234, 212, 0.3);
  background: rgba(94, 234, 212, 0.08);
}

.sync-badge.saving {
  color: var(--amber);
  border-color: rgba(245, 185, 113, 0.3);
}

.sync-badge.error {
  color: var(--err);
  border-color: rgba(242, 112, 122, 0.3);
}

.sync-icon {
  width: 13px;
  height: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 820px) {
  .results {
    width: 180px;
  }
}
</style>
