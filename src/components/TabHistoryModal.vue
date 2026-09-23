<template>
  <div v-if="isOpen" class="history-overlay" @click.self="$emit('close')">
    <div
      ref="dialogRef"
      class="history-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      tabindex="-1"
    >
      <header class="history-header">
        <div class="history-title-block">
          <History class="icon-accent" aria-hidden="true" />
          <div>
            <h3 id="history-title">Version history</h3>
            <p class="history-subtitle">{{ tab?.title || 'Untitled' }} · saved on this device</p>
          </div>
        </div>
        <button class="btn-close" aria-label="Close version history" @click="$emit('close')">
          <X class="icon-sm" />
        </button>
      </header>

      <div v-if="loading" class="history-empty">Loading versions…</div>

      <div v-else-if="versions.length === 0" class="history-empty">
        <p><b>No earlier versions yet.</b></p>
        <p>
          A version is saved when you start editing this tab (at most every 5 minutes while you keep typing), and before
          it is cleared, restored, replaced by an import or updated by cloud sync.
        </p>
      </div>

      <div v-else class="history-body">
        <ol class="version-list" aria-label="Saved versions, newest first">
          <li v-for="version in versionsWithStats" :key="version.id">
            <button
              class="version-item"
              :class="{ selected: version.id === selectedId }"
              :aria-current="version.id === selectedId ? 'true' : undefined"
              @click="selectedId = version.id"
            >
              <span class="version-time" :title="formatExact(version.createdAt)">
                {{ formatRelative(version.createdAt) }}
              </span>
              <span class="version-reason">{{ version.reason }}</span>
              <span class="version-stats">
                <span
                  v-if="version.stats.added"
                  class="stat-add"
                  :title="`${version.stats.added} lines not in the current text`"
                >
                  +{{ version.stats.added }}
                </span>
                <span
                  v-if="version.stats.removed"
                  class="stat-remove"
                  :title="`${version.stats.removed} current lines not in this version`"
                >
                  −{{ version.stats.removed }}
                </span>
                <span v-if="!version.stats.added && !version.stats.removed" class="stat-same">same lines</span>
              </span>
            </button>
          </li>
        </ol>

        <section v-if="selected" class="version-preview" aria-label="Selected version">
          <div class="preview-scroll">
            <table class="preview-table">
              <tbody>
                <tr v-for="(line, idx) in selectedLines" :key="idx">
                  <td class="p-num">{{ idx + 1 }}</td>
                  <td class="p-code">{{ line || ' ' }}</td>
                  <td class="p-result">{{ resultText(idx) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="preview-actions">
            <span class="preview-meta">{{ formatExact(selected.createdAt) }} · {{ selectedLines.length }} lines</span>
            <button class="btn-secondary" @click="copyVersion">
              <Copy class="icon-xs" aria-hidden="true" />
              Copy text
            </button>
            <button class="btn-primary" @click="$emit('restore', selected)">
              <RotateCcw class="icon-xs" aria-hidden="true" />
              Restore this version
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { History, X, Copy, RotateCcw } from '@lucide/vue'
import { evaluateAll } from '../services/evaluator.js'
import { getTabVersions, diffStats } from '../services/versionService.js'
import { useModalA11y } from '../composables/useModalA11y.js'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  tab: { type: Object, default: null },
  disableFloat: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'restore', 'toast'])

const dialogRef = ref(null)
const versions = ref([])
const selectedId = ref(null)
const loading = ref(false)

useModalA11y(
  () => props.isOpen,
  dialogRef,
  () => emit('close')
)

async function loadVersions() {
  if (!props.tab?.id) return
  loading.value = true
  try {
    versions.value = await getTabVersions(props.tab.id)
    selectedId.value = versions.value[0]?.id || null
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.isOpen, props.tab?.id],
  ([open]) => {
    if (open) loadVersions()
  },
  { immediate: true }
)

