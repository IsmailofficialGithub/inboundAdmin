import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { supabase, isSupabaseConfigured } from '../supabase/supabaseClient'
import { getRolePrefix } from '../utils/rolePrefix'

const AuthContext = createContext(null)

const AUTH_TIMEOUT_MS = 5000 // 5 second timeout for auth initialization

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch admin profile from admin_profiles table
  const fetchAdminProfile = useCallback(async (userId) => {
    if (!supabase) return null
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (fetchError || !data) {
        return null
      }

      return data
    } catch (err) {
      console.error('Error fetching admin profile:', err)
      return null
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    // If Supabase is not configured, stop loading immediately
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Supabase not configured — skipping auth initialization.')
      setLoading(false)
      return
    }

    let isMounted = true
    let loadingResolved = false

    // Safety timeout — ensures loading always resolves even if Supabase hangs
    const timeout = setTimeout(() => {
      if (isMounted && !loadingResolved) {
        console.warn('⚠️ Auth initialization timed out. Supabase may be unreachable.')
        loadingResolved = true
        setLoading(false)
      }
    }, AUTH_TIMEOUT_MS)

    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (currentSession) {
          setSession(currentSession)
          const profile = await fetchAdminProfile(currentSession.user.id)
          if (!isMounted) return
          if (profile) {
            setAdminProfile(profile)
            // Update last_login_at
            await supabase
              .from('admin_profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', currentSession.user.id)
          } else {
            // Not an admin — sign them out
            await supabase.auth.signOut()
            setSession(null)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (isMounted && !loadingResolved) {
          loadingResolved = true
          setLoading(false)
          clearTimeout(timeout)
        }
      }
    }

    initAuth()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return
      setSession(newSession)
      if (newSession) {
        const profile = await fetchAdminProfile(newSession.user.id)
        if (isMounted) setAdminProfile(profile)
      } else {
        setAdminProfile(null)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [fetchAdminProfile])

  // Login
  const login = async (email, password) => {
    if (!supabase) {
      const msg = 'Supabase is not configured. Please update your .env file.'
      setError(msg)
      return { success: false, error: msg }
    }

    setError(null)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return { success: false, error: signInError.message }
      }

      // Check if user is an admin
      const profile = await fetchAdminProfile(data.user.id)
      if (!profile) {
        await supabase.auth.signOut()
        const msg = 'Access denied. You are not authorized as an admin.'
        setError(msg)
        return { success: false, error: msg }
      }

      setAdminProfile(profile)

      // Update last_login_at
      await supabase
        .from('admin_profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)

      // Log the login activity
      await supabase.from('admin_activity_log').insert({
        admin_id: data.user.id,
        action: 'admin_login',
        details: { email },
      })

      return { success: true, rolePrefix: getRolePrefix(profile.role) }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Logout
  const logout = async () => {
    try {
      if (supabase && adminProfile) {
        await supabase.from('admin_activity_log').insert({
          admin_id: adminProfile.id,
          action: 'admin_logout',
        })
      }
      if (supabase) {
        await supabase.auth.signOut()
      }
      setSession(null)
      setAdminProfile(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Check if admin has a specific role
  const hasRole = (requiredRoles) => {
    if (!adminProfile) return false
    if (adminProfile.role === 'super_admin') return true
    return requiredRoles.includes(adminProfile.role)
  }

  // Computed role prefix for URL routing
  const rolePrefix = adminProfile ? getRolePrefix(adminProfile.role) : null

  const value = {
    session,
    adminProfile,
    loading,
    error,
    login,
    logout,
    hasRole,
    rolePrefix,
    isAuthenticated: !!session && !!adminProfile,
    isSupabaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AuthContext
