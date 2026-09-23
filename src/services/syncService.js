import { getSupabase, isSupabaseConfigured } from './supabaseClient.js'
import { saveLocalTabs } from './localDb.js'

// Subscribe to auth state changes
export function subscribeToAuth(callback) {
  if (!isSupabaseConfigured) return () => {}

  let subscription = null
  let unsubscribed = false
  getSupabase()
    .then((client) => {
      if (unsubscribed || !client) return
      subscription = client.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, session, event)
      }).data.subscription
    })
    .catch((err) => console.error('Could not load Supabase:', err))

  return () => {
    unsubscribed = true
    subscription?.unsubscribe()
  }
}

// Get current session user
export async function getSessionUser() {
  if (!isSupabaseConfigured) return null
  try {
    const supabase = await getSupabase()
    const {
      data: { session }
    } = await supabase.auth.getSession()
    return session?.user || null
  } catch (e) {
    console.error('Error fetching Supabase session:', e)
    return null
  }
}

// Sign In with Google OAuth
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase project URL and Key are not configured in environment variables.')
  }
  const supabase = await getSupabase()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
    }
  })
  if (error) throw error
  return data
}

// Sign Out
export async function signOut() {
  if (!isSupabaseConfigured) return
  // Push unsynced edits while the session is still valid; the app resets local tabs after sign-out
  await flushPendingSync()
  const supabase = await getSupabase()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  tabSync.cancel()
  librarySync.cancel()
}

// --- Write Queue & Throttling ---

const CLOUD_SYNC_MIN_INTERVAL = 2000 // Max 1 cloud sync request per 2 seconds

// Cloud writes run one at a time, so a delete can't race an upsert that is already in flight
let cloudQueue = Promise.resolve()

function enqueue(task) {
  const run = cloudQueue.then(task, task)
  cloudQueue = run.catch(() => {})
  return run
}

// Throttle that always sends the most recent arguments when the timer fires
function createThrottle(fn) {
  let timer = null
  let lastRun = 0
  let latestArgs = null

  function flush() {
    clearTimeout(timer)
    timer = null
    if (!latestArgs) return cloudQueue
    const args = latestArgs
    latestArgs = null
    lastRun = Date.now()
    return fn(...args)
  }

  function schedule(...args) {
    latestArgs = args
    if (timer) return
    const wait = Math.max(0, CLOUD_SYNC_MIN_INTERVAL - (Date.now() - lastRun))
    timer = setTimeout(flush, wait)
  }

  function cancel() {
    clearTimeout(timer)
    timer = null
    latestArgs = null
  }

  return { schedule, flush, cancel }
}

function resolveList(listOrGetter) {
  const list = typeof listOrGetter === 'function' ? listOrGetter() : listOrGetter
  return Array.isArray(list) ? list : []
}

// Postgres error for an ON CONFLICT target with no matching unique constraint
const NO_MATCHING_CONSTRAINT = '42P10'

// Upserts on (user_id, id). Databases that haven't run the per-user-ids migration only have a
// primary key on id, so fall back to that until the migration is applied.
async function upsertOwnRows(table, rows) {
  const supabase = await getSupabase()
  const result = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' })
  if (result.error?.code === NO_MATCHING_CONSTRAINT) {
    return supabase.from(table).upsert(rows, { onConflict: 'id' })
  }
  return result
}

