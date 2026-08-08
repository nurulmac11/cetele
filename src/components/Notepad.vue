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
        <!-- Editor Syntax Highlighting Backdrop Layer -->
        <div ref="backdropRef" class="editor-backdrop" aria-hidden="true">
          <div
            v-for="(line, idx) in formattedEditorLines"
            :key="idx"
            class="backdrop-line"
          >
            <template v-for="(token, tIdx) in line.tokens" :key="tIdx">
              <span :class="token.cls">{{ token.text }}</span>
            </template>
            <span v-if="line.tokens.length === 0 || !line.tokens[0].text">&nbsp;</span>
          </div>
        </div>

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
          @input="updateCursorState"
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
      <div ref="resultsRef" class="results" @scroll="syncScrollFromResults">
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
          <!-- Copied badge overlay -->
          <span v-if="copiedIndex === item.origIdx" class="copied-badge">Copied!</span>

          <!-- Section Header Row -->
          <template v-else-if="item.isSection">
            <div class="res-section-header" @click.stop="toggleSectionCollapse(item.origIdx)">
              <span class="sec-toggle-icon">{{ item.isCollapsed ? '▸' : '▾' }}</span>
              <span class="sec-title-text">{{ item.sec?.title || evaluation.rendered[item.origIdx]?.text }}</span>
              <span v-if="item.isCollapsed" class="sec-collapsed-subtotal">
                — {{ formatValue(item.sec?.subtotal, { disableFloat: props.disableFloat }) }}
              </span>
            </div>
          </template>

          <!-- Comment Row -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.cls === 'comment'">
            <div
              v-if="evaluation.rendered[item.origIdx]?.text"
              class="comment-badge"
              :title="evaluation.rendered[item.origIdx].text"
            >
              <span class="comment-badge-prefix">//</span>
              <span class="comment-badge-text">{{ evaluation.rendered[item.origIdx].text }}</span>
            </div>
            <span v-else class="comment-empty-space">&nbsp;</span>
          </template>

          <!-- Subtotal Row -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.cls === 'num subtotal-line' || evaluation.rendered[item.origIdx]?.isSubtotal">
            <div class="res-row subtotal-row">
              <span class="res-label subtotal-label">subtotal</span>
              <span class="res-value subtotal-value">{{ evaluation.rendered[item.origIdx]?.text }}</span>
              <Copy class="row-hover-copy" />
            </div>
          </template>

          <!-- Error Row -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.cls === 'err'">
            <div class="res-row err-row">
              <span class="res-label">{{ getLineLeftLabel(item.lineText) }}</span>
              <span class="res-value err-val">{{ evaluation.rendered[item.origIdx]?.text || '—' }}</span>
            </div>
          </template>

          <!-- Normal Evaluated Result Row (Two-column: Label on left, Value on right) -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.text">
            <div
              class="res-row"
              :class="{ 'negative-val': getRowDetails(item).isNegative }"
            >
              <span class="res-label" :title="getRowDetails(item).label">{{ getRowDetails(item).label }}</span>
              <span class="res-value">
                <template v-if="getRowDetails(item).unitPart">
                  <span class="val-num">{{ getRowDetails(item).numPart }}</span>
                  <span class="val-unit">{{ getRowDetails(item).unitPart }}</span>
                </template>
                <template v-else>
                  {{ getRowDetails(item).valueText }}
                </template>
              </span>
              <Copy class="row-hover-copy" />
            </div>
          </template>

          <!-- Empty Row -->
          <template v-else>
            <span class="res-empty-space">&nbsp;</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Helper Bar (Shown ONLY on mobile <= 600px) -->
    <div class="mobile-helper-bar">
      <button class="btn-helper accent-op" @mousedown.prevent @click="insertInlineSymbol(' = ')">=</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol(' + ')">+</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol(' - ')">-</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol(' * ')">*</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol(' / ')">/</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol(' % ')">%</button>
      <button class="btn-helper" @mousedown.prevent @click="insertInlineSymbol('#')">#line</button>
      <button class="btn-helper icon-btn" @mousedown.prevent @click="handleUndo" title="Undo"><RotateCcw class="icon-xs" /></button>
      <button class="btn-helper icon-btn" @mousedown.prevent @click="handleRedo" title="Redo"><RotateCw class="icon-xs" /></button>
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
          class="btn-expand-area desktop-only"
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
import { HardDrive, Loader2, AlertCircle, ChevronDown, ChevronRight, RotateCcw, RotateCw, Variable, X, Copy } from '@lucide/vue'

