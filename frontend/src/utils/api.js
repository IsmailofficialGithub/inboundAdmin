/**
 * API helper for backend calls
 * All requests go through the Express backend, not directly to Supabase
 */

import toast from 'react-hot-toast'
import { getAuthToken, clearAuthToken } from './cookies'

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
    
    // Handle force logout - redirect immediately without toast
    if (response.status === 401 && (errorMessage.includes('revoked') || errorMessage.includes('session has been revoked'))) {
      // Clear auth token and redirect to login
      clearAuthToken()
      // Force redirect to login page
      window.location.href = '/login'
      throw new Error('FORCE_LOGOUT')
    }
    
    // Show toast for other client errors (4xx) and server errors (5xx)
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

// ========================
// VOICE AGENTS
// ========================
export const voiceAgentsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/voice-agents?${query}`)
  },
  getById: (id) => apiRequest(`/voice-agents/${id}`),
  update: (id, data) =>
    apiRequest(`/voice-agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/voice-agents/${id}`, {
      method: 'DELETE',
    }),
  activate: (id) =>
    apiRequest(`/voice-agents/${id}/activate`, {
      method: 'PATCH',
    }),
  deactivate: (id) =>
    apiRequest(`/voice-agents/${id}/deactivate`, {
      method: 'PATCH',
    }),
}

// ========================
// CALLS
// ========================
export const callsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/calls?${query}`)
  },
  getById: (id) => apiRequest(`/calls/${id}`),
  getRecordings: (id) => apiRequest(`/calls/${id}/recordings`),
}

// ========================
// CREDITS
// ========================
export const creditsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/credits?${query}`)
  },
  getTransactions: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/credits/transactions?${query}`)
  },
  getTransactionById: (id) => apiRequest(`/credits/transactions/${id}`),
  adjust: (data) =>
    apiRequest('/credits/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// ========================
// SUBSCRIPTIONS
// ========================
export const packagesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/packages?${query}`)
  },
  getById: (id) => apiRequest(`/packages/${id}`),
  create: (packageData) =>
    apiRequest('/packages', {
      method: 'POST',
      body: JSON.stringify(packageData),
    }),
  update: (id, packageData) =>
    apiRequest(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(packageData),
    }),
  delete: (id) =>
    apiRequest(`/packages/${id}`, {
      method: 'DELETE',
    }),
  upsertFeature: (id, featureData) =>
    apiRequest(`/packages/${id}/features`, {
      method: 'POST',
      body: JSON.stringify(featureData),
    }),
  deleteFeature: (id, featureKey) =>
    apiRequest(`/packages/${id}/features/${featureKey}`, {
      method: 'DELETE',
    }),
  upsertVariable: (id, variableData) =>
    apiRequest(`/packages/${id}/variables`, {
      method: 'POST',
      body: JSON.stringify(variableData),
    }),
  deleteVariable: (id, variableKey) =>
    apiRequest(`/packages/${id}/variables/${variableKey}`, {
      method: 'DELETE',
    }),
}

export const subscriptionsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/subscriptions?${query}`)
  },
  getById: (id) => apiRequest(`/subscriptions/${id}`),
  update: (id, data) =>
    apiRequest(`/subscriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getPackages: () => apiRequest('/subscriptions/packages'),
  createPackage: (data) =>
    apiRequest('/subscriptions/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePackage: (id, data) =>
    apiRequest(`/subscriptions/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePackage: (id) =>
    apiRequest(`/subscriptions/packages/${id}`, {
      method: 'DELETE',
    }),
}

// ========================
// INBOUND NUMBERS
// ========================
export const inboundNumbersAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/inbound-numbers?${query}`)
  },
  getById: (id) => apiRequest(`/inbound-numbers/${id}`),
  verifyConnection: (credentials) =>
    apiRequest('/inbound-numbers/verify-connection', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  create: (numberData) =>
    apiRequest('/inbound-numbers', {
      method: 'POST',
      body: JSON.stringify(numberData),
    }),
  update: (id, data) =>
    apiRequest(`/inbound-numbers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  assign: (id, agentId) =>
    apiRequest(`/inbound-numbers/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId }),
    }),
}

// ========================
// SUPPORT TICKETS
// ========================
export const supportAPI = {
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/support/tickets?${query}`)
  },
  getTicketById: (id) => apiRequest(`/support/tickets/${id}`),
  createTicket: (ticketData) =>
    apiRequest('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }),
  updateTicket: (id, ticketData) =>
    apiRequest(`/support/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    }),
  addNote: (id, noteData) =>
    apiRequest(`/support/tickets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData),
    }),
  deleteTicket: (id) =>
    apiRequest(`/support/tickets/${id}`, {
      method: 'DELETE',
    }),
}

