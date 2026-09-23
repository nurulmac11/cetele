<template>
  <div class="saved-page">
    <div class="saved-container">
      <header class="saved-header">
        <div class="header-title-block">
          <div class="brand-badge">
            <Bookmark class="icon" />
          </div>
          <div>
            <h1>Saved Tabs Library</h1>
            <p>Manage and reload your saved calculation documents into active workspace tabs.</p>
          </div>
        </div>
        <button class="btn-back" @click="$emit('switch-to-notepad')">
          <ArrowLeft class="icon-sm" /> Back to Calculator
        </button>
      </header>

      <!-- Search & Filters Bar -->
      <div class="filter-bar">
        <div class="search-wrap">
          <Search class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Search saved tabs by title or content..."
          />
          <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
            <X class="icon-xs" />
          </button>
        </div>

        <div class="count-badge">
          <b>{{ filteredLibrary.length }}</b> saved document{{ filteredLibrary.length === 1 ? '' : 's' }}
        </div>
      </div>

      <!-- Library Grid -->
      <div class="saved-body">
        <div v-if="filteredLibrary.length === 0" class="empty-state">
          <Bookmark class="empty-icon" />
          <h3>No Saved Tabs Found</h3>
          <p v-if="searchQuery">No saved tabs match your search query "{{ searchQuery }}".</p>
          <p v-else>You haven't saved any tabs to your library yet. Click <b>Save to Library</b> in the top header while working on a tab to save it here!</p>
          <button class="btn-primary" @click="$emit('switch-to-notepad')">
            Go to Calculator Workspace
          </button>
        </div>

        <div v-else class="cards-grid">
          <div
            v-for="item in filteredLibrary"
            :key="item.id"
            class="library-card"
          >
            <div class="card-header">
              <div class="card-title-wrap">
                <FileText class="icon-sm card-icon" />
                <h3 class="card-title">{{ item.title }}</h3>
              </div>
              <span class="badge-lines">{{ item.lineCount || getLineCount(item.content) }} lines</span>
            </div>

            <div class="card-meta">
              Saved on {{ formatDate(item.savedAt) }}
            </div>

            <pre class="code-preview" @click="openPreview(item)" title="Preview this document">{{ getPreviewText(item.content) }}</pre>

            <div class="card-actions">
              <button
                class="btn-action primary"
                @click="$emit('load-as-tab', item)"
                title="Open and reload this document as an active tab"
              >
                <ExternalLink class="icon-xs" /> Open as Tab
              </button>

              <button
                class="btn-action"
                @click="openPreview(item)"
                title="Preview this document with results without opening it as a tab"
              >
                <Eye class="icon-xs" /> Preview
              </button>

              <button
                class="btn-action"
                @click="copyContent(item.content)"
                title="Copy full text to clipboard"
              >
                <Copy class="icon-xs" /> Copy
              </button>

              <button
                class="btn-action danger"
                @click="confirmDelete(item.id, item.title)"
                title="Delete this saved tab"
              >
                <Trash2 class="icon-xs" /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Read-only Preview Modal -->
    <div v-if="previewItem" class="preview-backdrop" @click.self="closePreview">
      <div class="preview-card" role="dialog" aria-modal="true" :aria-label="`Preview of ${previewItem.title}`">
        <header class="preview-header">
          <div class="card-title-wrap">
            <FileText class="icon-sm card-icon" />
            <div class="preview-title-block">
              <h3 class="preview-title">{{ previewItem.title }}</h3>
              <span class="card-meta">
                Saved on {{ formatDate(previewItem.savedAt) }} · {{ previewLines.length }} lines · Read-only preview
              </span>
            </div>
          </div>
          <button class="btn-close" @click="closePreview" title="Close preview (Esc)">
            <X class="icon-sm" />
          </button>
        </header>

        <div class="preview-body">
          <div
            v-for="(line, idx) in previewLines"
            :key="idx"
            class="preview-row"
            :class="previewRendered[idx]?.cls"
          >
            <span class="preview-ln">{{ idx + 1 }}</span>
            <span class="preview-src">{{ line || ' ' }}</span>
            <span class="preview-res">{{ getResultText(previewRendered[idx]) }}</span>
          </div>
        </div>

        <footer class="preview-footer">
          <div class="preview-total">
            Total: <b>{{ previewTotal }}</b>
          </div>
          <div class="card-actions">
            <button class="btn-action" @click="copyContent(previewItem.content)" title="Copy full text to clipboard">
              <Copy class="icon-xs" /> Copy
            </button>
            <button class="btn-action primary" @click="loadFromPreview" title="Open and reload this document as an active tab">
              <ExternalLink class="icon-xs" /> Open as Tab
            </button>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Bookmark, ArrowLeft, Search, X, FileText, ExternalLink, Copy, Trash2, Eye } from '@lucide/vue'
