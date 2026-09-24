<template>
  <div class="notepad">
    <div class="rows">
      <!-- Line number gutter (hidden on small mobile screens) -->
      <div ref="gutterRef" class="gutter">
        <div class="row-spacer" :style="{ height: `${windowSpacers.top}px` }" aria-hidden="true"></div>
        <div
          v-for="{ k, item } in windowRows"
          :key="k"
          class="g-num"
          :class="{
            'is-section': item.isSection,
            'highlighted-line': hoveredLineIndex === item.origIdx,
            'is-ref-target': refTargets.has(item.origIdx),
            'line-flash': flashLineIndex === item.origIdx
          }"
          @click="item.isSection && toggleSectionCollapse(item.origIdx)"
          @mouseenter="hoveredLineIndex = item.origIdx"
          @mouseleave="hoveredLineIndex = null"
        >
          <button
            v-if="item.isSection"
            :aria-label="collapsedSections[item.origIdx] ? 'Expand section' : 'Collapse section'"
            class="btn-fold"
            :title="collapsedSections[item.origIdx] ? 'Expand section' : 'Collapse section'"
            @click.stop="toggleSectionCollapse(item.origIdx)"
          >
            <ChevronRight v-if="collapsedSections[item.origIdx]" class="icon-fold" />
            <ChevronDown v-else class="icon-fold" />
          </button>
          <span class="num-text">{{ item.origIdx + 1 }}</span>
        </div>
        <div class="row-spacer" :style="{ height: `${windowSpacers.bottom}px` }" aria-hidden="true"></div>
      </div>

      <!-- Textarea input container -->
      <div class="input-wrapper">
        <!-- Editor Syntax Highlighting Backdrop Layer -->
        <div ref="backdropRef" class="editor-backdrop" aria-hidden="true">
          <div class="row-spacer" :style="{ height: `${windowSpacers.top}px` }"></div>
          <div
            v-for="{ k, item, line } in windowRows"
            :key="k"
            class="backdrop-line"
            :class="{
              'is-ref-target': refTargets.has(item.origIdx),
              'line-flash': flashLineIndex === item.origIdx
            }"
          >
            <template v-for="(token, tIdx) in line.tokens" :key="tIdx">
              <span :class="token.cls">{{ token.text }}</span>
            </template>
            <span v-if="line.tokens.length === 0 || !line.tokens[0].text">&nbsp;</span>
          </div>
          <div class="row-spacer" :style="{ height: `${windowSpacers.bottom}px` }"></div>
        </div>

        <textarea
          ref="inputRef"
          v-model="tabContent"
          class="input-area"
          aria-label="Calculations: type one expression per line"
          aria-describedby="notepad-sr-hint"
          :readonly="hasCollapsedSections"
          spellcheck="false"
          autocomplete="off"
          :placeholder="
            hasCollapsedSections
              ? 'Expand folded sections to edit...'
              : '// Type math expressions, unit conversions, or date math here...'
          "
          :title="
            hasCollapsedSections ? 'Expand folded sections before editing to keep their hidden lines intact.' : ''
          "
          @scroll="syncScroll"
          @focus="isEditorFocused = true"
          @blur="isEditorFocused = false"
          @keydown="handleKeyDown"
          @keyup="updateCursorState"
          @click="updateCursorState"
          @input="updateCursorState"
        ></textarea>

        <!-- Autocomplete: variables, functions, currencies, units, keywords -->
        <AutocompleteMenu
          v-if="showAutocomplete && autocompleteSuggestions.length > 0"
          :suggestions="autocompleteSuggestions"
          :active-index="autocompleteIndex"
          :menu-style="autocompleteStyle"
          @choose="applyAutocomplete"
        />
      </div>

      <!-- Evaluated results column -->
      <div
        ref="resultsRef"
        class="results"
        role="list"
        aria-label="Results, one per line"
        @scroll="syncScrollFromResults"
      >
        <div class="row-spacer" :style="{ height: `${windowSpacers.top}px` }" aria-hidden="true"></div>
        <div
          v-for="{ k, item, details } in windowRows"
          :key="k"
          class="r"
          role="listitem"
          :aria-posinset="item.origIdx + 1"
          :aria-setsize="evaluation.count"
          :class="[
            evaluation.rendered[item.origIdx]?.cls,
            {
              copied: copiedIndex === item.origIdx,
              'highlighted-line': hoveredLineIndex === item.origIdx,
              'is-ref-target': refTargets.has(item.origIdx),
              'line-flash': flashLineIndex === item.origIdx
            }
          ]"
          :title="
            evaluation.rendered[item.origIdx]?.error ||
            [
              evaluation.rendered[item.origIdx]?.note,
              evaluation.rendered[item.origIdx]?.text
                ? 'Click to copy ' +
                  evaluation.rendered[item.origIdx].text +
                  ' · Alt+click to insert #' +
                  (item.origIdx + 1)
                : ''
            ]
              .filter(Boolean)
              .join(' · ')
          "
          @click="onResultClick($event, item.origIdx)"
          @mouseenter="hoveredLineIndex = item.origIdx"
          @mouseleave="hoveredLineIndex = null"
        >
          <span class="sr-only">Line {{ item.origIdx + 1 }}:</span>
          <!-- Copied badge overlay -->
          <span v-if="copiedIndex === item.origIdx" class="copied-badge">Copied!</span>

          <!-- Section Header Row -->
          <template v-else-if="item.isSection">
            <div class="res-section-header" @click.stop="toggleSectionCollapse(item.origIdx)">
              <span class="sec-toggle-icon">{{ item.isCollapsed ? '▸' : '▾' }}</span>
              <span class="sec-title-text">{{ item.sec?.title || evaluation.rendered[item.origIdx]?.text }}</span>
              <span v-if="item.isCollapsed" class="sec-collapsed-subtotal"> — {{ item.sec?.subtotalText }} </span>
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
          <template
            v-else-if="
              evaluation.rendered[item.origIdx]?.cls === 'num subtotal-line' ||
              evaluation.rendered[item.origIdx]?.isSubtotal
            "
          >
            <div class="res-row subtotal-row">
              <span class="res-label subtotal-label">subtotal</span>
              <span class="res-value subtotal-value">{{ evaluation.rendered[item.origIdx]?.text }}</span>
              <button
                class="row-insert-ref"
                :title="`Insert a reference to line ${item.origIdx + 1} at the cursor`"
                :aria-label="`Insert reference to line ${item.origIdx + 1}`"
                @click.stop="insertReference(item.origIdx)"
              >
                #{{ item.origIdx + 1 }}
              </button>
              <Copy class="row-hover-copy" />
            </div>
          </template>

          <!-- Error Row -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.cls === 'err'">
            <div class="res-row err-row" :title="evaluation.rendered[item.origIdx]?.error || ''">
              <!-- Show why the line failed, so it's readable without hovering (and on touch screens) -->
              <span v-if="evaluation.rendered[item.origIdx]?.error" class="res-label err-reason">
                {{ evaluation.rendered[item.origIdx].error }}
              </span>
              <span v-else class="res-label">{{ details.label }}</span>
              <span class="res-value err-val">{{ evaluation.rendered[item.origIdx]?.text || '—' }}</span>
            </div>
          </template>

          <!-- Normal Evaluated Result Row (Two-column: Label on left, Value on right) -->
          <template v-else-if="evaluation.rendered[item.origIdx]?.text">
            <div class="res-row" :class="{ 'negative-val': details.isNegative }">
              <span class="res-label" :title="details.label">{{ details.label }}</span>
              <span class="res-value">
                <template v-if="details.unitPart">
                  <span class="val-num">{{ details.numPart }}</span>
                  <span class="val-unit">{{ details.unitPart }}</span>
                </template>
                <template v-else>
                  {{ details.valueText }}
                </template>
              </span>
              <!-- Marks results that used another day's rates; the reason is in the row tooltip -->
              <span
                v-if="evaluation.rendered[item.origIdx]?.note"
                class="res-note"
                :aria-label="evaluation.rendered[item.origIdx].note"
                >*</span
              >
              <button
                class="row-insert-ref"
                :title="`Insert a reference to line ${item.origIdx + 1} at the cursor`"
                :aria-label="`Insert reference to line ${item.origIdx + 1}`"
                @click.stop="insertReference(item.origIdx)"
              >
                #{{ item.origIdx + 1 }}
              </button>
              <Copy class="row-hover-copy" />
            </div>
          </template>

          <!-- Empty Row -->
          <template v-else>
            <span class="res-empty-space">&nbsp;</span>
          </template>
        </div>
        <div class="row-spacer" :style="{ height: `${windowSpacers.bottom}px` }" aria-hidden="true"></div>
      </div>
    </div>

    <!-- Screen readers: how results work, and the result of the line being edited -->
    <p id="notepad-sr-hint" class="sr-only">
      Each line's result is read out when you move to it or pause typing. Ctrl+K searches all tabs.
    </p>
    <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">{{ lineAnnouncement }}</div>

    <!-- Symbol buttons (phones only) -->
    <NotepadHelperBar @insert="insertInlineSymbol" @undo="handleUndo" @redo="handleRedo" />

    <NotepadStatusBar
      :line-count="evaluation.count"
      :total-text="formattedTotal"
      :show-sidebar="showSidebar"
      :save-status="saveStatus"
      @toggle-sidebar="$emit('toggle-sidebar')"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { evaluateAll } from '../services/evaluator.js'
