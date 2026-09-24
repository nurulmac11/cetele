import { nextTick } from 'vue'

/**
 * Inserting text at the cursor (indent, helper-bar symbols, sidebar snippets), each as its own
 * undo step.
 * @param {{ inputRef: import('vue').Ref<HTMLTextAreaElement|null>,
 *           text: import('vue').WritableComputedRef<string>,
 *           recordHistory: (content: string) => void }} options
 */
export function useTextInsertion({ inputRef, text, recordHistory }) {
  // Replaces the selection with `insert` and puts the cursor after it
  function insertInlineSymbol(insert) {
    const textarea = inputRef.value
    recordHistory(text.value)
    if (!textarea) {
      text.value += insert
      recordHistory(text.value)
      return
    }
    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const current = text.value
    text.value = current.substring(0, start) + insert + current.substring(end)
    const newPos = start + insert.length
    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
      recordHistory(text.value)
    })
  }

  const insertTabIndent = () => insertInlineSymbol('  ')

  // Inserts a snippet on its own line(s) at the cursor
  function insertTextAtCursor(snippet) {
    recordHistory(text.value)
    const textarea = inputRef.value
    if (!textarea) {
      const needPrefix = text.value && !text.value.endsWith('\n') ? '\n' : ''
      text.value += `${needPrefix}${snippet}\n`
      recordHistory(text.value)
      return
    }
    const start = textarea.selectionStart || 0
    const current = text.value
    const prefix = start > 0 && current[start - 1] !== '\n' ? '\n' : ''
    const suffix = start < current.length && current[start] === '\n' ? '' : '\n'
    const formatted = prefix + snippet + suffix
    text.value = current.substring(0, start) + formatted + current.substring(start)
    recordHistory(text.value)

    setTimeout(() => {
      textarea.focus({ preventScroll: true })
      textarea.selectionStart = textarea.selectionEnd = start + formatted.length
    }, 0)
  }

  return { insertInlineSymbol, insertTabIndent, insertTextAtCursor }
}
