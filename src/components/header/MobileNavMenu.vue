<template>
  <!-- View switcher and menu for phones (max-width: 600px) -->
  <div class="mobile-nav-wrapper mobile-only">
    <button class="btn-mobile-nav-select" title="Menu & Navigation" @click="isOpen = !isOpen">
      <Calculator v-if="currentView === 'notepad'" class="icon-sm active-nav-icon" />
      <Bookmark v-else-if="currentView === 'library'" class="icon-sm active-nav-icon" />
      <BookOpen v-else-if="currentView === 'guide'" class="icon-sm active-nav-icon" />
      <span class="mobile-nav-current-label">
        {{ currentView === 'notepad' ? 'Notepad' : currentView === 'library' ? 'Saved Tabs' : 'Syntax Guide' }}
      </span>
      <ChevronDown class="icon-xs caret-icon" :class="{ open: isOpen }" />
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="mobile-dropdown-backdrop" @click="isOpen = false"></div>

      <div v-if="isOpen" class="mobile-nav-menu" @click.stop>
        <div class="mobile-nav-menu-header">Menu & Views</div>
        <button
          class="mobile-nav-menu-item"
          :class="{ active: currentView === 'notepad' }"
          @click="choose(() => $emit('switch-view', 'notepad'))"
        >
          <Calculator class="icon-sm" />
          <span>Notepad</span>
        </button>

        <button
          class="mobile-nav-menu-item"
          :class="{ active: currentView === 'library' }"
          @click="choose(() => $emit('switch-view', 'library'))"
        >
          <Bookmark class="icon-sm" />
          <span>Saved Tabs</span>
        </button>

        <button
          class="mobile-nav-menu-item"
          :class="{ active: currentView === 'guide' }"
          @click="choose(() => $emit('switch-view', 'guide'))"
        >
          <BookOpen class="icon-sm" />
          <span>Syntax Guide</span>
        </button>

        <div class="mobile-nav-menu-divider"></div>

        <button class="mobile-nav-menu-item" @click="choose(() => $emit('open-palette'))">
          <Search class="icon-sm" />
          <span>Search tabs & commands</span>
        </button>

        <button class="mobile-nav-menu-item" @click="choose(() => $emit('open-welcome'))">
          <HelpCircle class="icon-sm" />
          <span>Quick Tour</span>
        </button>

        <button class="mobile-nav-menu-item" @click="choose(() => $emit('open-settings'))">
          <Settings class="icon-sm" />
          <span>Settings</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { BookOpen, Calculator, Bookmark, Settings, ChevronDown, HelpCircle, Search } from '@lucide/vue'

defineProps({
  currentView: { type: String, default: 'notepad' } // 'notepad' | 'library' | 'guide'
})

defineEmits(['switch-view', 'open-palette', 'open-welcome', 'open-settings'])

const isOpen = ref(false)

// Runs a menu action and closes the menu
function choose(action) {
  action()
  isOpen.value = false
}
</script>

<style scoped>
.icon-sm {
  width: 14px;
  height: 14px;
}

.icon-xs {
  width: 12px;
  height: 12px;
}

.caret-icon {
  color: var(--muted);
  transition: transform 0.2s ease;
}

.caret-icon.open {
  transform: rotate(180deg);
}

.mobile-dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}

.mobile-only,
.mobile-nav-wrapper,
.mobile-tab-bar {
  display: none !important;
}

.btn-mobile-nav-select {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--line-soft);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--paper);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-mobile-nav-select .active-nav-icon {
  color: var(--accent);
}

.mobile-nav-menu {
  position: fixed;
  top: 56px;
  right: 12px;
  min-width: 180px;
  background: var(--panel-solid);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  z-index: 10000;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: slideDown 0.15s ease-out;
}

.mobile-nav-menu-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.mobile-nav-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: var(--paper);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.mobile-nav-menu-item:hover,
.mobile-nav-menu-item.active {
  background: var(--accent-glow);
  color: var(--accent);
  font-weight: 600;
}

.mobile-nav-menu-divider {
  height: 1px;
  background: var(--line);
  margin: 4px 0;
}

@media (max-width: 600px) {
  .mobile-only,
  .mobile-nav-wrapper,
  .mobile-tab-bar {
    display: flex !important;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