import { highlightDocument } from '../services/highlighter.js'
import { getRowDetails, ASSIGNMENT_RE } from '../services/rowDetails.js'
import { copyText } from '../utils/clipboard.js'
import { hasCommandModifier } from '../utils/platform.js'
import { useUndoHistory } from '../composables/notepad/useUndoHistory.js'
import { useSectionFolding } from '../composables/notepad/useSectionFolding.js'
import { useRowWindow } from '../composables/notepad/useRowWindow.js'
import { useLineReferences } from '../composables/notepad/useLineReferences.js'
import { useAutocomplete } from '../composables/notepad/useAutocomplete.js'
import { useTextInsertion } from '../composables/notepad/useTextInsertion.js'
import { ChevronDown, ChevronRight, Copy } from '@lucide/vue'
import AutocompleteMenu from './notepad/AutocompleteMenu.vue'
import NotepadHelperBar from './notepad/NotepadHelperBar.vue'
import NotepadStatusBar from './notepad/NotepadStatusBar.vue'

const props = defineProps({
  tab: { type: Object, required: true },
  saveStatus: { type: String, default: 'saved' }, // 'saved' | 'saving' | 'error'
  disableFloat: { type: Boolean, default: false },
  showSidebar: { type: Boolean, default: true }
})

const emit = defineEmits(['update:content', 'toggle-sidebar', 'variables-updated'])

