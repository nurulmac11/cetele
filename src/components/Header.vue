<template>
  <header class="app-header">
    <!-- Top Bar: Brand & Navigation -->
    <div class="header-top">
      <div class="brand">
        <span class="mark">Σ=</span>
        <div class="brand-text">
          <h1>çetele</h1>
        </div>
      </div>

      <div class="header-actions">
        <!-- View Navigation Pills (Desktop Only) -->
        <div class="nav-pills desktop-only">
          <button
            class="btn-nav"
            :class="{ active: currentView === 'notepad' }"
            @click="$emit('switch-view', 'notepad')"
          >
            <Calculator class="icon-sm" /> Notepad
          </button>

          <button
            class="btn-nav"
            :class="{ active: currentView === 'library' }"
            @click="$emit('switch-view', 'library')"
          >
            <Bookmark class="icon-sm" /> Saved Tabs
          </button>

          <button class="btn-nav" :class="{ active: currentView === 'guide' }" @click="$emit('switch-view', 'guide')">
            <BookOpen class="icon-sm" /> Syntax Guide
          </button>
        </div>

        <!-- Mobile Navigation Menu Dropdown (Shown ONLY ON MOBILE <= 600px) -->
        <MobileNavMenu
          :current-view="currentView"
          @switch-view="(view) => $emit('switch-view', view)"
          @open-palette="$emit('open-palette')"
          @open-welcome="$emit('open-welcome')"
          @open-settings="$emit('open-settings')"
        />

        <div class="divider desktop-only"></div>

        <!-- Decimals Toggle Switch -->
        <div
          class="decimals-switch-box desktop-only"
          :title="
            showDecimals
              ? 'Decimals ON (showing fractional values) · Alt+D'
              : 'Decimals OFF (rounding to integers) · Alt+D'
          "
        >
          <span class="switch-text">Decimals</span>
          <label class="toggle-switch">
            <input type="checkbox" :checked="showDecimals" @change="$emit('toggle-show-decimals')" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- Obvious Clear Cloud Sync & Sign In Button -->
        <button
          class="btn-cloud-pill"
          :class="{ 'user-active': user }"
          :title="user ? `Cloud Sync Active (${user.email})` : 'Sign in to sync tabs across devices'"
          @click="$emit('open-auth')"
        >
          <Cloud class="icon-sm" />
          <span v-if="user" class="cloud-text">Sync Active</span>
          <span v-else class="cloud-text">Cloud Sync / Sign In</span>
          <span v-if="user" class="sync-dot"></span>
        </button>

        <!-- Expand Calculation Area / Toggle Sidebar Button -->
        <button
          :aria-label="
            showSidebar ? 'Expand calculation area (hide right sidebar)' : 'Show right sidebar & syntax sheet'
          "
          class="btn-icon desktop-only"
          :class="{ active: !showSidebar }"
          :title="showSidebar ? 'Expand calculation area (hide right sidebar)' : 'Show right sidebar & syntax sheet'"
          @click="$emit('toggle-sidebar')"
        >
          <Maximize2 v-if="showSidebar" class="icon" />
          <Minimize2 v-else class="icon" />
        </button>

        <!-- Command palette: search every tab and run commands -->
        <button
          class="btn-search desktop-only"
          aria-label="Search tabs and commands"
          title="Search lines in all tabs, switch tabs or run a command (Ctrl+K)"
          @click="$emit('open-palette')"
        >
          <Search class="icon-sm" />
          <span>Search</span>
          <kbd>Ctrl K</kbd>
        </button>

        <!-- Light / Dark Theme Toggle -->
        <button
          :aria-label="theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          class="btn-icon desktop-only"
          :title="theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'"
          @click="$emit('toggle-theme')"
        >
          <Sun v-if="theme === 'dark'" class="icon" />
          <Moon v-else class="icon" />
        </button>

        <!-- Quick Tour / Welcome Modal Button -->
        <button
          aria-label="Quick Tour & Intro Guide"
          class="btn-icon desktop-only"
          title="Quick Tour & Intro Guide"
          @click="$emit('open-welcome')"
        >
          <HelpCircle class="icon" />
        </button>

        <button
          class="btn-icon btn-settings desktop-only"
          title="Settings & Data Management (Ctrl+,)"
          @click="$emit('open-settings')"
        >
          <Settings class="icon" />
          <span class="btn-settings-text">Settings</span>
        </button>
      </div>
    </div>
    <!-- Bottom Bar: Tabs Strip (only shown in notepad view) -->
    <div v-if="currentView === 'notepad'" class="tabs-strip">
      <!-- Desktop & Tablet Tab Strip -->
      <DesktopTabStrip
        :tabs="tabs"
        :active-tab-id="activeTabId"
        @select-tab="(id) => $emit('select-tab', id)"
        @create-tab="$emit('create-tab')"
        @close-tab="(id) => $emit('close-tab', id)"
        @rename-tab="(payload) => $emit('rename-tab', payload)"
        @reorder-tabs="(list) => $emit('reorder-tabs', list)"
      />

      <!-- Mobile Touch Compact Tab Selector Bar (Shown ON MOBILE <= 600px) -->
      <MobileTabBar
        :tabs="tabs"
        :active-tab-id="activeTabId"
        @select-tab="(id) => $emit('select-tab', id)"
        @create-tab="$emit('create-tab')"
        @close-tab="(id) => $emit('close-tab', id)"
        @rename-tab="(payload) => $emit('rename-tab', payload)"
      />
    </div>
  </header>
