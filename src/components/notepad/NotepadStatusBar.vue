<template>
  <footer class="status-bar">
    <div class="status-left">
      <span
        >lines: <b>{{ lineCount }}</b></span
      >
      <span class="sep">•</span>
      <span
        >total: <b class="total-val" title="Click to copy total" @click="copyTotal">{{ totalText }}</b></span
      >
      <span v-if="copiedTotal" class="copied-mini">Copied!</span>
    </div>

    <div class="status-center desktop-only">
      <span>direct lines: <b>#1, L1, line1</b></span>
      <span class="sep">•</span>
      <span :title="ratesTitle"
        >rates: <b>{{ ratesAgeText }}</b></span
      >
    </div>

    <div class="status-right">
      <button
        class="btn-expand-area desktop-only"
        :class="{ expanded: !showSidebar }"
        :title="showSidebar ? 'Expand calculation area (hide right sidebar)' : 'Show right sidebar'"
        @click="$emit('toggle-sidebar')"
      >
        <Maximize2 v-if="showSidebar" class="icon-xs" />
        <Minimize2 v-else class="icon-xs" />
        <span>{{ showSidebar ? 'Expand Area' : 'Show Sidebar' }}</span>
      </button>

      <div class="sync-badge" :class="saveStateClass">
        <HardDrive v-if="saveStatus === 'saved'" class="sync-icon" />
        <Loader2 v-else-if="saveStatus === 'saving'" class="sync-icon spin" />
        <AlertCircle v-else class="sync-icon err" />
        <span>{{ saveStatusText }}</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { HardDrive, Loader2, AlertCircle, Maximize2, Minimize2 } from '@lucide/vue'
import { copyText } from '../../utils/clipboard.js'
import { useRatesAge } from '../../composables/useRatesAge.js'

const props = defineProps({
  lineCount: { type: Number, default: 0 },
  totalText: { type: String, default: '' },
  showSidebar: { type: Boolean, default: true },
  saveStatus: { type: String, default: 'saved' } // 'saved' | 'saving' | 'error'
})

defineEmits(['toggle-sidebar'])

const { ratesAgeText, ratesTitle } = useRatesAge()

const saveStateClass = computed(() => (['saving', 'error'].includes(props.saveStatus) ? props.saveStatus : 'saved'))
const saveStatusText = computed(() => ({ saving: 'Saving...', error: 'Save error' })[props.saveStatus] || 'Saved')

const copiedTotal = ref(false)
let copiedTimer = null

async function copyTotal() {
  if (!props.totalText) return
  await copyText(props.totalText)
  copiedTotal.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copiedTotal.value = false
  }, 1000)
}
</script>

<style scoped>
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

.btn-expand-area:hover,
.btn-expand-area.expanded {
  color: var(--accent);
  border-color: rgba(22, 217, 196, 0.25);
  background: rgba(22, 217, 196, 0.08);
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
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 600px) {
  .desktop-only {
    display: none;
  }

  .status-bar {
    padding: 8px 12px;
    font-size: 11.5px;
  }
}
</style>
