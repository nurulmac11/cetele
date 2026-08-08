<template>
  <div v-if="isOpen" class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-header">
        <div class="modal-title">
          <Settings class="icon" />
          <span>Settings</span>
        </div>
        <button class="btn-close" @click="$emit('close')">
          <X class="icon" />
        </button>
      </header>

      <!-- Navigation tabs -->
      <nav class="modal-tabs">
        <button
          class="modal-tab"
          :class="{ active: activeTab === 'profile' }"
          @click="activeTab = 'profile'"
        >
          <User class="icon-sm" /> Profile & Preferences
        </button>
        <button
          class="modal-tab"
          :class="{ active: activeTab === 'data' }"
          @click="activeTab = 'data'"
        >
          <HardDrive class="icon-sm" /> Local Database & Backup
        </button>
      </nav>

      <!-- Modal Body -->
      <div class="modal-body">
        <!-- 1. Profile & Preferences -->
        <div v-if="activeTab === 'profile'" class="tab-panel">
          <div class="form-group">
            <label>Display Name</label>
            <input
              v-model="profileForm.displayName"
              type="text"
              class="form-input"
              placeholder="e.g. Alex"
            />
          </div>

          <div class="form-group">
            <label>Theme Preference</label>
            <select v-model="profileForm.theme" class="form-select">
              <option value="dark">Dark Theme (Default)</option>
              <option value="light">Clean Light Mode</option>
            </select>
          </div>

          <div class="form-group">
            <label>Default Unit System Preference</label>
            <select v-model="profileForm.defaultUnitSystem" class="form-select">
              <option value="metric">Metric (km, kg, ml, °C)</option>
              <option value="imperial">Imperial (miles, lbs, oz, °F)</option>
            </select>
          </div>

          <!-- Decimals Toggle Switch -->
          <div class="form-group switch-group">
            <div class="switch-row">
              <label for="decimalsToggle" class="switch-title">Decimals</label>
              <label class="switch">
                <input
                  id="decimalsToggle"
                  v-model="profileForm.showDecimals"
                  type="checkbox"
                />
                <span class="slider round"></span>
              </label>
            </div>
            <p class="form-hint">
              {{ profileForm.showDecimals ? 'ON: Showing decimal places (e.g. 453,330.9424)' : 'OFF: Hiding decimal places and rounding to whole numbers (e.g. 453,331)' }}
            </p>
          </div>

          <div class="account-card">
            <div class="account-header">
              <span class="badge-active">Offline / Local Mode</span>
            </div>
            <p class="account-info">
              çetele runs completely locally on your machine. Your tabs and calculations are saved securely in your browser's IndexedDB / local database.
            </p>
          </div>
        </div>

        <!-- 2. Local Database & Backup -->
        <div v-else-if="activeTab === 'data'" class="tab-panel">
          <p class="panel-desc">Export, import, or manage your local database tabs.</p>

          <div class="actions-grid">
            <div class="action-card">
              <h4>Export Backup</h4>
              <p>Download all your local tabs into a JSON backup file.</p>
              <button class="btn-secondary" @click="$emit('export-tabs')">
                <Download class="icon-sm" /> Export JSON
              </button>
            </div>

            <div class="action-card">
              <h4>Import Backup</h4>
              <p>Load tabs from a previously saved JSON file.</p>
              <label class="btn-secondary file-label">
                <Upload class="icon-sm" /> Import JSON
                <input type="file" accept=".json" class="file-input" @change="handleFileImport" />
              </label>
            </div>
          </div>

          <div class="danger-zone">
            <h4>Reset Local Database</h4>
            <p>Clear all local database tabs and restore default example tabs.</p>
            <button class="btn-danger" @click="$emit('reset-local-data')">
              <RotateCcw class="icon-sm" /> Reset Local Database
            </button>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <button class="btn-secondary" @click="$emit('close')">Cancel</button>
        <button class="btn-primary" @click="handleSaveAll">Save & Close</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Settings, X, User, HardDrive, Download, Upload, RotateCcw } from '@lucide/vue'

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  userProfile: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'save-profile', 'export-tabs', 'import-tabs', 'reset-local-data'])

const activeTab = ref('profile')

