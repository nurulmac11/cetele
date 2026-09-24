import { ref, computed, onMounted, onUnmounted } from 'vue'

// Every notepad line is exactly this tall (white-space: pre, no wrapping)
export const LINE_HEIGHT = 26
const OVERSCAN_ROWS = 30

/**
 * Renders only the rows around the visible area of the gutter, highlight layer and results
 * column, with spacers above and below. The textarea still holds the full text.
 * @param {{ inputRef: import('vue').Ref<HTMLTextAreaElement|null>,
 *           visibleLines: import('vue').Ref<object[]>,
 *           highlightedLines: import('vue').Ref<object[]>,
 *           rowDetails: (item: object) => object }} options
 */
export function useRowWindow({ inputRef, visibleLines, highlightedLines, rowDetails }) {
  const scrollTopPx = ref(0)
  const viewportPx = ref(900)

  const windowRange = computed(() => {
    const total = visibleLines.value.length
    const first = Math.floor(scrollTopPx.value / LINE_HEIGHT)
    const start = Math.max(0, first - OVERSCAN_ROWS)
    const end = Math.min(total, first + Math.ceil(viewportPx.value / LINE_HEIGHT) + OVERSCAN_ROWS)
    return { start, end, total }
  })

  const windowSpacers = computed(() => ({
    top: windowRange.value.start * LINE_HEIGHT,
    bottom: (windowRange.value.total - windowRange.value.end) * LINE_HEIGHT
  }))

  const windowRows = computed(() => {
    const { start, end } = windowRange.value
    const rows = []
    for (let k = start; k < end; k++) {
      const item = visibleLines.value[k]
      rows.push({ k, item, line: highlightedLines.value[k] || { tokens: [] }, details: rowDetails(item) })
    }
    return rows
  })

  function measureViewport() {
    if (inputRef.value) viewportPx.value = inputRef.value.clientHeight || viewportPx.value
  }

  let observer = null
  onMounted(() => {
    measureViewport()
    if (typeof ResizeObserver !== 'undefined' && inputRef.value) {
      observer = new ResizeObserver(measureViewport)
      observer.observe(inputRef.value)
    }
  })
  onUnmounted(() => observer?.disconnect())

  return { scrollTopPx, windowRows, windowSpacers }
}
