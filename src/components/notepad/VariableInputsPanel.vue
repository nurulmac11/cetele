<template>
  <div class="inputs-panel" :style="panelStyle" role="dialog" :aria-label="`What ${panel.name} is calculated from`">
    <div class="ip-header">
      <span class="ip-name">{{ panel.name }}</span>
      <span class="ip-eq">=</span>
      <span class="ip-val" :class="{ 'ip-err': panel.isError }">{{ panel.valueText || '—' }}</span>
      <button
        class="ip-line"
        :title="`Go to line ${panel.lineIdx + 1}`"
        @mousedown.prevent="$emit('go', panel.lineIdx)"
      >
        line {{ panel.lineIdx + 1 }}
      </button>
    </div>
    <div class="ip-caption">
      {{ panel.rows.length ? 'Calculated from' : 'Not calculated from other lines' }}
    </div>
    <ul v-if="panel.rows.length" class="ip-list">
      <li
        v-for="(row, idx) in panel.rows"
        :key="idx"
        class="ip-item"
        :class="{ repeated: row.repeated }"
        :style="{ paddingLeft: `${10 + row.depth * 14}px` }"
        :title="`Go to line ${row.lineIdx + 1}${row.repeated ? ' · its inputs are listed above' : ''}`"
        @mousedown.prevent="$emit('go', row.lineIdx)"
      >
        <span v-if="row.depth" class="ip-branch" aria-hidden="true">└</span>
        <span class="ip-label">{{ row.label }}</span>
        <span v-if="row.detail" class="ip-detail">{{ row.detail }}</span>
        <span class="ip-row-val" :class="{ 'ip-err': row.isError }">{{ row.valueText || '—' }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
// Shown after clicking a variable in the editor (see composables/notepad/useVariableInputs.js)
defineProps({
  panel: { type: Object, required: true },
  panelStyle: { type: Object, default: () => ({}) }
})

defineEmits(['go'])
</script>

<style scoped>
.inputs-panel {
  position: absolute;
  z-index: 100;
  background: var(--panel-solid);
  border: 1px solid var(--line-hover);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  width: 300px;
  max-width: calc(100vw - 32px);
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12.5px;
}

.ip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--line-soft);
}

.ip-name,
.ip-label {
  font-weight: 600;
  color: var(--var-color);
  flex-shrink: 0;
}

.ip-eq {
  color: var(--muted);
}

.ip-val {
  color: var(--paper-bright);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ip-line {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 10.5px;
  color: var(--muted);
  padding: 0;
}

.ip-line:hover {
  color: var(--accent);
}

.ip-caption {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  padding: 6px 8px 2px;
  font-weight: 700;
  font-family: inherit;
}

.ip-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--paper);
  transition: all 0.1s ease;
}

.ip-item:hover {
  background: rgba(22, 217, 196, 0.1);
}

.ip-item.repeated {
  opacity: 0.6;
}

.ip-branch {
  color: var(--muted);
  flex-shrink: 0;
}

.ip-detail {
  font-size: 11.5px;
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ip-row-val {
  margin-left: auto;
  padding-left: 8px;
  font-size: 11.5px;
  color: var(--muted-light);
  flex-shrink: 0;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ip-err {
  color: var(--err);
}
</style>