function toMs(value) {
  if (!value) return 0
  const ms = typeof value === 'number' ? value : Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

// --- Active Tabs Cloud Sync ---

// A tab has unsynced edits when it was never uploaded or was edited after its last upload
export function hasUnsyncedEdits(tab) {
  return !tab.syncedAt || toMs(tab.updatedAt) > toMs(tab.syncedAt)
}

function needsUpload(tab, idx) {
  return hasUnsyncedEdits(tab) || tab.syncedPosition !== idx
}

// Accepts the tabs array or a getter returning it; a getter is read when the write actually runs
export function syncTabsToCloud(tabs, userId) {
  if (!isSupabaseConfigured || !userId) return Promise.resolve()

  return enqueue(async () => {
    const list = resolveList(tabs)
    const pending = list.map((tab, idx) => ({ tab, idx })).filter(({ tab, idx }) => needsUpload(tab, idx))
    if (pending.length === 0) return

    const rows = pending.map(({ tab, idx }) => ({
      id: tab.id,
      user_id: userId,
      title: tab.title || `Tab ${idx + 1}`,
      content: tab.content || '',
      position: idx,
      updated_at: tab.updatedAt || new Date().toISOString()
    }))

    try {
      const { error } = await upsertOwnRows('user_tabs', rows)

      if (error) {
        console.warn('Supabase tabs sync warning:', error.message)
        return
      }
      // Mark with the timestamp that was sent: edits made during the request stay pending
      pending.forEach(({ tab }, i) => {
        tab.syncedAt = rows[i].updated_at
        tab.syncedPosition = rows[i].position
      })
      // Persist the sync markers so a reload still knows which tabs the cloud has
      await saveLocalTabs(list)
    } catch (err) {
      console.error('Failed to sync tabs to cloud:', err)
    }
  })
}

const tabSync = createThrottle(syncTabsToCloud)

export function throttledSyncTabsToCloud(tabs, userId) {
  tabSync.schedule(tabs, userId)
}

export function deleteCloudTab(tabId, userId) {
  if (!isSupabaseConfigured || !userId || !tabId) return Promise.resolve()

  return enqueue(async () => {
    try {
      const supabase = await getSupabase()
      const { error } = await supabase.from('user_tabs').delete().eq('id', tabId).eq('user_id', userId)

      if (error) {
        console.warn('Error deleting cloud tab:', error.message)
      }
    } catch (err) {
      console.error('Failed to delete cloud tab:', err)
    }
  })
}

// Returns the user's cloud tabs ([] when there are none), or null when the fetch failed
export async function fetchCloudTabs(userId) {
  if (!isSupabaseConfigured || !userId) return null

  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('user_tabs')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) {
      console.warn('Error fetching cloud tabs:', error.message)
      return null
    }

    return (data || []).map((r) => {
      const updatedAt = new Date(r.updated_at).toISOString()
      return {
        id: r.id,
        title: r.title,
        content: r.content,
        position: r.position,
        isActive: false,
        updatedAt,
        syncedAt: updatedAt,
        syncedPosition: r.position
      }
    })
  } catch (err) {
    console.error('Failed to fetch cloud tabs:', err)
    return null
  }
}

// Combines local and cloud tabs instead of letting one side overwrite the other.
// - A tab in both places uses the cloud copy, unless the local copy has newer unsynced edits.
// - A local-only tab that was synced before was deleted on another device, so it is dropped
//   (unless it has unsynced edits).
// - A local-only tab that was never synced is kept, except throwaway tabs (isDisposable)
//   when the account already has tabs.
export function mergeCloudTabs(localTabs, cloudTabs, isDisposable = () => false) {
  const local = Array.isArray(localTabs) ? localTabs : []
  const cloud = Array.isArray(cloudTabs) ? cloudTabs : []
  if (cloud.length === 0) return [...local]

  const localById = new Map(local.map((t) => [t.id, t]))
  const merged = cloud.map((cloudTab) => {
    const localTab = localById.get(cloudTab.id)
    if (localTab && hasUnsyncedEdits(localTab) && toMs(localTab.updatedAt) > toMs(cloudTab.updatedAt)) {
      return localTab
    }
    return cloudTab
  })

  const cloudIds = new Set(cloud.map((t) => t.id))
  for (const localTab of local) {
    if (cloudIds.has(localTab.id)) continue
    if (!hasUnsyncedEdits(localTab)) continue
    if (!localTab.syncedAt && isDisposable(localTab)) continue
    merged.push(localTab)
  }
  return merged
}

// --- Saved Tabs Library Cloud Sync ---

export function syncLibraryToCloud(library, userId) {
  if (!isSupabaseConfigured || !userId) return Promise.resolve()

  return enqueue(async () => {
    const items = resolveList(library)
    if (items.length === 0) return

    const formattedRows = items.map((item) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title || 'Untitled',
      content: item.content || '',
      saved_at: item.savedAt || new Date().toISOString()
    }))

    try {
      const { error } = await upsertOwnRows('saved_library', formattedRows)

      if (error) {
        console.warn('Supabase library sync warning:', error.message)
      }
    } catch (err) {
      console.error('Failed to sync library to cloud:', err)
    }
  })
}

const librarySync = createThrottle(syncLibraryToCloud)

export function throttledSyncLibraryToCloud(library, userId) {
  librarySync.schedule(library, userId)
}

export function deleteCloudLibraryItem(itemId, userId) {
  if (!isSupabaseConfigured || !userId || !itemId) return Promise.resolve()

  return enqueue(async () => {
    try {
      const supabase = await getSupabase()
      const { error } = await supabase.from('saved_library').delete().eq('id', String(itemId)).eq('user_id', userId)

      if (error) {
        console.warn('Error deleting cloud library item:', error.message)
      }
    } catch (err) {
      console.error('Failed to delete cloud library item:', err)
    }
  })
}

export async function fetchCloudLibrary(userId) {
  if (!isSupabaseConfigured || !userId) return null

  try {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('saved_library')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })

    if (error) {
      console.warn('Error fetching cloud library:', error.message)
      return null
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        savedAt: r.saved_at
      }))
    }
    return null
  } catch (err) {
    console.error('Failed to fetch cloud library:', err)
    return null
  }
}

// Sends any throttled writes now and waits for every queued write to finish
export async function flushPendingSync() {
  tabSync.flush()
  librarySync.flush()
  await cloudQueue
}
