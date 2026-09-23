// Search for the Ctrl+K command palette: commands, tabs by title, and lines across all tabs.

const MAX_LINE_RESULTS = 40

function words(text) {
  return String(text || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

// Every query word must start one of the words in the command label or its keywords
function commandMatches(command, queryWords) {
  const haystack = words(`${command.label} ${command.keywords || ''}`)
  return queryWords.every((q) => haystack.some((w) => w.startsWith(q)))
}

/**
 * @param {string} query
 * @param {{ commands: Array<{ id: string, label: string, keywords?: string, hint?: string }>,
 *           tabs: Array<{ id: string, title: string, content: string }> }} sources
 * @returns {{ commands: object[], tabs: object[], lines: Array<{ tabId: string, tabTitle: string,
 *           line: number, text: string, matchStart: number, matchLength: number }> }}
 */
export function searchPalette(query, { commands = [], tabs = [] } = {}) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  const queryWords = words(q)

  const matchedCommands = q ? commands.filter((c) => commandMatches(c, queryWords)) : commands
  const matchedTabs = q ? tabs.filter((t) => (t.title || 'Untitled').toLowerCase().includes(q)) : tabs

  const lines = []
  if (q.length >= 2) {
    for (const tab of tabs) {
      const tabLines = (tab.content || '').split('\n')
      for (let i = 0; i < tabLines.length && lines.length < MAX_LINE_RESULTS; i++) {
        const matchStart = tabLines[i].toLowerCase().indexOf(q)
        if (matchStart === -1) continue
        lines.push({
          tabId: tab.id,
          tabTitle: tab.title || 'Untitled',
          line: i,
          text: tabLines[i],
          matchStart,
          matchLength: q.length
        })
      }
    }
  }

  return { commands: matchedCommands, tabs: matchedTabs, lines }
}
