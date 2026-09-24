import { onMounted, onUnmounted } from 'vue'
import { hasCommandModifier } from '../../utils/platform.js'

/**
 * App-wide keyboard shortcuts.
 * Browsers don't let pages take over Ctrl/Cmd+N, Ctrl/Cmd+T or Ctrl/Cmd+Shift+T, and Ctrl/Cmd+D is the
 * bookmark shortcut, so tab and decimal actions use Alt (Option on Mac). Alt combos are matched by
 * e.code because Option changes e.key on macOS (Option+N types a dead key).
 * @param {{ actions: Record<string, () => unknown>, hasClosedTabs: () => boolean }} options
 */
export function useGlobalShortcuts({ actions, hasClosedTabs }) {
  function handleKeydown(e) {
    const modifier = hasCommandModifier(e)
    const altOnly = e.altKey && !e.ctrlKey && !e.metaKey
    const key = (e.key || '').toLowerCase()
    const tag = e.target?.tagName ? e.target.tagName.toUpperCase() : ''
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable

    const run = (action) => {
      e.preventDefault()
      action()
    }

    // Ctrl/Cmd+K: command palette (works while typing too)
    if (modifier && !e.shiftKey && !e.altKey && key === 'k') return run(actions.togglePalette)
    if (altOnly && e.shiftKey && e.code === 'KeyT') return run(actions.reopenLastClosedTab)
    if (altOnly && !e.shiftKey && e.code === 'KeyN') return run(actions.createTab)
    if (altOnly && !e.shiftKey && e.code === 'KeyD') return run(actions.toggleDecimals)
    // Ctrl/Cmd+Z outside the editor: reopen the last closed tab
    if (modifier && !e.shiftKey && !e.altKey && key === 'z' && !isTyping && hasClosedTabs()) {
      return run(actions.reopenLastClosedTab)
    }
    if (modifier && e.shiftKey && key === 'c') return run(actions.copyAll)
    if (modifier && !e.shiftKey && key === 'b') return run(actions.toggleSidebar)
    if (modifier && e.key === ',') return run(actions.openSettings)
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