const inputRef = ref(null)
const gutterRef = ref(null)
const backdropRef = ref(null)
const resultsRef = ref(null)
const hoveredLineIndex = ref(null)
const isEditorFocused = ref(false)
const cursorPosition = ref(0)

// --- Evaluation ---

const evaluation = computed(() => evaluateAll(props.tab?.content || '', { disableFloat: props.disableFloat }))
const formattedTotal = computed(() => evaluation.value.sumText)

// --- Folding, undo and the text shown in the textarea ---

const {
  collapsedSections,
  visibleLines,
  collapsedLineIndices,
  hasCollapsedSections,
  toggleSectionCollapse,
  unfoldAll
} = useSectionFolding(
  () => props.tab?.content,
  () => evaluation.value.sections
)

const history = useUndoHistory((content) => emit('update:content', content))

// What the textarea edits: the document, or its folded projection (read-only)
const tabContent = computed({
  get: () => visibleLines.value.map((item) => item.lineText).join('\n'),
  set: (val) => {
    // The folded view is a shortened display projection, not the document itself.
    // Editing it would otherwise save that projection and drop the hidden lines.
    if (hasCollapsedSections.value) return
    emit('update:content', val)
    history.recordSoon(val)
  }
})

// --- Rendering only the rows in view ---

const highlightedLines = computed(() => highlightDocument(tabContent.value || ''))
const { scrollTopPx, windowRows, windowSpacers } = useRowWindow({
  inputRef,
  visibleLines,
  highlightedLines,
  rowDetails: (item) => getRowDetails(item, evaluation.value.rendered)
})

// --- Variables declared in the document (sidebar list, autocomplete) ---

const declaredVariablesList = computed(() => {
  const variables = new Map()
  // Use the full document: line indexes must match evaluation.rendered even when sections are folded
  ;(props.tab?.content || '').split('\n').forEach((line, idx) => {
    const match = line.trim().match(ASSIGNMENT_RE)
    if (!match || ['prev', 'total', 'pi', 'e'].includes(match[1])) return
    const res = evaluation.value.rendered[idx]
    const valueText = res && (res.cls === 'num' || res.cls === 'date') && res.text ? res.text : ''
    variables.set(match[1], valueText)
  })
  return [...variables].map(([name, value]) => ({ name, value: value || '0' }))
})

