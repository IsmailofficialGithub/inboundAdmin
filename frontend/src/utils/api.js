/**
 * API helper for backend calls
 * All requests go through the Express backend, not directly to Supabase
 */

import toast from 'react-hot-toast'
import { getAuthToken } from './cookies'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/**
 * Make an authenticated API request
 */
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken()

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    const errorMessage = data.error || `Request failed with status ${response.status}`
    // Show toast for client errors (4xx) and server errors (5xx)
    if (response.status >= 400) {
      toast.error(errorMessage)
    }
    throw new Error(errorMessage)
  }

  return data
}

// ========================
// AUTH
// ========================
export const authAPI = {
  getMe: () => apiRequest('/auth/me'),
  updateProfile: (profileData) =>
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),
  getSessions: () => apiRequest('/auth/sessions'),
  forceLogout: (adminId) =>
    apiRequest(`/auth/force-logout/${adminId}`, {
      method: 'POST',
    }),
}

// ========================
// USERS
// ========================
export const usersAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/users?${query}`)
  },

  getById: (id) => apiRequest(`/users/${id}`),

  create: (userData) =>
    apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  update: (id, userData) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  suspend: (id, reason) =>
    apiRequest(`/users/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  unsuspend: (id) =>
    apiRequest(`/users/${id}/unsuspend`, {
      method: 'PATCH',
    }),

  resetEmailVerification: (id) =>
    apiRequest(`/users/${id}/reset-email-verification`, {
      method: 'PATCH',
    }),

  resetPassword: (id) =>
    apiRequest(`/users/${id}/reset-password`, {
      method: 'PATCH',
    }),

  delete: (id) =>
    apiRequest(`/users/${id}`, {
      method: 'DELETE',
    }),
}

// ========================
// ADMIN
// ========================
export const adminAPI = {
  getDashboard: () => apiRequest('/admin/dashboard'),
  getActivityLog: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/activity-log?${query}`)
  },
  getSecurityEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/security-events?${query}`)
  },
  getAdmins: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/admin/admins?${query}`)
  },
  createAdmin: (adminData) =>
    apiRequest('/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify(adminData),
    }),
  resetAdminPassword: (adminId, passwordData) =>
    apiRequest(`/admin/reset-password/${adminId}`, {
      method: 'PATCH',
      body: JSON.stringify(passwordData),
    }),
}

export default apiRequest