function getRowDetails(item) {
  if (!item) return {}
  const origIdx = item.origIdx
  const res = evaluation.value?.rendered?.[origIdx] || {}
  const rawLine = item.lineText || ''

  if (item.isSection) {
    const sec = item.sec
    return {
      type: 'section',
      isCollapsed: item.isCollapsed,
      title: sec ? sec.title : (res.title || res.text || ''),
      subtotalText: sec ? formatValue(sec.subtotal, { disableFloat: props.disableFloat }) : ''
    }
  }

  if (res.cls === 'comment') {
    return { type: 'comment', text: res.text }
  }

  if (res.cls === 'num subtotal-line' || res.isSubtotal) {
    return {
      type: 'subtotal',
      label: 'subtotal',
      valueText: res.text || ''
    }
  }

  if (res.cls === 'err') {
    return {
      type: 'error',
      label: getLineLeftLabel(rawLine),
      valueText: res.text || '—'
    }
  }

  if (!res.text || res.cls === 'empty') {
    return { type: 'empty' }
  }

  const label = getLineLeftLabel(rawLine)
  const isNegative = typeof res.text === 'string' && (res.text.startsWith('-') || res.text.includes('-'))

  let numPart = res.text
  let unitPart = ''

  if (typeof res.text === 'string') {
    const m = res.text.match(/^(.*?)\s*([A-Z]{2,4}|TL|USD|EUR|GBP|BTC|ETH|SOL|GRAM|CEYREK)$/i)
    if (m) {
      numPart = m[1]
      unitPart = m[2]
    }
  }

  return {
    type: res.cls || 'num',
    label,
    valueText: res.text,
    numPart,
    unitPart,
    isNegative
  }
}

function getLineLeftLabel(rawLine) {
  if (!rawLine) return ''
  const clean = rawLine.replace(/(\/\*[\s\S]*?\*\/|\/\/.*|"""[\s\S]*?"""|'''[\s\S]*?''')/g, '').trim()
  if (!clean) return ''

  const assignMatch = clean.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/)
  if (assignMatch) {
    return assignMatch[1]
  }

  if (clean.startsWith('===') || clean.startsWith('---')) {
    return ''
  }

  if (clean.includes(' to ') || clean.includes(' in ') || /[\+\-\*\/\%#]/.test(clean)) {
    return clean
  }

  if (['total', 'subtotal', 'prev'].includes(clean.toLowerCase())) {
    return clean.toLowerCase()
  }

  if (/^[0-9]+(?:\.[0-9]+)?[kmbT]?$/i.test(clean)) {
    return clean
  }

  return clean
}

const collapsedSections = ref({})
const hoveredLineIndex = ref(null)
const backdropRef = ref(null)

const KEYWORDS = new Set([
  'subtotal', 'total', 'prev', 'to', 'in', 'of', 'off', 'increase', 'decrease', 'by',
  'min', 'max', 'sqrt', 'abs', 'round', 'floor', 'ceil', 'log', 'sin', 'cos', 'tan', 'count', 'sum', 'avg', 'average',
  'today', 'now',
  'days', 'day', 'weeks', 'week', 'months', 'month', 'years', 'year', 'hours', 'hour', 'mins', 'min', 'minutes', 'minute', 'sec', 'second', 'seconds',
  'pi', 'e'
])

const CURRENCY_CRYPTO_GOLD = new Set([
  'usd', 'eur', 'gbp', 'try', 'tl', 'cad', 'aud', 'chf', 'jpy', 'cny', 'rub', 'inr', 'zar', 'krw', 'sgd', 'hkd', 'nzd', 'sek', 'nok', 'mxn', 'brl',
  'dollar', 'dollars', 'euro', 'euros', 'pound', 'pounds', 'lira', 'tlira', 'yen', 'rupee', 'rmb',
  'btc', 'eth', 'sol', 'usdt', 'bnb', 'xrp', 'doge', 'ada', 'avax',
  'gold', 'altin', 'altın', 'ceyrek', 'çeyrek', 'oz', 'ounce', 'ounces', 'troy', 'gram', 'xau'
])