watch(declaredVariablesList, (list) => emit('variables-updated', list), { immediate: true })

// --- Editing helpers ---

const { insertInlineSymbol, insertTabIndent, insertTextAtCursor } = useTextInsertion({
  inputRef,
  text: tabContent,
  recordHistory: history.record
})

const {
  showAutocomplete,
  autocompleteSuggestions,
  autocompleteIndex,
  autocompleteStyle,
  updateCursorState,
  repositionAutocomplete,
  applyAutocomplete,
  handleAutocompleteKey
} = useAutocomplete({
  inputRef,
  text: tabContent,
  cursorPosition,
  variables: declaredVariablesList,
  recordHistory: history.record
})

function handleKeyDown(e) {
  if (hasCommandModifier(e)) {
    const key = e.key.toLowerCase()
    // Ctrl+Z undo; Ctrl+Shift+Z or Ctrl+Y redo
    if (key === 'z' || key === 'y') {
      e.preventDefault()
      if (key === 'z' && !e.shiftKey) history.undo()
      else history.redo()
      return
    }
  }
  if (handleAutocompleteKey(e)) return
  if (e.key === 'Tab') {
    e.preventDefault()
    insertTabIndent()
  }
}

function focusEditor() {
  nextTick(() => inputRef.value?.focus())
}

function handleUndo() {
  history.undo()
  focusEditor()
}

function handleRedo() {
  history.redo()
  focusEditor()
}

// --- Line references: highlight what a line reads, insert #N, jump to a line ---

const { refTargets, flashLineIndex, flashLine, caretLineIndex } = useLineReferences({
  evaluation,
  visibleLines,
  text: tabContent,
  cursorPosition,
  isEditorFocused,
  hoveredLineIndex
})

function insertReference(lineIdx) {
  if (hasCollapsedSections.value) return
  const pos = inputRef.value ? inputRef.value.selectionStart || 0 : tabContent.value.length
  const before = tabContent.value.slice(0, pos)
  const needsSpace = before.length > 0 && !/[\s(]$/.test(before)
  insertInlineSymbol(`${needsSpace ? ' ' : ''}#${lineIdx + 1}`)
}

// Moves the cursor to a line, scrolls it into view and briefly highlights it
function goToLine(lineIdx) {
  const textarea = inputRef.value
  if (!textarea) return
  if (collapsedLineIndices.value.has(lineIdx)) unfoldAll()

  const lines = (props.tab?.content || '').split('\n')
  const idx = Math.max(0, Math.min(lineIdx, lines.length - 1))
  const lineEnd = lines.slice(0, idx).reduce((sum, line) => sum + line.length + 1, 0) + lines[idx].length

  nextTick(() => {
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(lineEnd, lineEnd)
    cursorPosition.value = lineEnd
    const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 26
    textarea.scrollTop = Math.max(0, idx * lineHeight - textarea.clientHeight / 3)
    syncScroll()
    flashLine(idx)
  })
}

// --- Screen reader announcement of the current line's result ---

function describeLine(lineIdx) {
  const res = evaluation.value.rendered[lineIdx]
  if (!res) return ''
  const line = `Line ${lineIdx + 1}`
  if (res.cls === 'section-header') {
    const sec = evaluation.value.sections.find((s) => s.headerIdx === lineIdx)
    return `${line}: section ${res.text}${sec ? `, subtotal ${sec.subtotalText}` : ''}`
  }
  if (res.cls === 'err') return `${line}: error, ${res.error || 'could not calculate'}`
  if (res.cls === 'pending') return `${line}: ${res.error || 'loading'}`
  if (res.cls === 'empty' || res.cls === 'comment' || !res.text) return ''
  return `${line}: ${res.text}`
}

const lineAnnouncement = ref('')
let announceTimer = null

// Announce after the cursor settles or typing pauses, not on every keystroke
watch(
  () => (caretLineIndex.value === null ? '' : describeLine(caretLineIndex.value)),
  (text) => {
    clearTimeout(announceTimer)
    announceTimer = setTimeout(() => {
      lineAnnouncement.value = text
    }, 600)
  }
)

// --- Copying results ---

const copiedIndex = ref(null)
let copyTimer = null

async function copyResult(res, idx) {
  if (!res.text || res.cls === 'empty' || res.cls === 'comment' || res.cls === 'err') return
  await copyText(res.text)
  copiedIndex.value = idx
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copiedIndex.value = null
  }, 1000)
}

