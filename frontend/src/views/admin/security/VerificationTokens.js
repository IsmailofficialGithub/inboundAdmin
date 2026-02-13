import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CFormInput,
  CFormSelect,
  CSpinner,
  CBadge,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilBan, cilEnvelopeOpen, cilPhone } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const VerificationTokens = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('email')
  const [emailTokens, setEmailTokens] = useState([])
  const [phoneTokens, setPhoneTokens] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Revoke modal
  const [revokeModal, setRevokeModal] = useState({ visible: false, token: null, type: 'email' })
  const [revokeLoading, setRevokeLoading] = useState(false)

  const fetchEmailTokens = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired') params.append('expired', 'true')
        else if (statusFilter === 'active') params.append('expired', 'false')
        if (statusFilter === 'used') params.append('used', 'true')
        else if (statusFilter === 'unused') params.append('used', 'false')
      }

      const response = await fetch(`${API_BASE}/verification-tokens/email?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Only show error for server errors or auth errors, not for empty data
        if (response.status >= 500) {
          toast.error(data.error || 'Server error. Please try again later.')
        } else if (response.status === 401 || response.status === 403) {
          toast.error('You do not have permission to view this page.')
        }
        setEmailTokens([])
        setTotalCount(0)
        return
      }

      setEmailTokens(data.tokens || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      // Only show toast for network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setEmailTokens([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  const fetchPhoneTokens = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (statusFilter !== 'all') {
        if (statusFilter === 'expired') params.append('expired', 'true')
        else if (statusFilter === 'active') params.append('expired', 'false')
        if (statusFilter === 'used') params.append('used', 'true')
        else if (statusFilter === 'unused') params.append('used', 'false')
      }

      const response = await fetch(`${API_BASE}/verification-tokens/phone?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        // Only show error for server errors or auth errors, not for empty data
        if (response.status >= 500) {
          toast.error(data.error || 'Server error. Please try again later.')
        } else if (response.status === 401 || response.status === 403) {
          toast.error('You do not have permission to view this page.')
        }
        setPhoneTokens([])
        setTotalCount(0)
        return
      }

      setPhoneTokens(data.tokens || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      // Only show toast for network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setPhoneTokens([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  useEffect(() => {
    if (activeTab === 'email') {
      fetchEmailTokens()
    } else {
      fetchPhoneTokens()
    }
  }, [activeTab, fetchEmailTokens, fetchPhoneTokens])

  const handleRevoke = async () => {
    setRevokeLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/verification-tokens/${revokeModal.token.id}/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: revokeModal.type }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to revoke token')

      toast.success('Token revoked successfully')
      setRevokeModal({ visible: false, token: null, type: 'email' })
      if (activeTab === 'email') {
        fetchEmailTokens()
      } else {
        fetchPhoneTokens()
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRevokeLoading(false)
    }
  }

  const getTokenStatus = (token) => {
    const now = new Date()
    const expiresAt = new Date(token.expires_at)
    const isExpired = expiresAt < now
    const isUsed = token.used_at !== null

    if (isUsed) return { badge: <CBadge color="secondary">Used</CBadge>, status: 'used' }
    if (isExpired) return { badge: <CBadge color="warning">Expired</CBadge>, status: 'expired' }
    return { badge: <CBadge color="success">Active</CBadge>, status: 'active' }
  }

  const formatPhoneNumber = (countryCode, phoneNumber) => {
    if (!phoneNumber) return 'N/A'
    
    // If phone number already starts with +, it includes country code
    if (phoneNumber.startsWith('+')) {
      return phoneNumber
    }
    
    // If phone number starts with country code (without +), add +
    if (countryCode && phoneNumber.startsWith(countryCode.replace('+', ''))) {
      return `+${phoneNumber}`
    }
    
    // Otherwise, combine country code and phone number
    return countryCode ? `${countryCode}${phoneNumber}` : phoneNumber
  }

  const tokens = activeTab === 'email' ? emailTokens : phoneTokens
  const filteredTokens = tokens.filter((t) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (t.user_email && t.user_email.toLowerCase().includes(search)) ||
      (t.email && t.email.toLowerCase().includes(search)) ||
      (t.phone_number && t.phone_number.includes(search))
    )
  })

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Verification Tokens</strong>
            </CCardHeader>
            <CCardBody>
              <CNav variant="tabs">
                <CNavItem>
                  <CNavLink active={activeTab === 'email'} onClick={() => setActiveTab('email')}>
                    <CIcon icon={cilEnvelopeOpen} className="me-2" />
                    Email Tokens
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink active={activeTab === 'phone'} onClick={() => setActiveTab('phone')}>
                    <CIcon icon={cilPhone} className="me-2" />
                    Phone Tokens
                  </CNavLink>
                </CNavItem>
              </CNav>

              <CTabContent className="mt-3">
                <CTabPane visible={activeTab === 'email'}>
                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CInputGroup>
                        <CInputGroupText>
                          <CIcon icon={cilSearch} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="Search by email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </CInputGroup>
                    </CCol>
                    <CCol md={3}>
                      <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="used">Used</option>
                        <option value="unused">Unused</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>User Email</CTableHeaderCell>
                        <CTableHeaderCell>Token Email</CTableHeaderCell>
                        <CTableHeaderCell>Purpose</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Expires</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredTokens.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center">
                            No email tokens found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        filteredTokens.map((token) => {
                          const status = getTokenStatus(token)
                          return (
                            <CTableRow key={token.id}>
                              <CTableDataCell>{token.user_email || 'N/A'}</CTableDataCell>
                              <CTableDataCell>{token.email}</CTableDataCell>
                              <CTableDataCell>{token.purpose || '-'}</CTableDataCell>
                              <CTableDataCell>{status.badge}</CTableDataCell>
                              <CTableDataCell>
                                {new Date(token.expires_at).toLocaleString()}
                              </CTableDataCell>
                              <CTableDataCell>
                                {status.status === 'active' && adminProfile?.role === 'super_admin' ? (
                                  <CButton
                                    color="danger"
                                    size="sm"
                                    onClick={() => setRevokeModal({ visible: true, token, type: 'email' })}
                                  >
                                    <CIcon icon={cilBan} className="me-1" />
                                    Revoke
                                  </CButton>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 'phone'}>
                  <CRow className="mb-3">
                    <CCol md={6}>
                      <CInputGroup>
                        <CInputGroupText>
                          <CIcon icon={cilSearch} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="Search by phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </CInputGroup>
                    </CCol>
                    <CCol md={3}>
                      <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="used">Used</option>
                        <option value="unused">Unused</option>
                      </CFormSelect>
                    </CCol>
                  </CRow>

                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>User Email</CTableHeaderCell>
                        <CTableHeaderCell>Phone Number</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Expires</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {filteredTokens.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={5} className="text-center">
                            No phone tokens found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        filteredTokens.map((token) => {
                          const status = getTokenStatus(token)
                          return (
                            <CTableRow key={token.id}>
                              <CTableDataCell>{token.user_email || 'N/A'}</CTableDataCell>
                              <CTableDataCell>
                                {formatPhoneNumber(token.country_code, token.phone_number)}
                              </CTableDataCell>
                              <CTableDataCell>{status.badge}</CTableDataCell>
                              <CTableDataCell>
                                {new Date(token.expires_at).toLocaleString()}
                              </CTableDataCell>
                              <CTableDataCell>
                                {status.status === 'active' && adminProfile?.role === 'super_admin' ? (
                                  <CButton
                                    color="danger"
                                    size="sm"
                                    onClick={() => setRevokeModal({ visible: true, token, type: 'phone' })}
                                  >
                                    <CIcon icon={cilBan} className="me-1" />
                                    Revoke
                                  </CButton>
                                ) : (
                                  <span className="text-muted">-</span>
                                )}
                              </CTableDataCell>
                            </CTableRow>
                          )
                        })
                      )}
                    </CTableBody>
                  </CTable>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Revoke Modal */}
      <CModal visible={revokeModal.visible} onClose={() => setRevokeModal({ visible: false, token: null, type: 'email' })}>
        <CModalHeader>
          <CModalTitle>Revoke Verification Token</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>Are you sure you want to revoke this {revokeModal.type} verification token?</p>
          <p className="text-muted">
            This action cannot be undone. The token will be marked as used and will no longer be valid.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setRevokeModal({ visible: false, token: null, type: 'email' })}
          >
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleRevoke} disabled={revokeLoading}>
            {revokeLoading ? <CSpinner size="sm" /> : 'Revoke Token'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default VerificationTokens
