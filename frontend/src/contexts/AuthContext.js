import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { supabase, isSupabaseConfigured, getStoredSession } from '../supabase/supabaseClient'
import { getRolePrefix } from '../utils/rolePrefix'
import { authAPI } from '../utils/api'
import { setAuthToken, getAuthToken, clearAuthToken } from '../utils/cookies'

const AuthContext = createContext(null)

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

  // Fetch admin profile from backend API
  const fetchAdminProfile = useCallback(async () => {
    try {
      const response = await authAPI.getMe()
      return response.admin || null
    } catch (err) {
      console.warn('Error fetching admin profile from API:', err)
      // If error message indicates force logout, throw a specific error
      if (err.message?.includes('revoked') || err.message?.includes('session has been revoked')) {
        throw new Error('FORCE_LOGOUT')
      }
      return null
    }
  }, [])

  // Initialize auth state by reading directly from localStorage (fast, never hangs)
  // then verify with the backend API
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('⚠️ Supabase not configured — skipping auth initialization.')
      setLoading(false)
      return
    }

    let isMounted = true

    const initAuth = async () => {
      try {
        // First check cookie (primary source)
        const cookieToken = getAuthToken()

        // Also check localStorage as fallback (for migration)
        const storedSession = getStoredSession()
        const localStorageToken = storedSession?.access_token

        // Use cookie token if available, otherwise fallback to localStorage
        const token = cookieToken || localStorageToken

        if (token) {
          // If we have localStorage token but no cookie, migrate it to cookie
          if (localStorageToken && !cookieToken) {
            setAuthToken(localStorageToken)
          }

          // Create a session object from the token for Supabase compatibility
          const sessionObj = storedSession || { access_token: token }

          // Verify token with the backend
          setSession(sessionObj)
          try {
            const profile = await fetchAdminProfile()
            if (!isMounted) return

            if (profile) {
              setAdminProfile(profile)
            } else {
              // Token is invalid or user is not an admin — clear everything
              setSession(null)
              setAdminProfile(null)
              clearAuthToken()
              // Clean up the invalid session from Supabase storage
              if (supabase) {
                supabase.auth.signOut().catch(() => {})
              }
            }
          } catch (profileError) {
            if (!isMounted) return
            // Force logout detected
            if (profileError.message === 'FORCE_LOGOUT') {
              setSession(null)
              setAdminProfile(null)
              clearAuthToken()
              // Clean up the invalid session from Supabase storage
              if (supabase) {
                supabase.auth.signOut().catch(() => {})
              }
              // Redirect will happen via ProtectedRoute when isAuthenticated becomes false
            } else {
              // Other error - clear session
              setSession(null)
              setAdminProfile(null)
              clearAuthToken()
              if (supabase) {
                supabase.auth.signOut().catch(() => {})
              }
            }
          }
        }
        // If no token, user needs to log in (loading will just stop)
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes (login, logout, token refresh)
    // This handles events AFTER the initial load
    let subscription = null
    if (supabase) {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!isMounted) return

        // Skip initial session — we already handled it above via localStorage
        if (event === 'INITIAL_SESSION') return

        // Token refreshed — update session and cookie silently
        if (event === 'TOKEN_REFRESHED') {
          setSession(newSession)
          if (newSession?.access_token) {
            setAuthToken(newSession.access_token)
          }
          return
        }

        // Explicit sign in (from login form)
        if (event === 'SIGNED_IN') {
          setSession(newSession)
          if (newSession?.access_token) {
            setAuthToken(newSession.access_token)
          }
          return
        }

        // Sign out
        if (event === 'SIGNED_OUT') {
          clearAuthToken()
          setSession(null)
          setAdminProfile(null)
          return
        }
      })
      subscription = sub
    }

    return () => {
      isMounted = false
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

      // Set session first
      setSession(data.session)

      // Store token in cookie for future requests
      if (data.session?.access_token) {
        setAuthToken(data.session.access_token)
      }

      // Verify admin status via backend API
      const profile = await fetchAdminProfile()
      if (!profile) {
        await supabase.auth.signOut()
        setSession(null)
        clearAuthToken()
        const msg = 'Access denied. You are not authorized as an admin.'
        setError(msg)
        return { success: false, error: msg }
      }

      setAdminProfile(profile)

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
      // Clear cookie
      clearAuthToken()
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

  // Refresh admin profile (useful after updates)
  const refreshProfile = useCallback(async () => {
    const profile = await fetchAdminProfile()
    if (profile) {
      setAdminProfile(profile)
    } else {
      // Profile fetch failed - might be force logged out
      // Clear session and log out
      setSession(null)
      setAdminProfile(null)
      clearAuthToken()
      if (supabase) {
        await supabase.auth.signOut().catch(() => {})
      }
    }
    return profile
  }, [fetchAdminProfile])

  // Periodically check if user has been force logged out
  useEffect(() => {
    if (!session || !adminProfile) return

    const checkForceLogout = async () => {
      try {
        const profile = await fetchAdminProfile()
        if (!profile) {
          // Force logged out or session invalid - clear everything and redirect
          setSession(null)
          setAdminProfile(null)
          clearAuthToken()
          if (supabase) {
            await supabase.auth.signOut().catch(() => {})
          }
          // Redirect will happen via ProtectedRoute
          window.location.href = '/login'
        }
      } catch (err) {
        // If error indicates force logout, clear session and redirect
        if (err.message === 'FORCE_LOGOUT' || err.message?.includes('revoked') || err.message?.includes('session has been revoked')) {
          setSession(null)
          setAdminProfile(null)
          clearAuthToken()
          if (supabase) {
            await supabase.auth.signOut().catch(() => {})
          }
          // Force redirect to login page
          window.location.href = '/login'
        }
      }
    }

    // Check every 30 seconds if user is still valid
    const interval = setInterval(checkForceLogout, 30000)

    return () => clearInterval(interval)
  }, [session, adminProfile, fetchAdminProfile])

  const value = {
    session,
    adminProfile,
    loading,
    error,
    login,
    logout,
    hasRole,
    rolePrefix,
    refreshProfile,
    isAuthenticated: !!session && !!adminProfile,
    isSupabaseConfigured,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AuthContext
