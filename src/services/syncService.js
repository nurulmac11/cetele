import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// Subscribe to auth state changes
export function subscribeToAuth(callback) {
  if (!isSupabaseConfigured || !supabase) return () => {}

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, session)
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

// Sync local tabs to Supabase table 'user_tabs'
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

// Delete a single tab from Supabase cloud
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

// Fetch cloud tabs for logged-in user
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
