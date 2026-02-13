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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilShieldAlt, cilBan } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const TwoFactorManagement = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [enabledFilter, setEnabledFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Disable modal
  const [disableModal, setDisableModal] = useState({ visible: false, user: null })
  const [disableLoading, setDisableLoading] = useState(false)
  const [disableReason, setDisableReason] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (enabledFilter !== 'all') params.append('enabled', enabledFilter)
      if (methodFilter !== 'all') params.append('method', methodFilter)

      const response = await fetch(`${API_BASE}/2fa/users?${params}`, {
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
        setUsers([])
        setTotalCount(0)
        return
      }

      setUsers(data.users || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      // Only show toast for network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setUsers([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, enabledFilter, methodFilter, pageSize])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDisable = async () => {
    setDisableLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/2fa/${disableModal.user.user_id}/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: disableReason }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to disable 2FA')

      toast.success('2FA disabled successfully')
      setDisableModal({ visible: false, user: null })
      setDisableReason('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDisableLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (user.user_email && user.user_email.toLowerCase().includes(search)) ||
      (user.first_name && user.first_name.toLowerCase().includes(search)) ||
      (user.last_name && user.last_name.toLowerCase().includes(search))
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
              <strong>Two-Factor Authentication Management</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search by email or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={enabledFilter} onChange={(e) => setEnabledFilter(e.target.value)}>
                    <option value="all">All Users</option>
                    <option value="true">2FA Enabled</option>
                    <option value="false">2FA Disabled</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                    <option value="all">All Methods</option>
                    <option value="totp">TOTP</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>User Email</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>2FA Status</CTableHeaderCell>
                    <CTableHeaderCell>Method</CTableHeaderCell>
                    <CTableHeaderCell>Verified</CTableHeaderCell>
                    <CTableHeaderCell>Last Used</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredUsers.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No users found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <CTableRow key={user.id}>
                        <CTableDataCell>{user.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>
                          {user.first_name} {user.last_name}
                        </CTableDataCell>
                        <CTableDataCell>
                          {user.enabled ? (
                            <CBadge color="success">Enabled</CBadge>
                          ) : (
                            <CBadge color="secondary">Disabled</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>{user.method || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {user.verified ? (
                            <CBadge color="success">Yes</CBadge>
                          ) : (
                            <CBadge color="warning">No</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {user.last_used_at ? new Date(user.last_used_at).toLocaleDateString() : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {user.enabled && adminProfile?.role === 'super_admin' && (
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => setDisableModal({ visible: true, user })}
                            >
                              <CIcon icon={cilBan} className="me-1" />
                              Disable
                            </CButton>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Disable Modal */}
      <CModal visible={disableModal.visible} onClose={() => setDisableModal({ visible: false, user: null })}>
        <CModalHeader>
          <CModalTitle>Disable Two-Factor Authentication</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to disable 2FA for <strong>{disableModal.user?.user_email}</strong>?
          </p>
          <CFormLabel>Reason (optional)</CFormLabel>
          <CFormTextarea
            rows={3}
            value={disableReason}
            onChange={(e) => setDisableReason(e.target.value)}
            placeholder="Enter reason for disabling 2FA..."
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDisableModal({ visible: false, user: null })}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDisable} disabled={disableLoading}>
            {disableLoading ? <CSpinner size="sm" /> : 'Disable 2FA'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TwoFactorManagement
