// Version history: decides when to snapshot a tab. Storage lives in localDb.js.
//
// Automatic snapshots save the text a tab had *before* an editing burst, and at most every
// AUTO_SNAPSHOT_INTERVAL while editing continues. Forced snapshots are taken before anything
// that replaces a tab's text (clear, restore, import, cloud sync).

import { addTabVersion, getTabVersions, clearTabVersions } from './localDb.js'

export const AUTO_SNAPSHOT_INTERVAL = 5 * 60 * 1000

export const VERSION_REASONS = {
  edit: 'Before editing',
  clear: 'Before clearing',
  restore: 'Before restoring a version',
  import: 'Before importing a backup',
  cloud: 'Before cloud sync replaced it'
}

// tabId -> { content, at } of the last snapshot this session
const lastSnapshot = new Map()

/**
 * Saves a version of the tab's current text if it's worth keeping.
 * Reads tab.content synchronously, so call it before changing the text.
 * @param {{ id: string, title?: string, content?: string }} tab
 * @param {string} reason  one of VERSION_REASONS
 * @param {{ force?: boolean }} options  force skips the 5-minute interval (duplicates are still skipped)
 * @returns {Promise<object|null>} the stored version, or null when nothing was saved
 */
export async function snapshotTab(tab, reason = VERSION_REASONS.edit, { force = false } = {}) {
  if (!tab?.id) return null
  const content = tab.content || ''
  if (!content.trim()) return null

  const now = Date.now()
  const last = lastSnapshot.get(tab.id)
  if (last && last.content === content) return null
  if (!force && last && now - last.at < AUTO_SNAPSHOT_INTERVAL) return null

  // Claim the slot before awaiting, so a burst of keystrokes can't start several snapshots
  lastSnapshot.set(tab.id, { content, at: now })

  // After a reload, the newest stored version may already hold this text
  if (!last) {
    const [newest] = await getTabVersions(tab.id)
    if (newest?.content === content) return null
  }

  const version = {
    id: `${tab.id}-${now}-${Math.random().toString(36).slice(2, 6)}`,
    tabId: tab.id,
    title: tab.title || 'Untitled',
    content,
    createdAt: new Date(now).toISOString(),
    reason
  }
  await addTabVersion(version)
  return version
}

export { getTabVersions }

// Deletes all history, e.g. on sign-out so the next person on this device can't read it
export async function clearVersionHistory() {
  lastSnapshot.clear()
  await clearTabVersions()
}

// For tests
export function _resetVersionMemory() {
  lastSnapshot.clear()
}

/**
 * Lines added and removed going from one text to another (order-insensitive, counts duplicates).
 * @returns {{ added: number, removed: number }}
 */
export function diffStats(fromText, toText) {
  const counts = new Map()
  for (const line of (fromText || '').split('\n')) counts.set(line, (counts.get(line) || 0) + 1)
  let added = 0
  for (const line of (toText || '').split('\n')) {
    const n = counts.get(line) || 0
    if (n > 0) counts.set(line, n - 1)
    else added++
  }
  let removed = 0
  counts.forEach((n) => (removed += n))
  return { added, removed }
}
