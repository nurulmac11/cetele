import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// Subscribe to auth state changes
export function subscribeToAuth(callback) {
  if (!isSupabaseConfigured || !supabase) return () => {}

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, session, event)
  })

  return () => {
    subscription?.unsubscribe()
  }
}

// Get current session user
export async function getSessionUser() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user || null
  } catch (e) {
    console.error('Error fetching Supabase session:', e)
    return null
  }
}

// Sign In with Google OAuth
export async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase project URL and Key are not configured in environment variables.')
  }
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
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// --- Active Tabs Cloud Sync ---

let tabSyncThrottleTimer = null
let tabSyncPending = false
let lastTabSyncTime = 0
const CLOUD_SYNC_MIN_INTERVAL = 2000 // Max 1 cloud sync request per 2 seconds

export async function syncTabsToCloud(tabs, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !Array.isArray(tabs)) return

  try {
    const formattedRows = tabs.map((t, idx) => ({
      id: t.id,
      user_id: userId,
      title: t.title || `Tab ${idx + 1}`,
      content: t.content || '',
      position: idx,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('user_tabs')
      .upsert(formattedRows, { onConflict: 'id' })

    if (error) {
      console.warn('Supabase tabs sync warning:', error.message)
    }
  } catch (err) {
    console.error('Failed to sync tabs to cloud:', err)
  }
}

export function throttledSyncTabsToCloud(tabs, userId) {
  const now = Date.now()
  const elapsed = now - lastTabSyncTime

  if (elapsed >= CLOUD_SYNC_MIN_INTERVAL) {
    lastTabSyncTime = now
    tabSyncPending = false
    clearTimeout(tabSyncThrottleTimer)
    syncTabsToCloud(tabs, userId)
  } else if (!tabSyncPending) {
    tabSyncPending = true
    const remaining = CLOUD_SYNC_MIN_INTERVAL - elapsed
    clearTimeout(tabSyncThrottleTimer)
    tabSyncThrottleTimer = setTimeout(() => {
      lastTabSyncTime = Date.now()
      tabSyncPending = false
      syncTabsToCloud(tabs, userId)
    }, remaining)
  }
}

export async function deleteCloudTab(tabId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !tabId) return

  try {
    const { error } = await supabase
      .from('user_tabs')
      .delete()
      .eq('id', tabId)
      .eq('user_id', userId)

    if (error) {
      console.warn('Error deleting cloud tab:', error.message)
    }
  } catch (err) {
    console.error('Failed to delete cloud tab:', err)
  }
}

export async function fetchCloudTabs(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const { data, error } = await supabase
      .from('user_tabs')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (error) {
      console.warn('Error fetching cloud tabs:', error.message)
      return null
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        position: r.position,
        isActive: false
      }))
    }
    return null
  } catch (err) {
    console.error('Failed to fetch cloud tabs:', err)
    return null
  }
}

// --- Saved Tabs Library Cloud Sync ---

let libSyncThrottleTimer = null
let libSyncPending = false
let lastLibSyncTime = 0

export async function syncLibraryToCloud(library, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !Array.isArray(library)) return

  try {
    const formattedRows = library.map((item) => ({
      id: String(item.id),
      user_id: userId,
      title: item.title || 'Untitled',
      content: item.content || '',
      saved_at: item.savedAt || new Date().toISOString()
    }))

    const { error } = await supabase
      .from('saved_library')
      .upsert(formattedRows, { onConflict: 'id' })

    if (error) {
      console.warn('Supabase library sync warning:', error.message)
    }
  } catch (err) {
    console.error('Failed to sync library to cloud:', err)
  }
}

export function throttledSyncLibraryToCloud(library, userId) {
  const now = Date.now()
  const elapsed = now - lastLibSyncTime

  if (elapsed >= CLOUD_SYNC_MIN_INTERVAL) {
    lastLibSyncTime = now
    libSyncPending = false
    clearTimeout(libSyncThrottleTimer)
    syncLibraryToCloud(library, userId)
  } else if (!libSyncPending) {
    libSyncPending = true
    const remaining = CLOUD_SYNC_MIN_INTERVAL - elapsed
    clearTimeout(libSyncThrottleTimer)
    libSyncThrottleTimer = setTimeout(() => {
      lastLibSyncTime = Date.now()
      libSyncPending = false
      syncLibraryToCloud(library, userId)
    }, remaining)
  }
}

export async function deleteCloudLibraryItem(itemId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !itemId) return

  try {
    const { error } = await supabase
      .from('saved_library')
      .delete()
      .eq('id', String(itemId))
      .eq('user_id', userId)

    if (error) {
      console.warn('Error deleting cloud library item:', error.message)
    }
  } catch (err) {
    console.error('Failed to delete cloud library item:', err)
  }
}

export async function fetchCloudLibrary(userId) {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
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
      return data.map(r => ({
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