const profileForm = ref({
  displayName: props.userProfile.displayName || '',
  defaultUnitSystem: props.userProfile.defaultUnitSystem || 'metric',
  showDecimals: props.userProfile.showDecimals !== undefined ? props.userProfile.showDecimals : true,
  theme: props.userProfile.theme || 'dark'
})

watch(() => props.isOpen, (open) => {
  if (open) {
    profileForm.value.displayName = props.userProfile.displayName || ''
    profileForm.value.defaultUnitSystem = props.userProfile.defaultUnitSystem || 'metric'
    profileForm.value.showDecimals = props.userProfile.showDecimals !== undefined ? props.userProfile.showDecimals : true
    profileForm.value.theme = props.userProfile.theme || 'dark'
  }
})

function handleFileImport(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      if (Array.isArray(parsed)) {
        emit('import-tabs', parsed)
        alert('Tabs imported successfully!')
      } else {
        alert('Invalid backup file format.')
      }
    } catch (err) {
      alert('Error parsing JSON backup file.')
    }
  }
  reader.readAsText(file)
}

function handleSaveAll() {
  emit('save-profile', profileForm.value)
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
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

.modal-card {
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  width: 100%;
  max-width: 540px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--line-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: var(--paper-bright);
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

.modal-tabs {
  display: flex;
  border-bottom: 1px solid var(--line-soft);
  background: var(--panel-solid);
  padding: 0 16px;
}

.modal-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--muted);
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.modal-tab:hover {
  color: var(--paper);
}

.modal-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}

.modal-body {
  padding: 20px;
  min-height: 240px;
  max-height: 440px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.form-input, .form-select {
  width: 100%;
  background: var(--item-bg);
  border: 1px solid var(--line);
  color: var(--paper);
  padding: 8px 12px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus, .form-select:focus {
  border-color: var(--accent);
}

.form-select option {
  background: var(--panel-solid);
  color: var(--paper);
}

/* Switch styling */
.switch-group {
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  padding: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.switch-title {
  font-size: 13px !important;
  color: var(--paper) !important;
  margin: 0 !important;
  text-transform: none !important;
  letter-spacing: normal !important;
}

.form-hint {
  font-size: 11.5px;
  color: var(--muted);
  margin: 6px 0 0;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--line);
  transition: .2s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--muted-light);
  transition: .2s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent);
}

input:checked + .slider:before {
  transform: translateX(20px);
  background-color: #080F1A;
}

.account-card {
  background: rgba(22, 217, 196, 0.05);
  border: 1px solid rgba(22, 217, 196, 0.2);
  border-radius: 8px;
  padding: 14px;
  margin-top: 16px;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.badge-active {
  font-size: 11px;
  background: rgba(22, 217, 196, 0.12);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.account-info {
  font-size: 12.5px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}

.panel-desc {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 16px;
}

.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 18px;
}

.action-card {
  background: var(--item-bg);
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  padding: 14px;
}

.action-card h4 {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--paper-bright);
}

.action-card p {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted);
}

.file-label {
  cursor: pointer;
}

.file-input {
  display: none;
}

.danger-zone {
  background: rgba(229, 83, 83, 0.05);
  border: 1px solid rgba(229, 83, 83, 0.2);
  border-radius: 8px;
  padding: 14px;
}

.danger-zone h4 {
  margin: 0 0 4px;
  color: var(--err);
  font-size: 13px;
}

.danger-zone p {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--muted);
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--line-soft);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  background: var(--card-bg);
}

.btn-primary {
  background: var(--accent);
  color: #080F1A;
  font-weight: 700;
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 8px;
  transition: all 0.15s;
  box-shadow: 0 4px 12px rgba(22, 217, 196, 0.2);
}
.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 6px 16px rgba(22, 217, 196, 0.3);
}

.btn-secondary {
  background: var(--item-bg);
  color: var(--paper);
  border: 1px solid var(--line);
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.btn-secondary:hover {
  border-color: var(--line-hover);
  color: var(--paper-bright);
}

.btn-danger {
  background: rgba(229, 83, 83, 0.1);
  color: var(--err);
  border: 1px solid rgba(229, 83, 83, 0.25);
  font-size: 13px;
  padding: 7px 16px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
}
.btn-danger:hover {
  background: rgba(229, 83, 83, 0.18);
}

.icon-sm {
  width: 14px;
  height: 14px;
}
.icon {
  width: 16px;
  height: 16px;
}
</style>