import { evaluateAll } from '../services/evaluator.js'

const props = defineProps({
  library: { type: Array, default: () => [] },
  disableFloat: { type: Boolean, default: false }
})

const emit = defineEmits(['switch-to-notepad', 'load-as-tab', 'delete-saved-tab', 'toast'])

const searchQuery = ref('')

const filteredLibrary = computed(() => {
  if (!searchQuery.value.trim()) return props.library
  const q = searchQuery.value.toLowerCase()
  return props.library.filter((item) =>
    item.title.toLowerCase().includes(q) ||
    (item.content || '').toLowerCase().includes(q)
  )
})

const previewItem = ref(null)

const previewLines = computed(() => (previewItem.value?.content || '').split('\n'))

const previewEvaluation = computed(() => {
  if (!previewItem.value) return null
  return evaluateAll(previewItem.value.content || '', { disableFloat: props.disableFloat })
})

const previewRendered = computed(() => previewEvaluation.value?.rendered || [])

const previewTotal = computed(() => {
  if (!previewEvaluation.value) return ''
  return previewEvaluation.value.sumText
})

function getResultText(res) {
  if (!res || res.cls === 'empty' || res.cls === 'comment' || res.cls === 'section-header') return ''
  return res.text || ''
}

function openPreview(item) {
  previewItem.value = item
}

function closePreview() {
  previewItem.value = null
}

function loadFromPreview() {
  const item = previewItem.value
  closePreview()
  if (item) emit('load-as-tab', item)
}

function handleKeydown(e) {
  if (e.key === 'Escape' && previewItem.value) closePreview()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

function getLineCount(content) {
  return (content || '').split('\n').length
}

function getPreviewText(content) {
  if (!content) return '// Empty document'
  const lines = content.split('\n').slice(0, 5)
  return lines.join('\n') + (content.split('\n').length > 5 ? '\n...' : '')
}

function formatDate(isoStr) {
  if (!isoStr) return 'Recently'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return 'Recently'
  }
}

function copyContent(text) {
  navigator.clipboard.writeText(text || '').then(() => {
    emit('toast', 'Content copied to clipboard')
  }).catch(() => {
    emit('toast', 'Could not copy: clipboard access was blocked')
  })
}

function confirmDelete(id, title) {
  if (confirm(`Are you sure you want to delete "${title}" from your saved library?`)) {
    emit('delete-saved-tab', id)
  }
}
</script>

<style scoped>
.saved-page {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 24px;
}

.saved-container {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.saved-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--card-bg);
}

.header-title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(22, 217, 196, 0.12);
  color: var(--accent);
  border: 1px solid rgba(22, 217, 196, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title-block h1 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 2px;
  color: var(--paper-bright);
}

.header-title-block p {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--accent);
  background: rgba(22, 217, 196, 0.08);
  border: 1px solid rgba(22, 217, 196, 0.25);
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.15s;
}
.btn-back:hover {
  background: rgba(22, 217, 196, 0.15);
  color: var(--accent-hover);
}

.filter-bar {
  padding: 16px 24px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--panel-solid);
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 420px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 15px;
  height: 15px;
  color: var(--muted);
}

.search-input {
  width: 100%;
  background: var(--item-bg);
  border: 1px solid var(--line);
  color: var(--paper);
  padding: 8px 14px 8px 36px;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
}