// Compared with the tab's current text
const versionsWithStats = computed(() =>
  versions.value.map((v) => ({ ...v, stats: diffStats(props.tab?.content || '', v.content) }))
)

const selected = computed(() => versions.value.find((v) => v.id === selectedId.value) || null)
const selectedLines = computed(() => (selected.value?.content || '').split('\n'))
const selectedEvaluation = computed(() =>
  selected.value ? evaluateAll(selected.value.content, { disableFloat: props.disableFloat }) : null
)

function resultText(idx) {
  const res = selectedEvaluation.value?.rendered[idx]
  if (!res || ['empty', 'comment', 'section-header'].includes(res.cls)) return ''
  return res.text || ''
}

function formatExact(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatRelative(iso) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

async function copyVersion() {
  try {
    await navigator.clipboard.writeText(selected.value?.content || '')
    emit('toast', 'Version text copied')
  } catch (e) {
    emit('toast', 'Could not copy: clipboard access was blocked')
  }
}
</script>

<style scoped>
.history-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(4, 8, 14, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
}

.history-card {
  width: 100%;
  max-width: 920px;
  height: min(640px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--line-soft);
}

.history-title-block {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.history-title-block h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--paper-bright);
}

.history-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.icon-accent {
  width: 18px;
  height: 18px;
  color: var(--accent);
  flex-shrink: 0;
}

.icon-sm {
  width: 15px;
  height: 15px;
}

.icon-xs {
  width: 13px;
  height: 13px;
}

.btn-close {
  color: var(--muted);
  padding: 4px;
  border-radius: 6px;
}

.btn-close:hover {
  color: var(--paper-bright);
  background: var(--item-bg);
}

.history-empty {
  padding: 32px 24px;
  max-width: 60ch;
  color: var(--muted-light);
  font-size: 13.5px;
  line-height: 1.6;
}

.history-empty p {
  margin: 0 0 8px;
}

.history-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px 1fr;
}

.version-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  border-right: 1px solid var(--line-soft);
}

.version-item {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 8px;
  text-align: left;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  color: var(--paper);
}

.version-item:hover {
  background: var(--item-bg);
}

.version-item.selected {
  background: var(--accent-dim);
  color: var(--paper-bright);
}

.version-time {
  font-weight: 600;
  font-size: 13px;
}

.version-reason {
  grid-column: 1;
  font-size: 11.5px;
  color: var(--muted);
}

.version-stats {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  display: flex;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.stat-add {
  color: var(--accent);
}

.stat-remove {
  color: var(--err);
}

.stat-same {
  color: var(--muted);
  font-family: inherit;
}

.version-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.preview-scroll {
  flex: 1;
  overflow: auto;
  background: var(--editor-bg);
}

.preview-table {
  border-collapse: collapse;
  width: 100%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
  line-height: 1.7;
}

.preview-table td {
  padding: 0 10px;
  vertical-align: top;
  white-space: pre;
}

.p-num {
  width: 1%;
  text-align: right;
  color: var(--muted);
  background: var(--gutter-bg);
  font-variant-numeric: tabular-nums;
}

.p-code {
  color: var(--paper);
}

.p-result {
  text-align: right;
  color: var(--result-color);
  font-variant-numeric: tabular-nums;
}

.preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--line-soft);
}

.preview-meta {
  margin-right: auto;
  font-size: 12px;
  color: var(--muted);
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 8px;
}

.btn-primary {
  background: var(--accent);
  color: var(--on-accent);
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--item-bg);
  color: var(--paper);
  border: 1px solid var(--line);
}

.btn-secondary:hover {
  border-color: var(--line-hover);
  color: var(--paper-bright);
}

@media (max-width: 700px) {
  .history-body {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(0, 40%) minmax(0, 1fr);
  }

  .version-list {
    border-right: none;
    border-bottom: 1px solid var(--line-soft);
  }
}
</style>