const MEASUREMENT_UNITS = new Set([
  'km', 'mile', 'miles', 'm', 'cm', 'mm', 'ft', 'inch', 'inches', 'kg', 'g', 'lbs', 'lb', 'celcius', 'fahrenheit'
])

function tokenizeCodePart(code) {
  if (!code) return []

  const tokens = []
  const regex = /(?:\$[0-9]+(?:\.[0-9]+)?[kmbT]?|[0-9]+(?:\.[0-9]+)?[kmbT]?%?|#[0-9]+|\b[Ll][0-9]+\b|\b[Ll]ine[0-9]+\b|\$|€|£|\b[a-zA-Z_][a-zA-Z0-9_]*\b|[\+\-\*\/\=\(\)%])/gi

  let lastIndex = 0
  let match

  while ((match = regex.exec(code)) !== null) {
    const text = match[0]
    const idx = match.index

    if (idx > lastIndex) {
      tokens.push({ cls: 'tok-code', text: code.slice(lastIndex, idx) })
    }

    const lower = text.toLowerCase()
    let cls = 'tok-code'

    if (text === '$' || text === '€' || text === '£' || text.startsWith('$')) {
      cls = 'tok-currency'
    } else if (/^#[0-9]+$/.test(text) || /^[Ll][0-9]+$/.test(text) || /^[Ll]ine[0-9]+$/i.test(text)) {
      cls = 'tok-number'
    } else if (/^[0-9]+(?:\.[0-9]+)?[kmbT]?%?$/.test(text)) {
      cls = 'tok-number'
    } else if (KEYWORDS.has(lower)) {
      cls = 'tok-keyword'
    } else if (CURRENCY_CRYPTO_GOLD.has(lower)) {
      cls = 'tok-currency'
    } else if (MEASUREMENT_UNITS.has(lower)) {
      cls = 'tok-unit'
    } else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) {
      cls = 'tok-variable'
    } else if (/[\+\-\*\/\=\(\)%]/.test(text)) {
      cls = 'tok-op'
    }

    tokens.push({ cls, text })
    lastIndex = idx + text.length
  }

  if (lastIndex < code.length) {
    tokens.push({ cls: 'tok-code', text: code.slice(lastIndex) })
  }

  return tokens.length > 0 ? tokens : [{ cls: 'tok-code', text: code }]
}

const formattedEditorLines = computed(() => {
  const text = tabContent.value || ''
  const lines = text.split('\n')
  const result = []

  let inComment = false
  let delim = null

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (inComment) {
      const closingStr = delim === '/*' ? '*/' : delim
      if (line.includes(closingStr)) {
        inComment = false
        delim = null
      }
      result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
      return
    }

    let open = null
    if (trimmed.startsWith('"""')) open = '"""'
    else if (trimmed.startsWith("'''")) open = "'''"
    else if (trimmed.startsWith('/*')) open = '/*'

    if (open) {
      const rest = trimmed.slice(open.length)
      const closeStr = open === '/*' ? '*/' : open
      if (rest.includes(closeStr)) {
        result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
        return
      } else {
        inComment = true
        delim = open
        result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
        return
      }
    }

    if (trimmed.startsWith('//')) {
      result.push({ tokens: [{ cls: 'tok-comment', text: line }] })
      return
    }

    const secMatch = line.match(/^(\s*)(={3,}|-{3,})\s*(.*?)\s*(={3,}|-{3,})(\s*)$/)
    if (secMatch) {
      result.push({
        tokens: [
          { cls: 'tok-code', text: secMatch[1] },
          { cls: 'tok-header-line', text: secMatch[2] + ' ' },
          { cls: 'tok-header-title', text: secMatch[3] },
          { cls: 'tok-header-line', text: ' ' + secMatch[4] },
          { cls: 'tok-code', text: secMatch[5] }
        ]
      })
      return
    }

    const secStartMatch = line.match(/^(\s*)(={3,}|-{3,})\s*(.*)$/)
    if (secStartMatch) {
      result.push({
        tokens: [
          { cls: 'tok-code', text: secStartMatch[1] },
          { cls: 'tok-header-line', text: secStartMatch[2] + ' ' },
          { cls: 'tok-header-title', text: secStartMatch[3] }
        ]
      })
      return
    }

    const commentMatch = line.match(/(\/\*[\s\S]*?\*\/|\/\/.*|"""[\s\S]*?"""|'''[\s\S]*?''')/)
    if (commentMatch) {
      const commentIdx = commentMatch.index
      const codePart = line.slice(0, commentIdx)
      const commentPart = line.slice(commentIdx)
      result.push({
        tokens: [
          ...tokenizeCodePart(codePart),
          { cls: 'tok-comment', text: commentPart }
        ]
      })
      return
    }

    result.push({ tokens: tokenizeCodePart(line) })
  })

  return result
})

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