.btn-clear-search {
  position: absolute;
  right: 12px;
  color: var(--muted);
  padding: 2px;
}

.count-badge {
  font-size: 12.5px;
  color: var(--muted);
}

.count-badge b {
  color: var(--paper-bright);
}

.saved-body {
  padding: 24px;
  min-height: 480px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  max-width: 480px;
  margin: 0 auto;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--muted);
  margin-bottom: 12px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--paper);
}

.empty-state p {
  margin: 0 0 20px;
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.5;
}

.btn-primary {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
  font-size: 13px;
  padding: 9px 18px;
  border-radius: 8px;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(22, 217, 196, 0.2);
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 6px 16px rgba(22, 217, 196, 0.3);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.library-card {
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.15s ease;
}

.library-card:hover {
  border-color: rgba(22, 217, 196, 0.3);
  box-shadow: var(--shadow-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon {
  color: var(--accent);
}

.card-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--paper-bright);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.badge-lines {
  font-size: 11px;
  background: var(--item-bg);
  color: var(--muted);
  border: 1px solid var(--line-soft);
  padding: 2px 7px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.card-meta {
  font-size: 11.5px;
  color: var(--muted);
}

.code-preview {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--paper);
  background: var(--editor-bg);
  border: 1px solid var(--line-soft);
  border-radius: 6px;
  padding: 10px;
  max-height: 100px;
  overflow: hidden;
  cursor: pointer;
  white-space: pre-wrap;
  line-height: 1.45;
}

.code-preview:hover {
  border-color: rgba(22, 217, 196, 0.3);
  color: var(--accent);
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--muted);
  background: var(--item-bg);
  border: 1px solid var(--line);
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.btn-action:hover {
  color: var(--paper);
  border-color: var(--line-hover);
}

.btn-action.primary {
  color: var(--accent);
  background: rgba(22, 217, 196, 0.08);
  border-color: rgba(22, 217, 196, 0.25);
  font-weight: 600;
}
.btn-action.primary:hover {
  color: var(--on-accent);
  background: var(--accent);
}

.btn-action.danger:hover {
  color: var(--err);
  border-color: rgba(229, 83, 83, 0.25);
  background: rgba(229, 83, 83, 0.1);
}

/* Preview Modal */
.preview-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 14, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.preview-card {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 760px;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--card-bg);
}

.preview-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--paper-bright);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-close {
  color: var(--muted);
  padding: 6px;
  border-radius: 6px;
  display: inline-flex;
}
.btn-close:hover {
  color: var(--paper);
  background: var(--item-bg);
}

.preview-body {
  flex: 1;
  overflow: auto;
  background: var(--editor-bg);
  padding: 10px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.preview-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 12px;
  padding: 0 16px 0 0;
}
.preview-row:hover {
  background: var(--item-bg);
}

.preview-ln {
  text-align: right;
  color: var(--muted);
  opacity: 0.6;
  user-select: none;
}

.preview-src {
  color: var(--paper);
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-res {
  color: var(--accent);
  text-align: right;
  white-space: nowrap;
  font-weight: 500;
}

.preview-row.comment .preview-src {
  color: var(--muted);
  font-style: italic;
}

.preview-row.section-header .preview-src {
  color: var(--paper-bright);
  font-weight: 700;
}

.preview-row.subtotal-line .preview-res {
  font-weight: 700;
}

.preview-row.err .preview-res {
  color: var(--err);
  font-weight: 400;
}

.preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--line-soft);
  background: var(--card-bg);
  flex-wrap: wrap;
}

.preview-footer .card-actions {
  margin-top: 0;
}

.preview-total {
  font-size: 13px;
  color: var(--muted);
}
.preview-total b {
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
}

@media (max-width: 600px) {
  .preview-backdrop { padding: 0; }
  .preview-card { max-height: 100vh; height: 100%; border-radius: 0; }
  .preview-row { grid-template-columns: 28px minmax(0, 1fr) auto; gap: 8px; }
}

.icon-sm { width: 15px; height: 15px; }
.icon-xs { width: 12px; height: 12px; }
.icon { width: 20px; height: 20px; }
</style>
