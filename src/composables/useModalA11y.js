import { watch, nextTick, onBeforeUnmount, toValue } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

// Open dialogs, topmost last. Only the topmost one handles keys.
const openDialogs = []

/**
 * Makes a dialog keyboard-accessible while it is open:
 * focus moves into it, Tab and Shift+Tab stay inside it, Escape closes it,
 * and focus returns to the element that opened it.
 *
 * @param {import('vue').MaybeRefOrGetter<boolean>} isOpen
 * @param {import('vue').Ref<HTMLElement|null>} containerRef  the dialog element (give it tabindex="-1")
 * @param {() => void} onClose  called on Escape
 */
export function useModalA11y(isOpen, containerRef, onClose) {
  const token = {}
  let previouslyFocused = null
  let active = false

  function focusableElements() {
    const container = containerRef.value
    if (!container) return []
    return [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.getClientRects().length > 0)
  }

  function handleKeydown(e) {
    if (openDialogs[openDialogs.length - 1] !== token) return
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const items = focusableElements()
    const container = containerRef.value
    if (items.length === 0) {
      e.preventDefault()
      container?.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const current = document.activeElement
    if (!container?.contains(current)) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && (current === first || current === container)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && current === last) {
      e.preventDefault()
      first.focus()
    }
  }

  async function activate() {
    if (active || typeof document === 'undefined') return
    active = true
    previouslyFocused = document.activeElement
    openDialogs.push(token)
    document.addEventListener('keydown', handleKeydown, true)
    await nextTick()
    const container = containerRef.value
    const target = container?.querySelector('[autofocus]') || focusableElements()[0] || container
    target?.focus()
  }

  function deactivate() {
    if (!active) return
    active = false
    document.removeEventListener('keydown', handleKeydown, true)
    const idx = openDialogs.indexOf(token)
    if (idx !== -1) openDialogs.splice(idx, 1)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function' && previouslyFocused.isConnected) {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  watch(
    () => Boolean(toValue(isOpen)),
    (open) => (open ? activate() : deactivate()),
    { immediate: true }
  )
  onBeforeUnmount(deactivate)
}