// ========================
// FEATURE FLAGS
// ========================
export const featureFlagsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/feature-flags?${query}`)
  },
  getById: (id) => apiRequest(`/feature-flags/${id}`),
  create: (data) =>
    apiRequest('/feature-flags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/feature-flags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    apiRequest(`/feature-flags/${id}`, {
      method: 'DELETE',
    }),
}

// ========================
// SYSTEM SETTINGS
// ========================
export const systemSettingsAPI = {
  list: () => apiRequest('/system-settings'),
  getByKey: (key) => apiRequest(`/system-settings/${key}`),
  update: (key, data) =>
    apiRequest(`/system-settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getMaintenanceStatus: () => apiRequest('/system-settings/maintenance/status'),
  getReadOnlyStatus: () => apiRequest('/system-settings/read-only/status'),
}

// ========================
// KYC MODERATION
// ========================
export const kycAPI = {
  getPending: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/kyc/pending?${query}`)
  },
  getUserDetails: (id) => apiRequest(`/kyc/users/${id}`),
  approve: (id, data = {}) =>
    apiRequest(`/kyc/users/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reject: (id, data) =>
    apiRequest(`/kyc/users/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  requestInfo: (id, data) =>
    apiRequest(`/kyc/users/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiRequest(`/kyc/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// ========================
// INVOICES & BILLING
// ========================
export const invoicesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/invoices?${query}`)
  },
  getById: (id) => apiRequest(`/invoices/${id}`),
  create: (invoiceData) =>
    apiRequest('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    }),
  update: (id, invoiceData) =>
    apiRequest(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    }),
  delete: (id) =>
    apiRequest(`/invoices/${id}`, {
      method: 'DELETE',
    }),
  download: (id) => {
    const token = getAuthToken()
    return fetch(`${API_BASE}/invoices/${id}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Download failed')
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoice_${id}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
    })
  },
  sendEmail: (id) =>
    apiRequest(`/invoices/${id}/send-email`, {
      method: 'POST',
    }),
  processEmails: () =>
    apiRequest('/invoices/process-emails', {
      method: 'POST',
    }),
}

export const invoiceSettingsAPI = {
  get: () => apiRequest('/invoice-settings'),
  update: (settingsData) =>
    apiRequest('/invoice-settings', {
      method: 'PUT',
      body: JSON.stringify(settingsData),
    }),
}

export const paymentsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/payments?${query}`)
  },
  getById: (id) => apiRequest(`/payments/${id}`),
  create: (paymentData) =>
    apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),
  update: (id, paymentData) =>
    apiRequest(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    }),
}

export const refundsDisputesAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/refunds-disputes?${query}`)
  },
  getById: (id) => apiRequest(`/refunds-disputes/${id}`),
  create: (refundDisputeData) =>
    apiRequest('/refunds-disputes', {
      method: 'POST',
      body: JSON.stringify(refundDisputeData),
    }),
  update: (id, refundDisputeData) =>
    apiRequest(`/refunds-disputes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(refundDisputeData),
    }),
}

export const couponsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/coupons?${query}`)
  },
  getById: (id) => apiRequest(`/coupons/${id}`),
  getUsage: (id, params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/coupons/${id}/usage?${query}`)
  },
  create: (couponData) =>
    apiRequest('/coupons', {
      method: 'POST',
      body: JSON.stringify(couponData),
    }),
  update: (id, couponData) =>
    apiRequest(`/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(couponData),
    }),
  delete: (id) =>
    apiRequest(`/coupons/${id}`, {
      method: 'DELETE',
    }),
}

export const invoiceEmailLogsAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/invoice-email-logs?${query}`)
  },
  getById: (id) => apiRequest(`/invoice-email-logs/${id}`),
}

// ========================
// REPORTS & EXPORTS
// ========================
export const reportsAPI = {
  getRevenueReport: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/reports/revenue?${query}`)
  },
  getUsageReport: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/reports/usage?${query}`)
  },
  getAgentPerformanceReport: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/reports/agent-performance?${query}`)
  },
  getProviderPerformanceReport: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/reports/provider-performance?${query}`)
  },
  exportUsers: (params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString()
    const token = getAuthToken()
    return fetch(`${API_BASE}/reports/export/users?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Export failed')
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
    })
  },
  exportSubscriptions: (params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString()
    const token = getAuthToken()
    return fetch(`${API_BASE}/reports/export/subscriptions?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Export failed')
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `subscriptions_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
    })
  },
  exportInvoices: (params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString()
    const token = getAuthToken()
    return fetch(`${API_BASE}/reports/export/invoices?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Export failed')
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
    })
  },
  exportCallLogs: (params = {}) => {
    const query = new URLSearchParams({ ...params, format: 'csv' }).toString()
    const token = getAuthToken()
    return fetch(`${API_BASE}/reports/export/call-logs?${query}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((res) => {
      if (!res.ok) throw new Error('Export failed')
      return res.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `call_logs_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      })
    })
  },
}

export default apiRequest
