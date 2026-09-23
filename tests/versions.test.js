import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'

// Node has no IndexedDB, so versions go through the localStorage fallback
class MemoryStorage {
  constructor() {
    this.map = new Map()
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }
  setItem(key, value) {
    this.map.set(key, String(value))
  }
  removeItem(key) {
    this.map.delete(key)
  }
  clear() {
    this.map.clear()
  }
}
globalThis.localStorage = new MemoryStorage()

const {
  snapshotTab,
  scheduleCheckpoint,
  flushCheckpoint,
  getTabVersions,
  clearVersionHistory,
  diffStats,
  _resetVersionMemory,
  VERSION_REASONS,
  IDLE_CHECKPOINT_DELAY
} = await import('../src/services/versionService.js')
const { default: TabHistoryModal } = await import('../src/components/TabHistoryModal.vue')

beforeEach(async () => {
  localStorage.clear()
  _resetVersionMemory()
  vi.useRealTimers()
})

describe('Version history', () => {
  it('saves a snapshot at the start of an editing burst, then waits 5 minutes', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'))
    const tab = { id: 't1', title: 'Budget', content: 'rent = 1000' }

    expect(await snapshotTab(tab)).not.toBeNull()
    tab.content = 'rent = 1100'
    expect(await snapshotTab(tab)).toBeNull() // same burst

    vi.setSystemTime(new Date('2026-09-01T10:06:00Z'))
    expect(await snapshotTab(tab)).not.toBeNull()

    const versions = await getTabVersions('t1')
    expect(versions.map((v) => v.content)).toEqual(['rent = 1100', 'rent = 1000'])
    expect(versions[0].reason).toBe(VERSION_REASONS.edit)
  })

  it('saves the edited text once typing pauses, even a minute after the first snapshot', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T10:00:00Z'))
    const tab = { id: 'pause', title: 'Budget', content: 'rent = 1000' }

    // Typing a few lines, the way the app calls these on every edit
    for (const next of ['rent = 1000\nfood = 300', 'rent = 1000\nfood = 300\nfuel = 90']) {
      await snapshotTab(tab)
      tab.content = next
      scheduleCheckpoint(tab)
      await vi.advanceTimersByTimeAsync(2000)
    }
    await vi.advanceTimersByTimeAsync(IDLE_CHECKPOINT_DELAY)

    const versions = await getTabVersions('pause')
    expect(versions.map((v) => v.reason)).toEqual([VERSION_REASONS.pause, VERSION_REASONS.edit])
    expect(versions[0].content).toBe('rent = 1000\nfood = 300\nfuel = 90')
  })

  it('saves a pending checkpoint right away when switching to another tab', async () => {
    const a = { id: 'switch-a', content: 'a = 1' }
    const b = { id: 'switch-b', content: 'b = 1' }
    scheduleCheckpoint(a)
    a.content = 'a = 2'
    scheduleCheckpoint(b) // editing another tab flushes the first
    // The flush for tab A runs in the background
    await vi.waitFor(async () => expect((await getTabVersions('switch-a')).map((v) => v.content)).toEqual(['a = 2']))
    expect(await flushCheckpoint()).not.toBeNull()
    expect(await getTabVersions('switch-b')).toHaveLength(1)
  })

  it('always saves before destructive actions, but never duplicates or empty text', async () => {
    const tab = { id: 't2', title: 'A', content: 'x = 1' }
    await snapshotTab(tab)
    tab.content = 'x = 2'
    expect(await snapshotTab(tab, VERSION_REASONS.clear, { force: true })).not.toBeNull()
    expect(await snapshotTab(tab, VERSION_REASONS.clear, { force: true })).toBeNull() // unchanged text
    expect(await snapshotTab({ id: 't2', content: '   ' }, VERSION_REASONS.clear, { force: true })).toBeNull()
    expect((await getTabVersions('t2')).map((v) => v.reason)).toEqual([VERSION_REASONS.clear, VERSION_REASONS.edit])
  })

  it('does not repeat the newest stored version after a reload', async () => {
    const tab = { id: 't3', content: 'a = 1' }
    await snapshotTab(tab)
    _resetVersionMemory() // simulate a page reload
    expect(await snapshotTab(tab)).toBeNull()
    expect(await getTabVersions('t3')).toHaveLength(1)
  })

  it('keeps a limited number of versions per tab', async () => {
    const tab = { id: 't4', content: '' }
    for (let i = 0; i < 20; i++) {
      tab.content = `v = ${i}`
      await snapshotTab(tab, VERSION_REASONS.clear, { force: true })
    }
    const versions = await getTabVersions('t4')
    expect(versions.length).toBeLessThanOrEqual(15)
    expect(versions[0].content).toBe('v = 19')
  })

  it('clears all history', async () => {
    await snapshotTab({ id: 't5', content: 'secret = 42' })
    await clearVersionHistory()
    expect(await getTabVersions('t5')).toEqual([])
  })

  it('counts added and removed lines', () => {
    expect(diffStats('a\nb\nc', 'a\nc\nd\ne')).toEqual({ added: 2, removed: 1 })
    expect(diffStats('x\nx', 'x')).toEqual({ added: 0, removed: 1 })
    expect(diffStats('same', 'same')).toEqual({ added: 0, removed: 0 })
  })

  it('renders the history panel', async () => {
    const html = await renderToString(
      createSSRApp({
        render: () => h(TabHistoryModal, { isOpen: true, tab: { id: 'none', title: 'Budget', content: '' } })
      })
    )
    expect(html).toContain('Version history')
    expect(html).toContain('Budget')
  })
})
