import { describe, it, expect, beforeEach } from 'vitest'

// Node has no IndexedDB, so these tests cover the localStorage fallback path
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
  getLocalTabs,
  saveLocalTabs,
  deleteLocalTab,
  getSavedLibraryTabs,
  saveTabToLibrary,
  deleteSavedTabFromLibrary,
  getLocalSettings,
  saveLocalSettings,
  clearLocalDatabase
} = await import('../src/services/localDb.js')

beforeEach(() => localStorage.clear())

describe('Local database (localStorage fallback)', () => {
  it('saves and loads tabs, keeping their sync metadata', async () => {
    const tabs = [
      {
        id: 'a',
        title: 'A',
        content: '1 + 1',
        updatedAt: '2026-09-01T10:00:00.000Z',
        syncedAt: '2026-09-01T10:00:00.000Z'
      },
      { id: 'b', title: 'B', content: '2 + 2' }
    ]
    await saveLocalTabs(tabs)
    const loaded = await getLocalTabs()
    expect(loaded.map((t) => t.id)).toEqual(['a', 'b'])
    expect(loaded[0].updatedAt).toBe('2026-09-01T10:00:00.000Z')
    expect(loaded[0].syncedAt).toBe('2026-09-01T10:00:00.000Z')
  })

  it('deletes a single tab', async () => {
    await saveLocalTabs([
      { id: 'a', content: '' },
      { id: 'b', content: '' }
    ])
    await deleteLocalTab('a')
    expect((await getLocalTabs()).map((t) => t.id)).toEqual(['b'])
  })

  it('does not duplicate a library item saved twice with the same title and content', async () => {
    await saveTabToLibrary({ title: 'Budget', content: 'rent = 1000' })
    await saveTabToLibrary({ title: 'Budget', content: 'rent = 1000' })
    await saveTabToLibrary({ title: 'Budget', content: 'rent = 1200' })
    const library = await getSavedLibraryTabs()
    expect(library).toHaveLength(2)
    expect(library.every((item) => typeof item.id === 'string' && item.savedAt)).toBe(true)
  })

  it('deletes a library item by id', async () => {
    await saveTabToLibrary({ title: 'One', content: '1' })
    const [item] = await getSavedLibraryTabs()
    await deleteSavedTabFromLibrary(item.id)
    expect(await getSavedLibraryTabs()).toEqual([])
  })

  it('saves settings and clears everything on reset', async () => {
    await saveLocalSettings({ theme: 'light', showDecimals: false })
    expect(await getLocalSettings()).toEqual({ theme: 'light', showDecimals: false })

    await saveLocalTabs([{ id: 'a', content: '' }])
    await clearLocalDatabase()
    expect(await getLocalTabs()).toEqual([])
    expect(await getLocalSettings()).toBeNull()
  })

  it('survives corrupted stored data', async () => {
    localStorage.setItem('cetele_local_tabs', '{not json')
    expect(await getLocalTabs()).toEqual([])
  })
})
