const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

export function checkIsSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL || ''
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
  return Boolean(url && key)
}

export const isSupabaseConfigured = checkIsSupabaseConfigured()

let clientPromise = null

// The Supabase SDK (~210 KB) is loaded on first use, so it stays out of the initial bundle.
// Resolves to null when Supabase isn't configured.
export function getSupabase() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(supabaseUrl, supabaseAnonKey))
      .catch((err) => {
        // Allow a retry later (e.g. the chunk failed to load while offline)
        clientPromise = null
        throw err
      })
  }
  return clientPromise
}