</template>

<script setup>
import {
  BookOpen,
  Calculator,
  Bookmark,
  Settings,
  Sun,
  Moon,
  Cloud,
  Maximize2,
  Minimize2,
  HelpCircle,
  Search
} from '@lucide/vue'
import MobileNavMenu from './header/MobileNavMenu.vue'
import DesktopTabStrip from './header/DesktopTabStrip.vue'
import MobileTabBar from './header/MobileTabBar.vue'

defineProps({
  tabs: { type: Array, required: true },
  activeTabId: { type: String, required: true },
  currentView: { type: String, default: 'notepad' }, // 'notepad' | 'library' | 'guide'
  showDecimals: { type: Boolean, default: true },
  theme: { type: String, default: 'dark' },
  user: { type: Object, default: null },
  showSidebar: { type: Boolean, default: true }
})

defineEmits([
  'open-palette',
  'select-tab',
  'create-tab',
  'close-tab',
  'rename-tab',
  'reorder-tabs',
  'switch-view',
  'toggle-show-decimals',
  'toggle-theme',
  'open-settings',
  'open-auth',
  'toggle-sidebar',
  'open-welcome'
])
</script>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
}

.header-top {
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--line-soft);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand .mark {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  color: var(--accent);
  background: rgba(22, 217, 196, 0.12);
  border: 1px solid rgba(22, 217, 196, 0.25);
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-text h1 {
  font-size: 19px;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--paper-bright);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-pills {
  display: flex;
  align-items: center;
  background: var(--bg);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--line-soft);
}

.btn-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  padding: 5px 12px;
  border-radius: 6px;
  color: var(--muted);
  font-weight: 500;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.btn-nav:hover {
  color: var(--paper);
  background: rgba(255, 255, 255, 0.03);
}

.btn-nav.active {
  background: var(--card-bg);
  color: var(--accent);
  font-weight: 600;
  border-color: rgba(22, 217, 196, 0.25);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--line);
  margin: 0 4px;
}

.decimals-switch-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  background: var(--card-bg);
  border: 1px solid var(--line);
  border-radius: 8px;
  user-select: none;
}

.switch-text {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background-color: var(--item-bg);
  border: 1px solid var(--line);
  transition: 0.2s ease;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: '';
  height: 12px;
  width: 12px;
  left: 2px;
  bottom: 2px;
  background-color: var(--muted);
  transition: 0.2s ease;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--accent);
  border-color: var(--accent);
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(16px);
  background-color: var(--on-accent);
}

.btn-cloud-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
  border: 1px solid var(--line);
  background: var(--card-bg);
  padding: 5px 12px;
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;
}

.btn-cloud-pill:hover {
  background: var(--item-bg);
  border-color: var(--line-hover);
  color: var(--paper);
}

.btn-cloud-pill.user-active {
  color: var(--accent);
  border-color: rgba(22, 217, 196, 0.25);
  background: rgba(22, 217, 196, 0.08);
}

.sync-dot {
  width: 7px;
  height: 7px;
  background: var(--accent);
  border-radius: 50%;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 6px;
  border-radius: 8px;
  transition: all 0.15s ease;
  background: var(--card-bg);
}

.btn-icon:hover {
  color: var(--paper-bright);
  border-color: var(--line-hover);
  background: var(--item-bg);
}

.icon {
  width: 15px;
  height: 15px;
}

.icon-sm {
  width: 14px;
  height: 14px;
}

.tabs-strip {
  padding: 8px 24px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.btn-settings-text {
  display: none;
  font-size: 12.5px;
  font-weight: 500;
}

@media (max-width: 600px) {
  .desktop-tabs,
  .desktop-only {
    display: none !important;
  }

  .tabs-strip {
    padding: 6px 12px 0;
  }
}

.btn-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px 5px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--item-bg);
  color: var(--muted-light);
  font-size: 12.5px;
  transition:
    border-color 0.15s ease,
    color 0.15s ease;
}

.btn-search:hover {
  border-color: var(--line-hover);
  color: var(--paper-bright);
}

.btn-search kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
}
</style>
