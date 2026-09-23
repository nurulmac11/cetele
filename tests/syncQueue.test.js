import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Fake Supabase client that records every write, in order
const calls = []
let upsertError = null
let upsertDelayMs = 0

function fakeClient() {
  return {
    from(table) {
      return {
        async upsert(rows, options) {
          if (upsertDelayMs) await new Promise((r) => setTimeout(r, upsertDelayMs))
          calls.push({ op: 'upsert', table, ids: rows.map((r) => r.id), onConflict: options.onConflict })
          const error = typeof upsertError === 'function' ? upsertError(options) : upsertError
          return { error }
        },
        delete() {
          const filters = {}
          const chain = {
            eq(col, val) {
              filters[col] = val
              return chain
            },
            then(resolve) {
              calls.push({ op: 'delete', table, id: filters.id })
              resolve({ error: null })
            }
          }
          return chain
        }
      }
    }
  }
}

vi.mock('../src/services/supabaseClient.js', () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => fakeClient()
}))
vi.mock('../src/services/localDb.js', () => ({ saveLocalTabs: async () => true }))

const { syncTabsToCloud, throttledSyncTabsToCloud, deleteCloudTab, flushPendingSync } =
  await import('../src/services/syncService.js')

const tab = (id, extra = {}) => ({ id, title: id, content: id, updatedAt: '2026-09-01T10:00:00.000Z', ...extra })

beforeEach(() => {
  calls.length = 0
  upsertError = null
  upsertDelayMs = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Cloud sync queue', () => {
  it('uploads only tabs changed since their last sync and marks them synced', async () => {
    const tabs = [tab('a'), tab('b', { syncedAt: '2026-09-01T10:00:00.000Z', syncedPosition: 1 })]
    await syncTabsToCloud(tabs, 'user-1')
    expect(calls).toEqual([{ op: 'upsert', table: 'user_tabs', ids: ['a'], onConflict: 'user_id,id' }])
    expect(tabs[0].syncedAt).toBe('2026-09-01T10:00:00.000Z')
    expect(tabs[0].syncedPosition).toBe(0)

    calls.length = 0
    await syncTabsToCloud(tabs, 'user-1')
    expect(calls).toEqual([])
  })

  it('keeps tabs pending when the upload fails', async () => {
    upsertError = { message: 'network down' }
    const tabs = [tab('a')]
    await syncTabsToCloud(tabs, 'user-1')
    expect(tabs[0].syncedAt).toBeUndefined()
  })

  it('falls back to the old conflict key before the migration is applied', async () => {
    upsertError = (options) =>
      options.onConflict === 'user_id,id' ? { code: '42P10', message: 'no constraint' } : null
    const tabs = [tab('a')]
    await syncTabsToCloud(tabs, 'user-1')
    expect(calls.map((c) => c.onConflict)).toEqual(['user_id,id', 'id'])
    expect(tabs[0].syncedAt).toBeDefined()
  })

  it('sends the latest tabs when a throttled sync fires, so a closed tab is not re-uploaded', async () => {
    vi.useFakeTimers()
    let tabs = [tab('keep'), tab('closed')]
    const getTabs = () => tabs

    // First call runs right away; the second is throttled for 2 seconds
    throttledSyncTabsToCloud(getTabs, 'user-1')
    await vi.advanceTimersByTimeAsync(0)
    tabs.forEach((t) => (t.updatedAt = '2026-09-01T11:00:00.000Z'))
    throttledSyncTabsToCloud(getTabs, 'user-1')

    // The user closes a tab before the throttled sync fires
    tabs = tabs.filter((t) => t.id !== 'closed')
    deleteCloudTab('closed', 'user-1')

    await vi.advanceTimersByTimeAsync(2500)
    await flushPendingSync()

    const uploadsAfterDelete = calls.slice(calls.findIndex((c) => c.op === 'delete') + 1)
    expect(uploadsAfterDelete.flatMap((c) => c.ids || [])).not.toContain('closed')
  })

  it('uses the most recent arguments when several syncs are throttled together', async () => {
    vi.useFakeTimers()
    throttledSyncTabsToCloud([tab('first')], 'user-1')
    await vi.advanceTimersByTimeAsync(0)
    calls.length = 0

    // Two calls inside the throttle window: only the second array should be sent
    throttledSyncTabsToCloud([tab('stale'), tab('closed')], 'user-1')
    throttledSyncTabsToCloud([tab('stale')], 'user-1')
    await vi.advanceTimersByTimeAsync(2500)
    await flushPendingSync()

    expect(calls.flatMap((c) => c.ids)).toEqual(['stale'])
  })

  it('runs a delete after an upload that is already in flight', async () => {
    upsertDelayMs = 20
    const pending = syncTabsToCloud([tab('x')], 'user-1')
    const deleted = deleteCloudTab('x', 'user-1')
    await Promise.all([pending, deleted])
    expect(calls.map((c) => c.op)).toEqual(['upsert', 'delete'])
  })
})