const emit = defineEmits(['update:content', 'toggle-sidebar', 'variables-updated'])

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
        const valText = (lineRes && (lineRes.cls === 'num' || lineRes.cls === 'date') && lineRes.text) ? lineRes.text : ''
        map.set(varName, valText)
      }
    }
  })

  return map
})

const declaredVariablesList = computed(() => {
  const list = []
  declaredVariablesMap.value.forEach((value, name) => {
    list.push({ name, value: value || '0' })
  })
  return list
})

watch(declaredVariablesList, (newList) => {
  emit('variables-updated', newList)
}, { immediate: true })

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

const autocompletePos = ref({ top: 40, left: 10 })

function getCaretCoordinates() {
  if (!inputRef.value) return { top: 40, left: 10 }

  const pos = inputRef.value.selectionStart || 0
  const textBefore = tabContent.value.slice(0, pos)
  const lines = textBefore.split('\n')
  const lineIndex = lines.length - 1
  const currentLineText = lines[lineIndex]

  const textarea = inputRef.value
  const style = window.getComputedStyle(textarea)

  const lineHeight = parseFloat(style.lineHeight) || 26
  const paddingTop = parseFloat(style.paddingTop) || 16
  const paddingLeft = parseFloat(style.paddingLeft) || 14
  const scrollTop = textarea.scrollTop || 0
  const scrollLeft = textarea.scrollLeft || 0

  let measurer = document.getElementById('caret-measurer')
  if (!measurer) {
    measurer = document.createElement('span')
    measurer.id = 'caret-measurer'
    measurer.style.visibility = 'hidden'
    measurer.style.position = 'absolute'
    measurer.style.whiteSpace = 'pre'
    measurer.style.top = '-9999px'
    measurer.style.left = '-9999px'
    measurer.style.pointerEvents = 'none'
    document.body.appendChild(measurer)
  }
  measurer.style.font = style.font
  measurer.style.fontFamily = style.fontFamily
  measurer.style.fontSize = style.fontSize
  measurer.style.fontWeight = style.fontWeight
  measurer.style.letterSpacing = style.letterSpacing
  measurer.textContent = currentLineText

  const textWidth = measurer.getBoundingClientRect().width

  let top = paddingTop + (lineIndex + 1) * lineHeight - scrollTop + 2
  let left = paddingLeft + textWidth - scrollLeft

  const wrapperEl = textarea.parentElement
  if (wrapperEl) {
    const wrapperWidth = wrapperEl.clientWidth || 300
    if (left + 230 > wrapperWidth) {
      left = Math.max(10, wrapperWidth - 240)
    }
  }

  return { top: Math.max(10, top), left: Math.max(10, left) }
}