function onResultClick(event, lineIdx) {
  if (event.altKey) insertReference(lineIdx)
  else copyResult(evaluation.value.rendered[lineIdx], lineIdx)
}

// --- Scroll sync between the textarea, highlight layer, gutter and results ---

let isSyncingInput = false
let isSyncingResults = false

function syncScroll() {
  if (inputRef.value) scrollTopPx.value = inputRef.value.scrollTop
  if (!inputRef.value || isSyncingInput) return
  isSyncingResults = true
  const { scrollTop, scrollLeft } = inputRef.value
  if (backdropRef.value) {
    backdropRef.value.scrollTop = scrollTop
    backdropRef.value.scrollLeft = scrollLeft
  }
  if (gutterRef.value) gutterRef.value.scrollTop = scrollTop
  if (resultsRef.value) resultsRef.value.scrollTop = scrollTop
  repositionAutocomplete()
  requestAnimationFrame(() => {
    isSyncingResults = false
  })
}

function syncScrollFromResults() {
  if (resultsRef.value) scrollTopPx.value = resultsRef.value.scrollTop
  if (!resultsRef.value || isSyncingResults) return
  isSyncingInput = true
  const { scrollTop } = resultsRef.value
  if (inputRef.value) inputRef.value.scrollTop = scrollTop
  if (backdropRef.value) backdropRef.value.scrollTop = scrollTop
  if (gutterRef.value) gutterRef.value.scrollTop = scrollTop
  requestAnimationFrame(() => {
    isSyncingInput = false
  })
}

// --- Lifecycle ---

defineExpose({ insertTextAtCursor, goToLine })

onMounted(() => {
  if (typeof window !== 'undefined') window.scrollTo(0, 0)
  history.record(tabContent.value)
})

