import { ref, computed } from 'vue'
import { getCompletions } from '../../services/completions.js'

const MENU_WIDTH = 240

// Pixel position just below the caret, by measuring the current line's text in the same font
function caretCoordinates(textarea, text) {
  const pos = textarea.selectionStart || 0
  const linesBefore = text.slice(0, pos).split('\n')
  const lineIndex = linesBefore.length - 1
  const style = window.getComputedStyle(textarea)

  const lineHeight = parseFloat(style.lineHeight) || 26
  const paddingTop = parseFloat(style.paddingTop) || 16
  const paddingLeft = parseFloat(style.paddingLeft) || 14

  let measurer = document.getElementById('caret-measurer')
  if (!measurer) {
    measurer = document.createElement('span')
    measurer.id = 'caret-measurer'
    Object.assign(measurer.style, {
      visibility: 'hidden',
      position: 'absolute',
      whiteSpace: 'pre',
      top: '-9999px',
      left: '-9999px',
      pointerEvents: 'none'
    })
    document.body.appendChild(measurer)
  }
  Object.assign(measurer.style, {
    font: style.font,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    letterSpacing: style.letterSpacing
  })
  measurer.textContent = linesBefore[lineIndex]

  const top = paddingTop + (lineIndex + 1) * lineHeight - (textarea.scrollTop || 0) + 2
  let left = paddingLeft + measurer.getBoundingClientRect().width - (textarea.scrollLeft || 0)
  const wrapperWidth = textarea.parentElement?.clientWidth || 300
  if (left + MENU_WIDTH - 10 > wrapperWidth) left = Math.max(10, wrapperWidth - MENU_WIDTH)
  return { top: Math.max(10, top), left: Math.max(10, left) }
}

/**
 * Suggestions for the word being typed: variables, functions, currencies, units, keywords.
 * Tab accepts; Enter accepts only after choosing with the arrow keys, so Enter still starts a
 * new line.
 * @param {{ inputRef: import('vue').Ref, text: import('vue').WritableComputedRef<string>,
 *           cursorPosition: import('vue').Ref<number>, variables: import('vue').Ref<object[]>,
 *           recordHistory: (content: string) => void }} options
 */
export function useAutocomplete({ inputRef, text, cursorPosition, variables, recordHistory }) {
  const prefix = ref('')
  const context = ref('')
  const index = ref(0)
  const visible = ref(false)
  const navigated = ref(false)
  const position = ref({ top: 40, left: 10 })

  const suggestions = computed(() => getCompletions(prefix.value, context.value, variables.value))
  const menuStyle = computed(() => ({ top: `${position.value.top}px`, left: `${position.value.left}px` }))

  // Call after the caret moves or text changes
  function updateFromCursor() {
    const textarea = inputRef.value
    if (!textarea) return
    const pos = textarea.selectionStart || 0
    cursorPosition.value = pos

    const textBefore = text.value.slice(0, pos)
    // Only the end of the current line matters. Matching the whole document before the cursor
    // was quadratic on long runs of letters and could freeze typing.
    const lineStart = textBefore.lastIndexOf('\n') + 1
    const tail = textBefore.slice(Math.max(lineStart, textBefore.length - 64))
    const match = tail.match(/([\p{L}_][\p{L}\p{N}_]*)$/u)
    if (!match) {
      prefix.value = ''
      visible.value = false
      return
    }

    const wasShowing = visible.value && prefix.value
    prefix.value = match[1]
    context.value = textBefore.slice(lineStart, textBefore.length - match[1].length)
    if (!wasShowing) navigated.value = false
    if (suggestions.value.length === 0) {
      visible.value = false
      return
    }
    visible.value = true
    position.value = caretCoordinates(textarea, text.value)
    if (index.value >= suggestions.value.length) index.value = 0
  }

  // Keeps the menu under the caret while scrolling
  function reposition() {
    if (visible.value && inputRef.value) position.value = caretCoordinates(inputRef.value, text.value)
  }

  function apply(item) {
    const textarea = inputRef.value
    if (!textarea || !item || !prefix.value) return
    const pos = textarea.selectionStart
    const startPos = pos - prefix.value.length
    const current = text.value

    recordHistory(current)
    text.value = current.substring(0, startPos) + item.insert + current.substring(pos)
    visible.value = false
    navigated.value = false
    prefix.value = ''

    setTimeout(() => {
      // The notepad may be gone by now (view switched)
      if (!inputRef.value) return
      inputRef.value.focus({ preventScroll: true })
      // Functions put the cursor between the brackets
      const newPos = startPos + item.insert.length + (item.caretOffset || 0)
      inputRef.value.selectionStart = inputRef.value.selectionEnd = newPos
      recordHistory(text.value)
    }, 0)
  }

  // Handles menu keys. Returns true when the key was used.
  function handleKeydown(e) {
    if (!visible.value || suggestions.value.length === 0) return false
    const count = suggestions.value.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      navigated.value = true
      index.value = (index.value + (e.key === 'ArrowDown' ? 1 : count - 1)) % count
      return true
    }
    if (e.key === 'Tab' || (e.key === 'Enter' && navigated.value)) {
      e.preventDefault()
      const selected = suggestions.value[index.value]
      if (selected) apply(selected)
      return true
    }
    if (e.key === 'Enter') {
      visible.value = false // and let Enter insert the newline
      return false
    }
    if (e.key === 'Escape') {
      visible.value = false
      return true
    }
    return false
  }

  return {
    showAutocomplete: visible,
    autocompleteSuggestions: suggestions,
    autocompleteIndex: index,
    autocompleteStyle: menuStyle,
    updateCursorState: updateFromCursor,
    repositionAutocomplete: reposition,
    applyAutocomplete: apply,
    handleAutocompleteKey: handleKeydown
  }
}
