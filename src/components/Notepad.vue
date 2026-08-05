<template>
  <div class="notepad">
    <div class="rows">
      <!-- Line number gutter (hidden on small mobile screens) -->
      <div ref="gutterRef" class="gutter">
        <div
          v-for="(item, k) in visibleLines"
          :key="k"
          class="g-num"
          :class="{
            'is-section': item.isSection,
            'highlighted-line': hoveredLineIndex === item.origIdx
          }"
          @click="item.isSection && toggleSectionCollapse(item.origIdx)"
          @mouseenter="hoveredLineIndex = item.origIdx"
          @mouseleave="hoveredLineIndex = null"
        >
          <button
            v-if="item.isSection"
            class="btn-fold"
            @click.stop="toggleSectionCollapse(item.origIdx)"
            :title="collapsedSections[item.origIdx] ? 'Expand section' : 'Collapse section'"
          >
            <ChevronRight v-if="collapsedSections[item.origIdx]" class="icon-fold" />
            <ChevronDown v-else class="icon-fold" />
          </button>
          <span class="num-text">{{ item.origIdx + 1 }}</span>
        </div>
      </div>

      <!-- Textarea input container -->
      <div class="input-wrapper">
        <textarea
          ref="inputRef"
          v-model="tabContent"
          class="input-area"
          :readonly="hasCollapsedSections"
          spellcheck="false"
          autocomplete="off"
          :placeholder="hasCollapsedSections ? 'Expand folded sections to edit...' : '// Type math expressions, unit conversions, or date math here...'"
          :title="hasCollapsedSections ? 'Expand folded sections before editing to keep their hidden lines intact.' : ''"
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
          v-for="(item, k) in visibleLines"
          :key="k"
          class="r"
          :class="[
            evaluation.rendered[item.origIdx]?.cls,
            {
              copied: copiedIndex === item.origIdx,
              'highlighted-line': hoveredLineIndex === item.origIdx
            }
          ]"
          :title="evaluation.rendered[item.origIdx]?.text ? 'Click to copy ' + evaluation.rendered[item.origIdx].text : ''"
          @click="copyResult(evaluation.rendered[item.origIdx], item.origIdx)"
          @mouseenter="hoveredLineIndex = item.origIdx"
          @mouseleave="hoveredLineIndex = null"
        >
          <span v-if="copiedIndex === item.origIdx" class="copied-badge">Copied!</span>
          <template v-else-if="item.isSection">
            <span v-if="item.isCollapsed" class="section-collapsed-title">
              {{ getSectionCollapsedSummary(item.sec) }}
            </span>
            <span v-else class="section-title-text">{{ evaluation.rendered[item.origIdx]?.text }}</span>
          </template>
          <span v-else>{{ evaluation.rendered[item.origIdx]?.text || '&nbsp;' }}</span>
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

      <div class="status-center desktop-only">
        <span>direct lines: <b>#1, L1, line1</b></span>
      </div>

      <div class="status-right">
        <!-- Expand Area Toggle Button -->
        <button
          class="btn-expand-area"
          :class="{ expanded: !showSidebar }"
          @click="$emit('toggle-sidebar')"
          :title="showSidebar ? 'Expand calculation area (hide right sidebar)' : 'Show right sidebar'"
        >
          <Maximize2 v-if="showSidebar" class="icon-xs" />
          <Minimize2 v-else class="icon-xs" />
          <span>{{ showSidebar ? 'Expand Area' : 'Show Sidebar' }}</span>
        </button>

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
import { ref, computed, watch, onMounted } from 'vue'
import { evaluateAll, formatValue } from '../services/evaluator.js'
import { HardDrive, Loader2, AlertCircle, ChevronDown, ChevronRight } from '@lucide/vue'

const collapsedSections = ref({})
const hoveredLineIndex = ref(null)

const sectionHeadersMap = computed(() => {
  const map = new Map()
  const secs = evaluation.value.sections || []
  secs.forEach(sec => {
    map.set(sec.headerIdx, sec)
  })
  return map
})