watch(
  () => props.tab?.id,
  (newId, oldId) => {
    // Folds are per document; carrying them over could lock another tab read-only
    unfoldAll()
    // The textarea keeps a scroll position per content; re-read it for the row window
    nextTick(syncScroll)
    history.switchTab(oldId, newId, tabContent.value)
  }
)
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
  background: var(--gutter-bg);
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
  color: var(--syn-keyword, #9b8afb);
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
  color: var(--syn-keyword, #9b8afb);
  padding: 0;
  cursor: pointer;
  width: 14px;
  height: 14px;
  transition:
    transform 0.15s ease,
    color 0.15s ease;
}

.btn-fold:hover {
  color: var(--paper-bright);
  transform: scale(1.15);
}

.icon-fold {
  width: 13px;
  height: 13px;
}

.row-spacer {
  flex-shrink: 0;
}

.highlighted-line {
  background: rgba(22, 217, 196, 0.05) !important;
}

/* Lines read by the line being edited or hovered (#3, a variable's line, prev) */

.is-ref-target {
  background: color-mix(in srgb, var(--syn-number) 12%, transparent) !important;
  box-shadow: inset 2px 0 0 var(--syn-number);
}

/* Brief highlight after jumping to a line from the command palette */

.line-flash {
  animation: line-flash 1.6s ease-out;
}

@keyframes line-flash {
  0%,
  40% {
    background: color-mix(in srgb, var(--accent) 22%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .line-flash {
    animation: none;
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }
}

.row-insert-ref {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  padding: 1px 5px;
  margin-left: 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  opacity: 0;
  flex-shrink: 0;
  transition: opacity 0.15s ease;
}

.r:hover .row-insert-ref,
.row-insert-ref:focus-visible {
  opacity: 0.8;
}

.row-insert-ref:hover {
  opacity: 1;
  color: var(--accent);
  border-color: var(--accent);
}

.r.section-header {
  background: linear-gradient(90deg, rgba(155, 138, 251, 0.1) 0%, rgba(155, 138, 251, 0.01) 100%) !important;
  color: var(--syn-keyword, #9b8afb) !important;
  font-weight: 600;
  border-left: 3px solid var(--syn-keyword, #9b8afb);
  text-align: left !important;
  padding-left: 8px !important;
}

.r.subtotal-line {
  font-weight: 600;
  color: var(--syn-keyword, #9b8afb) !important;
  border-top: 1px dashed var(--line-soft);
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
  color: var(--syn-comment, #54667a);
  font-style: italic;
  font-weight: 400;
  opacity: 0.9;
}

.tok-header-line {
  color: rgba(155, 138, 251, 0.4);
  font-weight: 500;
}

.tok-header-title {
  color: var(--syn-keyword, #9b8afb);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.tok-keyword {
  color: var(--syn-keyword, #9b8afb);
  font-weight: 600;
}

.tok-number {
  color: var(--syn-number, #f59e0b);
  font-weight: 500;
}

.tok-currency {
  color: var(--syn-currency, #f5b94c);
  font-weight: 500;
}

.tok-variable {
  color: var(--syn-variable, #16d9c4);
  font-weight: 500;
}

.tok-unit {
  color: var(--syn-unit, #7d8f9f);
}

.tok-op {
  color: var(--muted, #6b7f96);
  font-weight: 500;
}

.tok-code {
  color: var(--paper, #c9d6e5);
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

/* Kind badge, coloured like the syntax highlighter */

.results {
  width: 310px;
  flex: none;
  border-left: 1px solid var(--line-soft);
  font-family: 'JetBrains Mono', monospace;
  font-size: 13.5px;
  line-height: 26px;
  padding: 16px 12px;
  overflow-y: auto;
  scrollbar-width: none;
  background: var(--results-bg);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
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
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    opacity 0.15s ease;
  border-radius: 4px;
  padding: 0 6px;
  box-sizing: border-box;
}

.r:not(.empty):not(.comment):not(.err) {
  cursor: pointer;
}

.r:not(.empty):not(.comment):not(.err):hover {
  background: var(--accent-glow);
}

.r:not(.empty):not(.comment):not(.err):hover .val-num,
.r:not(.empty):not(.comment):not(.err):hover .res-value {
  color: var(--accent-bright);
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
  transition:
    opacity 0.15s ease,
    color 0.15s ease;
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
  color: var(--muted-light);
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  text-align: left;
}

[data-theme='light'] .res-label {
  color: var(--muted);
}

.res-value {
  font-size: 13.5px;
  color: var(--result-color);
  font-weight: 600;
  white-space: nowrap;
  text-align: right;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  transition:
    color 0.15s ease,
    opacity 0.15s ease;
}

.val-num {
  color: var(--result-color);
  font-weight: 600;
}

.val-unit {
  color: var(--muted-light);
  font-size: 11.5px;
  font-weight: 500;
  margin-left: 4px;
}

.negative-val .res-value,
.negative-val .val-num {
  color: var(--err, #e55353) !important;
}

/* Subtotal Row */

.subtotal-row {
  border-top: 1px dashed var(--line);
}

.subtotal-label {
  color: var(--syn-keyword) !important;
  font-weight: 600;
  text-transform: lowercase;
}

.subtotal-value {
  color: var(--result-color) !important;
  font-weight: 700;
}

/* Section Header in Results */

.res-section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  width: 100%;
  color: var(--syn-keyword);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  letter-spacing: 0.02em;
  user-select: none;
  padding-bottom: 2px;
}

.sec-toggle-icon {
  font-size: 11px;
  color: var(--syn-keyword);
  width: 12px;
  display: inline-block;
  text-align: center;
}

.sec-title-text {
  color: var(--syn-keyword);
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

.res-note {
  color: var(--amber);
  font-weight: 700;
  margin-left: 2px;
}

.err-reason {
  color: var(--err);
  opacity: 0.85;
  font-style: italic;
}

/* Waiting for historical exchange rates */

.r.pending .res-value {
  color: var(--muted);
  animation: pending-pulse 1.2s ease-in-out infinite;
}

@keyframes pending-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .r.pending .res-value {
    animation: none;
  }
}

.err-val {
  color: var(--err, #e55353);
  font-size: 12px;
  opacity: 0.85;
}

.copied-badge {
  font-size: 11.5px;
  color: var(--result-color);
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

  .row-hover-copy,
  .row-insert-ref {
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

/* Mobile Variables Modal */
</style>
