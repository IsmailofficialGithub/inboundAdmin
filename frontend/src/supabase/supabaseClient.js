import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseUrl !== 'your_supabase_url_here' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://')

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase is not configured. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  )
}

// Extract the project ref from the URL for localStorage key
const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null
const storageKey = projectRef ? `sb-${projectRef}-auth-token` : null

/**
 * Read the stored session directly from localStorage.
 * This bypasses the Supabase client which can hang during token refresh.
 */
export const getStoredSession = () => {
  if (!storageKey) return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed || null
  } catch {
    return null
  }
}

/**
 * Get the access token directly from localStorage (fast, never hangs).
 */
export const getStoredAccessToken = () => {
  const session = getStoredSession()
  return session?.access_token || null
}

// Create the client even with invalid credentials (it won't crash),
// but callers should check isSupabaseConfigured before making API calls.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