const collapsedLineIndices = computed(() => {
  const set = new Set()
  const secs = evaluation.value.sections || []
  secs.forEach(sec => {
    if (collapsedSections.value[sec.headerIdx]) {
      for (let i = sec.headerIdx + 1; i <= sec.endIdx; i++) {
        set.add(i)
      }
    }
  })
  return set
})

const hasCollapsedSections = computed(() => Object.values(collapsedSections.value).some(Boolean))

function toggleSectionCollapse(headerIdx) {
  collapsedSections.value[headerIdx] = !collapsedSections.value[headerIdx]
}

function getSectionCollapsedSummary(sec) {
  if (!sec) return ''
  const formattedSub = formatValue(sec.subtotal, { disableFloat: props.disableFloat })
  return `▶ ${sec.title} — Subtotal: ${formattedSub} (${sec.count} lines hidden)`
}

const props = defineProps({
  tab: { type: Object, required: true },
  saveStatus: { type: String, default: 'saved' }, // 'saved' | 'saving' | 'error'
  disableFloat: { type: Boolean, default: false },
  showSidebar: { type: Boolean, default: true }
})

const emit = defineEmits(['update:content', 'toggle-sidebar'])

const inputRef = ref(null)
const gutterRef = ref(null)
const resultsRef = ref(null)
const copiedIndex = ref(null)
const copiedTotal = ref(false)
let copyTimer = null
let totalCopyTimer = null

// Undo / Redo History State
const historyStack = ref([])
const historyIndex = ref(-1)
let isUndoRedoAction = false
let historyDebounceTimer = null

// Autocomplete State
const currentPrefix = ref('')
const autocompleteIndex = ref(0)
const showAutocomplete = ref(false)
const cursorPosition = ref(0)

const visibleLines = computed(() => {
  const raw = props.tab?.content || ''
  const lines = raw.split('\n')
  const secs = evaluation.value.sections || []
  const result = []
  let skipUntil = -1

  lines.forEach((lineText, origIdx) => {
    if (origIdx <= skipUntil) return

    const sec = secs.find(s => s.headerIdx === origIdx)
    if (sec && collapsedSections.value[origIdx]) {
      const hiddenCount = sec.endIdx - sec.headerIdx
      const formattedSub = formatValue(sec.subtotal, { disableFloat: props.disableFloat })
      result.push({
        origIdx,
        lineText: `${lineText} // [▶ ${hiddenCount} lines folded | Subtotal: ${formattedSub}]`,
        isSection: true,
        isCollapsed: true,
        sec
      })
      skipUntil = sec.endIdx
    } else {
      result.push({
        origIdx,
        lineText,
        isSection: Boolean(sec),
        isCollapsed: false,
        sec
      })
    }
  })

  return result
})

const tabContent = computed({
  get: () => {
    if (!visibleLines.value || !Array.isArray(visibleLines.value)) {
      return props.tab?.content || ''
    }
    return visibleLines.value.map(item => item.lineText).join('\n')
  },
  set: (val) => {
    // The folded view is a shortened display projection, not the document itself.
    // Editing it would otherwise save that projection and drop the hidden lines.
    if (hasCollapsedSections.value) return
    emit('update:content', val)
    debouncedRecordHistory(val)
  }
})

function recordHistoryNow(content) {
  if (isUndoRedoAction) return
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1)
  }
  if (historyStack.value[historyIndex.value] === content) return

  historyStack.value.push(content)
  historyIndex.value = historyStack.value.length - 1

  if (historyStack.value.length > 100) {
    historyStack.value.shift()
    historyIndex.value--
  }
}

function debouncedRecordHistory(content) {
  clearTimeout(historyDebounceTimer)
  historyDebounceTimer = setTimeout(() => {
    recordHistoryNow(content)
  }, 300)
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    isUndoRedoAction = true
    emit('update:content', historyStack.value[historyIndex.value])
    setTimeout(() => { isUndoRedoAction = false }, 50)
  }
}

function redo() {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyIndex.value++
    isUndoRedoAction = true
    emit('update:content', historyStack.value[historyIndex.value])
    setTimeout(() => { isUndoRedoAction = false }, 50)
  }
}

