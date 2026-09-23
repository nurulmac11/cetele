import { describe, it, expect } from 'vitest'
import { mergeCloudTabs, hasUnsyncedEdits } from '../src/services/syncService.js'

const T0 = '2026-09-01T10:00:00.000Z'
const T1 = '2026-09-01T11:00:00.000Z'
const T2 = '2026-09-01T12:00:00.000Z'

function cloudTab(id, content, updatedAt = T1) {
  return { id, title: id, content, updatedAt, syncedAt: updatedAt, syncedPosition: 0 }
}

describe('hasUnsyncedEdits', () => {
  it('is true for a tab that was never synced', () => {
    expect(hasUnsyncedEdits({ id: 'a', updatedAt: T0 })).toBe(true)
  })

  it('is false when the last edit was synced', () => {
    expect(hasUnsyncedEdits({ id: 'a', updatedAt: T1, syncedAt: T1 })).toBe(false)
  })

  it('is true when edited after the last sync', () => {
    expect(hasUnsyncedEdits({ id: 'a', updatedAt: T2, syncedAt: T1 })).toBe(true)
  })

  it('compares instants, not string formats', () => {
    expect(hasUnsyncedEdits({ id: 'a', updatedAt: T1, syncedAt: '2026-09-01T11:00:00+00:00' })).toBe(false)
  })
})

describe('mergeCloudTabs', () => {
  it('keeps every local tab when the account has no cloud tabs yet', () => {
    const local = [{ id: 'tab-1', content: 'x', updatedAt: T0 }]
    expect(mergeCloudTabs(local, [])).toEqual(local)
  })

  it('uses the cloud copy when the local copy has no unsynced edits', () => {
    const local = [{ id: 'a', content: 'old', updatedAt: T0, syncedAt: T0 }]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'new', T1)])
    expect(merged.map(t => t.content)).toEqual(['new'])
  })

  it('keeps a local edit that is newer than the cloud copy', () => {
    const local = [{ id: 'a', content: 'local edit', updatedAt: T2, syncedAt: T0 }]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'cloud', T1)])
    expect(merged.map(t => t.content)).toEqual(['local edit'])
  })

  it('prefers the cloud copy when it is newer than an unsynced local edit', () => {
    const local = [{ id: 'a', content: 'local edit', updatedAt: T1, syncedAt: T0 }]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'cloud', T2)])
    expect(merged.map(t => t.content)).toEqual(['cloud'])
  })

  it('drops a synced local tab that was deleted on another device', () => {
    const local = [
      { id: 'a', content: 'a', updatedAt: T0, syncedAt: T0 },
      { id: 'gone', content: 'deleted elsewhere', updatedAt: T0, syncedAt: T0 }
    ]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'a')])
    expect(merged.map(t => t.id)).toEqual(['a'])
  })

  it('keeps a deleted-elsewhere tab that has unsynced local edits', () => {
    const local = [{ id: 'gone', content: 'edited offline', updatedAt: T2, syncedAt: T0 }]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'a')])
    expect(merged.map(t => t.id)).toEqual(['a', 'gone'])
  })

  it('keeps tabs created while logged out, such as an opened share link', () => {
    const local = [{ id: 'tab-shared-1', content: 'shared', updatedAt: T0 }]
    const merged = mergeCloudTabs(local, [cloudTab('a', 'a')])
    expect(merged.map(t => t.id)).toEqual(['a', 'tab-shared-1'])
  })

  it('drops disposable never-synced tabs when the account already has tabs', () => {
    const local = [
      { id: 'tab-1', content: 'example', updatedAt: T0 },
      { id: 'mine', content: 'real work', updatedAt: T0 }
    ]
    const isDisposable = (t) => t.id === 'tab-1' && t.content === 'example'
    const merged = mergeCloudTabs(local, [cloudTab('a', 'a')], isDisposable)
    expect(merged.map(t => t.id)).toEqual(['a', 'mine'])
  })
})
