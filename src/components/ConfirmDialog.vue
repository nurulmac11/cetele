<template>
  <div v-if="confirmState.open" class="confirm-overlay" @click.self="settleConfirm(false)">
    <div
      ref="dialogRef"
      class="confirm-card"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      tabindex="-1"
    >
      <div class="confirm-header">
        <AlertTriangle v-if="confirmState.danger" class="icon-warn" aria-hidden="true" />
        <h3 id="confirm-title">{{ confirmState.title }}</h3>
      </div>
      <div id="confirm-message" class="confirm-body">
        <p v-if="confirmState.message">{{ confirmState.message }}</p>
        <ul v-if="confirmState.details.length" class="confirm-details">
          <li v-for="(item, idx) in confirmState.details" :key="idx">{{ item }}</li>
        </ul>
      </div>
      <div class="confirm-actions">
        <!-- Cancel gets focus first, so Enter never triggers a destructive action by accident -->
        <button class="btn-cancel" autofocus @click="settleConfirm(false)">{{ confirmState.cancelLabel }}</button>
        <button :class="confirmState.danger ? 'btn-confirm-danger' : 'btn-confirm'" @click="settleConfirm(true)">
          {{ confirmState.confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { AlertTriangle } from '@lucide/vue'
import { confirmState, settleConfirm } from '../services/confirmService.js'
import { useModalA11y } from '../composables/useModalA11y.js'

const dialogRef = ref(null)
useModalA11y(() => confirmState.open, dialogRef, () => settleConfirm(false))
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(4, 8, 14, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-card {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
}
.confirm-card:focus {
  outline: none;
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--card-bg);
}
.confirm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--paper-bright);
}
.icon-warn {
  width: 18px;
  height: 18px;
  color: var(--err);
  flex-shrink: 0;
}

.confirm-body {
  padding: 18px 20px 4px;
  color: var(--paper);
  font-size: 13.5px;
  line-height: 1.55;
}
.confirm-body p {
  margin: 0 0 12px;
}
.confirm-details {
  margin: 0 0 12px;
  padding: 10px 12px 10px 28px;
  max-height: 160px;
  overflow-y: auto;
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-sm);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px 18px;
}
.confirm-actions button {
  font-size: 13px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.15s;
}
.confirm-actions button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn-cancel {
  background: var(--item-bg);
  color: var(--paper);
  border: 1px solid var(--line);
}
.btn-cancel:hover {
  border-color: var(--line-hover);
  color: var(--paper-bright);
}
.btn-confirm {
  background: var(--accent);
  color: var(--on-accent);
}
.btn-confirm:hover {
  background: var(--accent-hover);
}
.btn-confirm-danger {
  background: rgba(229, 83, 83, 0.12);
  color: var(--err);
  border: 1px solid rgba(229, 83, 83, 0.35);
}
.btn-confirm-danger:hover {
  background: rgba(229, 83, 83, 0.2);
}
</style>