// Evaluation output
const evaluation = computed(() => {
  return evaluateAll(props.tab?.content || '', { disableFloat: props.disableFloat })
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
    left: '10px'
  }
})

function updateCursorState() {
  if (!inputRef.value) return
  const pos = inputRef.value.selectionStart || 0
  cursorPosition.value = pos

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
    inputRef.value.focus({ preventScroll: true })
    const newPos = startPos + varName.length
    inputRef.value.selectionStart = inputRef.value.selectionEnd = newPos
  }, 0)
}

function handleKeyDown(e) {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? e.metaKey : e.ctrlKey

  // Handle Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  if (modifier && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault()
    if (e.shiftKey) {
      redo()
    } else {
      undo()
    }
    return
  }

  if (modifier && (e.key === 'y' || e.key === 'Y')) {
    e.preventDefault()
    redo()
    return
  }

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
  recordHistoryNow(tabContent.value)

  const textarea = inputRef.value
  if (!textarea) {
    const needPrefix = tabContent.value && !tabContent.value.endsWith('\n') ? '\n' : ''
    tabContent.value += `${needPrefix}${textToInsert}\n`
    recordHistoryNow(tabContent.value)
    return
  }

  const start = textarea.selectionStart || 0
  const current = tabContent.value

  let prefix = ''
  if (start > 0 && current[start - 1] !== '\n') {
    prefix = '\n'
  }

  let suffix = '\n'
  if (start < current.length && current[start] === '\n') {
    suffix = ''
  }

  const formattedSnippet = prefix + textToInsert + suffix
  const newText = current.substring(0, start) + formattedSnippet + current.substring(start)
  tabContent.value = newText
  recordHistoryNow(newText)

  setTimeout(() => {
    textarea.focus({ preventScroll: true })
    const newPos = start + formattedSnippet.length
    textarea.selectionStart = textarea.selectionEnd = newPos
  }, 0)
}

defineExpose({
  insertTextAtCursor
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0)
  }
  // Initialize initial history snapshot
  recordHistoryNow(tabContent.value)
})

watch(() => props.tab?.id, () => {
  // Reset history stack when active tab changes
  historyStack.value = []
  historyIndex.value = -1
  recordHistoryNow(tabContent.value)
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
  width: 100%;
}

.rows {
  position: relative;
  display: flex;
  min-height: 480px;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  padding-right: 4px;
}

.g-num.is-section {
  font-weight: 700;
  color: var(--accent);
  cursor: pointer;
  border-radius: 4px 0 0 4px;
}

.g-num.is-section:hover {
  color: var(--paper);
  background: rgba(45, 212, 191, 0.16);
}

.btn-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  color: var(--accent);
  padding: 0;
  cursor: pointer;
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease, color 0.15s ease;
}

.btn-fold:hover {
  color: var(--paper);
  transform: scale(1.2);
}

.icon-fold {
  width: 13px;
  height: 13px;
}

.hidden-row {
  display: none !important;
}

.highlighted-line {
  background: rgba(45, 212, 191, 0.12) !important;
}

.r.section-header {
  background: linear-gradient(90deg, rgba(45, 212, 191, 0.18), rgba(45, 212, 191, 0.04)) !important;
  color: var(--accent) !important;
  font-weight: 700;
  border-left: 3px solid var(--accent);
  text-align: left !important;
  padding-left: 8px !important;
}

.r.subtotal-line {
  font-weight: 700;
  color: var(--paper);
  border-top: 1px dashed var(--line);
}

.btn-expand-area {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--line-soft);
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-expand-area:hover, .btn-expand-area.expanded {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-glow);
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
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
  width: 100%;
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

/* Mobile & Tablet Optimizations */
@media (max-width: 768px) {
  .results {
    width: 140px;
    font-size: 13.5px;
    padding: 14px 8px;
  }
}

@media (max-width: 600px) {
  .gutter {
    display: none;
  }

  .input-area {
    font-size: 16px;
    padding: 12px 10px;
  }

  .results {
    width: 115px;
    font-size: 13px;
    padding: 12px 6px;
  }

  .desktop-only {
    display: none;
  }

  .status-bar {
    padding: 8px 12px;
    font-size: 11.5px;
  }
}
</style>
