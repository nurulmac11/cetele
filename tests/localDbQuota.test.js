import { describe, it, expect } from 'vitest'

// No IndexedDB here, so tabs go to localStorage, which is full
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {
    const err = new Error('quota')
    err.name = 'QuotaExceededError'
    throw err
  },
  removeItem: () => {}
}

const { saveLocalTabs, StorageFullError } = await import('../src/services/localDb.js')

describe('Tab storage when the browser is full', () => {
  it('reports it instead of failing silently', async () => {
    await expect(saveLocalTabs([{ id: 'a', content: 'x' }])).rejects.toBeInstanceOf(StorageFullError)
  })
})
