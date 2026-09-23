import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'

// localDb only uses IndexedDB when window.indexedDB exists
globalThis.window = globalThis
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

// A database created by the previous app version (v2, without the versions store)
await new Promise((resolve, reject) => {
  const request = indexedDB.open('CeteleLocalDB', 2)
  request.onupgradeneeded = (e) => {
    const db = e.target.result
    db.createObjectStore('tabs', { keyPath: 'id' }).createIndex('position', 'position')
    db.createObjectStore('saved_tabs', { keyPath: 'id' }).createIndex('savedAt', 'savedAt')
    db.createObjectStore('settings', { keyPath: 'key' })
  }
  request.onsuccess = (e) => {
    const db = e.target.result
    const tx = db.transaction('tabs', 'readwrite')
    tx.objectStore('tabs').put({ id: 'old-tab', title: 'Kept', content: '1 + 1', position: 0 })
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
  }
  request.onerror = () => reject(request.error)
})

const { addTabVersion, getTabVersions, getLocalTabs, clearLocalDatabase, MAX_VERSIONS_PER_TAB } =
  await import('../src/services/localDb.js')

const version = (tabId, i) => ({
  id: `${tabId}-${i}`,
  tabId,
  title: 'T',
  content: `v = ${i}`,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  reason: 'test'
})

describe('Version history in IndexedDB', () => {
  it('upgrades an existing database without losing tabs', async () => {
    expect((await getLocalTabs()).map((t) => t.id)).toEqual(['old-tab'])
  })

  it('stores versions per tab, newest first, pruned to the limit', async () => {
    for (let i = 0; i < MAX_VERSIONS_PER_TAB + 5; i++) await addTabVersion(version('a', i))
    await addTabVersion(version('b', 0))

    const versions = await getTabVersions('a')
    expect(versions).toHaveLength(MAX_VERSIONS_PER_TAB)
    expect(versions[0].content).toBe(`v = ${MAX_VERSIONS_PER_TAB + 4}`)
    expect(versions.at(-1).content).toBe('v = 5')
    expect(await getTabVersions('b')).toHaveLength(1)
  })

  it('clears versions with the rest of the local database', async () => {
    await clearLocalDatabase()
    await new Promise((r) => setTimeout(r, 20))
    expect(await getTabVersions('a')).toEqual([])
  })
})