const autocompleteStyle = computed(() => {
  return {
    top: `${autocompletePos.value.top}px`,
    left: `${autocompletePos.value.left}px`
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
      autocompletePos.value = getCaretCoordinates()
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
  if (!res.text || res.cls === 'empty' || res.cls === 'comment' || res.cls === 'err') return

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

let isSyncingInput = false
let isSyncingResults = false

function syncScroll() {
  if (!inputRef.value || isSyncingInput) return
  isSyncingResults = true
  const scrollTop = inputRef.value.scrollTop
  const scrollLeft = inputRef.value.scrollLeft
  if (backdropRef.value) {
    backdropRef.value.scrollTop = scrollTop
    backdropRef.value.scrollLeft = scrollLeft
  }
  if (gutterRef.value) gutterRef.value.scrollTop = scrollTop
  if (resultsRef.value) resultsRef.value.scrollTop = scrollTop
  if (showAutocomplete.value) {
    autocompletePos.value = getCaretCoordinates()
  }
  requestAnimationFrame(() => { isSyncingResults = false })
}

function syncScrollFromResults() {
  if (!resultsRef.value || isSyncingResults) return
  isSyncingInput = true
  const scrollTop = resultsRef.value.scrollTop
  if (inputRef.value) inputRef.value.scrollTop = scrollTop
  if (backdropRef.value) backdropRef.value.scrollTop = scrollTop
  if (gutterRef.value) gutterRef.value.scrollTop = scrollTop
  requestAnimationFrame(() => { isSyncingInput = false })
}

function insertTabIndent() {
  recordHistoryNow(tabContent.value)
  const textarea = inputRef.value
  if (!textarea) {
    tabContent.value += '  '
    recordHistoryNow(tabContent.value)
    return
  }
  const start = textarea.selectionStart || 0
  const end = textarea.selectionEnd || 0
  const current = tabContent.value
  tabContent.value = current.substring(0, start) + '  ' + current.substring(end)
  nextTick(() => {
    textarea.focus()
    textarea.selectionStart = textarea.selectionEnd = start + 2
    recordHistoryNow(tabContent.value)
  })
}

function insertInlineSymbol(strToInsert) {
  const textarea = inputRef.value
  const start = textarea ? (textarea.selectionStart || 0) : tabContent.value.length
  const end = textarea ? (textarea.selectionEnd || 0) : tabContent.value.length

  recordHistoryNow(tabContent.value)

  if (!textarea) {
    tabContent.value += strToInsert
    recordHistoryNow(tabContent.value)
    return
  }

  const current = tabContent.value
  const newText = current.substring(0, start) + strToInsert + current.substring(end)
  tabContent.value = newText

  const newPos = start + strToInsert.length
  nextTick(() => {
    textarea.focus()
    textarea.setSelectionRange(newPos, newPos)
    recordHistoryNow(tabContent.value)
  })
}

function handleUndo() {
  undo()
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
}

function handleRedo() {
  redo()
  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  })
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
  background: var(--panel-solid);
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
  background: #162233;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 26px;
  padding: 16px 0;
  text-align: right;
  padding-right: 10px;
  overflow: hidden;
  user-select: none;
  border-right: 1px solid var(--line-soft);
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
  font-weight: 600;
  color: var(--syn-keyword, #9B8AFB);
  cursor: pointer;
  border-radius: 4px 0 0 4px;
}

.g-num.is-section:hover {
  color: var(--paper-bright);
  background: rgba(155, 138, 251, 0.12);
}

.btn-fold {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 0;
  color: var(--syn-keyword, #9B8AFB);
  padding: 0;
  cursor: pointer;
  width: 14px;
  height: 14px;
  transition: transform 0.15s ease, color 0.15s ease;
}

.btn-fold:hover {
  color: var(--paper-bright);
  transform: scale(1.15);
}

.icon-fold {
  width: 13px;
  height: 13px;
}

.hidden-row {
  display: none !important;
}

.highlighted-line {
  background: rgba(22, 217, 196, 0.05) !important;
}

.r.section-header {
  background: linear-gradient(90deg, rgba(155, 138, 251, 0.1) 0%, rgba(155, 138, 251, 0.01) 100%) !important;
  color: var(--syn-keyword, #9B8AFB) !important;
  font-weight: 600;
  border-left: 3px solid var(--syn-keyword, #9B8AFB);
  text-align: left !important;
  padding-left: 8px !important;
}

.section-title-text {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.r.subtotal-line {
  font-weight: 600;
  color: var(--syn-keyword, #9B8AFB) !important;
  border-top: 1px dashed var(--line-soft);
}

.btn-expand-area {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--card-bg);
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
  border-color: rgba(22, 217, 196, 0.25);
  background: rgba(22, 217, 196, 0.08);
}

.input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
  background: var(--editor-bg);
}

.editor-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14.5px;
  line-height: 26px;
  letter-spacing: 0;
  tab-size: 2;
  -moz-tab-size: 2;
  white-space: pre;
  overflow: hidden;
  pointer-events: none;
  color: var(--paper);
  user-select: none;
  z-index: 0;
  box-sizing: border-box;
}

.backdrop-line {
  min-height: 26px;
  height: 26px;
  line-height: 26px;
  white-space: pre;
  box-sizing: border-box;
}

.tok-comment {
  color: var(--syn-comment, #54667A);
  font-style: italic;
  font-weight: 400;
  opacity: 0.9;
}

.tok-header-line {
  color: rgba(155, 138, 251, 0.4);
  font-weight: 500;
}

.tok-header-title {
  color: var(--syn-keyword, #9B8AFB);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tok-keyword {
  color: var(--syn-keyword, #9B8AFB);
  font-weight: 600;
}

.tok-number {
  color: var(--syn-number, #F59E0B);
  font-weight: 500;
}

.tok-currency {
  color: var(--syn-currency, #F5B94C);
  font-weight: 500;
}

.tok-variable {
  color: var(--syn-variable, #16D9C4);
  font-weight: 500;
}

.tok-unit {
  color: var(--syn-unit, #7D8F9F);
}

.tok-op {
  color: var(--muted, #6B7F96);
  font-weight: 500;
}

.tok-code {
  color: var(--paper, #C9D6E5);
}

.input-area {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 16px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14.5px;
  line-height: 26px;
  letter-spacing: 0;
  tab-size: 2;
  -moz-tab-size: 2;
  background: transparent;
  color: transparent;
  caret-color: var(--paper-bright);
  border: none;
  outline: none;
  resize: none;
  white-space: pre;
  overflow-x: auto;
  overflow-y: auto;
  z-index: 1;
  box-sizing: border-box;
  -webkit-text-size-adjust: 100%;
}

.input-area::placeholder {
  color: var(--muted);
  opacity: 0.5;
}

/* Autocomplete Overlay Menu */
.autocomplete-menu {
  position: absolute;
  z-index: 100;
  background: var(--panel-solid);
  border: 1px solid var(--line-hover);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
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
  border-bottom: 1px solid var(--line-soft);
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
}

.results {
  width: 310px;
  flex: none;
  border-left: 1px solid #1A2A3D;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 26px;
  padding: 16px 12px;
  overflow-y: auto;
  scrollbar-width: none;
  background: #0D1725;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

[data-theme="light"] .results {
  background: #F8FAFC;
  border-left-color: #E2E8F0;
}

.results::-webkit-scrollbar {
  display: none;
}

.r {
  height: 26px;
  line-height: 26px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  transition: background-color 0.15s ease, color 0.15s ease, opacity 0.15s ease;
  border-radius: 4px;
  padding: 0 6px;
  box-sizing: border-box;
}

.r:not(.empty):not(.comment):not(.err) {
  cursor: pointer;
}

.r:not(.empty):not(.comment):not(.err):hover {
  background: rgba(32, 216, 196, 0.06);
}

.r:not(.empty):not(.comment):not(.err):hover .val-num,
.r:not(.empty):not(.comment):not(.err):hover .res-value {
  color: #21E6D0;
}

.r:not(.empty):not(.comment):not(.err):hover .row-hover-copy {
  opacity: 0.6;
}

.row-hover-copy {
  width: 12px;
  height: 12px;
  color: var(--muted);
  opacity: 0;
  margin-left: 6px;
  flex-shrink: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
}

.row-hover-copy:hover {
  opacity: 1 !important;
  color: var(--accent);
}

.res-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
  width: 100%;
}

.res-label {
  font-size: 12.5px;
  color: #8A9AAF;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  text-align: left;
}

[data-theme="light"] .res-label {
  color: #64748B;
}

.res-value {
  font-size: 13.5px;
  color: #20D8C4;
  font-weight: 600;
  white-space: nowrap;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  transition: color 0.15s ease, opacity 0.15s ease;
}

.val-num {
  color: #20D8C4;
  font-weight: 600;
}

.val-unit {
  color: #8A9AAF;
  font-size: 11.5px;
  font-weight: 500;
  margin-left: 4px;
}

.negative-val .res-value,
.negative-val .val-num {
  color: var(--err, #E55353) !important;
}

/* Subtotal Row */
.subtotal-row {
  border-top: 1px dashed #1A2A3D;
}

[data-theme="light"] .subtotal-row {
  border-top-color: #CBD5E1;
}

.subtotal-label {
  color: #A99BFF !important;
  font-weight: 600;
  text-transform: lowercase;
}

.subtotal-value {
  color: #20D8C4 !important;
  font-weight: 700;
}

/* Section Header in Results */
.res-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  width: 100%;
  color: #A99BFF;
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  letter-spacing: 0.02em;
  user-select: none;
  padding-bottom: 2px;
}

.sec-toggle-icon {
  font-size: 11px;
  color: #A99BFF;
  width: 12px;
  display: inline-block;
  text-align: center;
}

.sec-title-text {
  color: #A99BFF;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sec-collapsed-subtotal {
  font-size: 11.5px;
  color: var(--muted);
  font-weight: 500;
  margin-left: auto;
}

.err-val {
  color: var(--err, #E55353);
  font-size: 12px;
  opacity: 0.85;
}

.copied-badge {
  font-size: 11.5px;
  color: #20D8C4;
  letter-spacing: 0.03em;
  font-weight: 600;
}

.r.comment {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: transparent;
  cursor: default;
}

.comment-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  background: var(--card-bg);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  font-size: 11.5px;
  color: var(--muted);
  font-style: italic;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.15s ease;
  line-height: 1.2;
}

.comment-badge:hover {
  background: var(--item-bg);
  border-color: var(--line);
  color: var(--paper);
}

.comment-badge-prefix {
  font-weight: 600;
  font-style: normal;
  color: var(--syn-comment);
  font-size: 11px;
}

.comment-badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 18px;
  border-top: 1px solid var(--line-soft);
  background: var(--panel-solid);
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
  background: rgba(22, 217, 196, 0.1);
}

.copied-mini {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.sep {
  color: var(--line-soft);
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
  background: var(--card-bg);
  border: 1px solid var(--line);
}

.sync-badge.saved {
  color: var(--accent);
  border-color: rgba(22, 217, 196, 0.25);
  background: rgba(22, 217, 196, 0.08);
}

.sync-badge.saving {
  color: var(--amber);
  border-color: rgba(245, 185, 76, 0.25);
  background: rgba(245, 185, 76, 0.08);
}

.sync-badge.error {
  color: var(--err);
  border-color: rgba(229, 83, 83, 0.25);
  background: rgba(229, 83, 83, 0.08);
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
  .gutter {
    width: 36px;
    padding: 14px 0;
    padding-right: 6px;
    font-size: 13px;
  }

  .editor-backdrop,
  .input-area {
    font-size: 14.5px;
    line-height: 26px;
    padding: 14px 12px;
  }

  .results {
    width: 140px;
    font-size: 13.5px;
    line-height: 26px;
    padding: 14px 8px;
  }

  /* Hide variable labels and hover icons on mobile for clean compact single-column display */
  .res-label {
    display: none !important;
  }

  .res-row {
    justify-content: flex-end;
  }

  .row-hover-copy {
    display: none !important;
  }
}

@media (max-width: 600px) {
  .gutter {
    width: 28px;
    padding: 12px 0;
    padding-right: 4px;
    font-size: 11px;
  }

  .num-text {
    font-size: 11px;
  }

  .editor-backdrop,
  .input-area {
    font-size: 15px;
    line-height: 26px;
    padding: 12px 10px;
  }

  .results {
    width: 125px;
    font-size: 13.5px;
    line-height: 26px;
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

@media (max-width: 400px) {
  .gutter {
    display: none;
  }

  .editor-backdrop,
  .input-area {
    font-size: 14.5px;
    padding: 12px 8px;
  }

  .results {
    width: 110px;
    font-size: 13px;
    padding: 12px 5px;
  }
}

/* Mobile Quick Helper Toolbar */
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

/* Mobile Variables Modal */
.mobile-vars-modal {
  position: fixed;
  top: 96px;
  left: 16px;
  right: 16px;
  max-width: 480px;
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
}

.vars-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.vars-modal-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 13px;
  color: var(--paper);
}

.vars-modal-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 50vh;
  overflow-y: auto;
}

.vars-modal-item {
  display: grid;
  grid-template-columns: minmax(70px, 1fr) 20px minmax(70px, 1fr);
  align-items: center;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--line);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  cursor: pointer;
}

.vars-modal-item:hover {
  background: var(--accent-glow);
  border-color: var(--accent);
}
</style>
