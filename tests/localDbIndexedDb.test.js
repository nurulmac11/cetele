import 'fake-indexeddb/auto'
import { describe, it, expect, vi } from 'vitest'

globalThis.window = globalThis
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
}

// Tabs saved by an older version, in localStorage only
store.set('cetele_local_tabs', JSON.stringify([{ id: 'legacy', title: 'Old', content: 'x = 1', position: 0 }]))

const { getLocalTabs, saveLocalTabs, deleteLocalTab } = await import('../src/services/localDb.js')

function countPuts(fn) {
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put')
  return fn().then(() => {
    const n = spy.mock.calls.length
    spy.mockRestore()
    return n
  })
}

describe('Tab storage in IndexedDB', () => {
  it('moves tabs saved in localStorage by older versions into IndexedDB', async () => {
    const tabs = await getLocalTabs()
    expect(tabs.map((t) => t.id)).toEqual(['legacy'])
    await saveLocalTabs(tabs)
    expect(store.has('cetele_local_tabs')).toBe(false) // no second copy using the 5 MB quota
    expect((await getLocalTabs()).map((t) => t.content)).toEqual(['x = 1'])
  })

  it('writes only the tabs that changed', async () => {
    const tabs = [
      { id: 'a', title: 'A', content: 'a = 1', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', title: 'B', content: 'b = 1', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'c', title: 'C', content: 'c = 1', updatedAt: '2026-01-01T00:00:00.000Z' }
    ]
    expect(await countPuts(() => saveLocalTabs(tabs))).toBe(3)
    expect(await countPuts(() => saveLocalTabs(tabs))).toBe(0)

    tabs[1].content = 'b = 2'
    expect(await countPuts(() => saveLocalTabs(tabs))).toBe(1)

    // Moving a tab changes positions of the tabs after it
    const reordered = [tabs[2], tabs[0], tabs[1]]
    expect(await countPuts(() => saveLocalTabs(reordered))).toBe(3)
    expect((await getLocalTabs()).map((t) => t.id)).toEqual(['c', 'a', 'b'])
  })

  it('deletes tabs that are no longer open, including the legacy one', async () => {
    await saveLocalTabs([{ id: 'a', title: 'A', content: 'a = 1' }])
    expect((await getLocalTabs()).map((t) => t.id)).toEqual(['a'])
    await saveLocalTabs([
      { id: 'a', title: 'A', content: 'a = 1' },
      { id: 'd', title: 'D', content: '' }
    ])
    await deleteLocalTab('d')
    expect((await getLocalTabs()).map((t) => t.id)).toEqual(['a'])
  })
})
