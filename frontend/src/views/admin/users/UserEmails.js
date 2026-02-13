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
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilCheckCircle, cilEnvelopeOpen } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const UserEmails = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [isPrimaryFilter, setIsPrimaryFilter] = useState('all')
  const [isVerifiedFilter, setIsVerifiedFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Verify modal
  const [verifyModal, setVerifyModal] = useState({ visible: false, email: null })
  const [verifyLoading, setVerifyLoading] = useState(false)

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (isPrimaryFilter !== 'all') params.append('is_primary', isPrimaryFilter)
      if (isVerifiedFilter !== 'all') params.append('is_verified', isVerifiedFilter)

      const response = await fetch(`${API_BASE}/user-emails?${params}`, {
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
        setEmails([])
        setTotalCount(0)
        return
      }

      setEmails(data.emails || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      // Only show toast for network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setEmails([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, isPrimaryFilter, isVerifiedFilter, pageSize])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const handleVerify = async () => {
    setVerifyLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/user-emails/${verifyModal.email.id}/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to verify email')

      toast.success('Email verified successfully')
      setVerifyModal({ visible: false, email: null })
      fetchEmails()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setVerifyLoading(false)
    }
  }

  const filteredEmails = emails.filter((email) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (email.user_email && email.user_email.toLowerCase().includes(search)) ||
      (email.email && email.email.toLowerCase().includes(search)) ||
      (email.name && email.name.toLowerCase().includes(search))
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
              <strong>User Email Management</strong>
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
                  <CFormSelect value={isPrimaryFilter} onChange={(e) => setIsPrimaryFilter(e.target.value)}>
                    <option value="all">All Emails</option>
                    <option value="true">Primary</option>
                    <option value="false">Secondary</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={isVerifiedFilter} onChange={(e) => setIsVerifiedFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>User Email</CTableHeaderCell>
                    <CTableHeaderCell>Email Address</CTableHeaderCell>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>Primary</CTableHeaderCell>
                    <CTableHeaderCell>Verified</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredEmails.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No emails found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredEmails.map((email) => (
                      <CTableRow key={email.id}>
                        <CTableDataCell>{email.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{email.email}</CTableDataCell>
                        <CTableDataCell>{email.name || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {email.is_primary ? (
                            <CBadge color="primary">Primary</CBadge>
                          ) : (
                            <CBadge color="secondary">Secondary</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {email.is_verified ? (
                            <CBadge color="success">Verified</CBadge>
                          ) : (
                            <CBadge color="warning">Unverified</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>{new Date(email.created_at).toLocaleDateString()}</CTableDataCell>
                        <CTableDataCell>
                          {!email.is_verified && adminProfile?.role === 'super_admin' && (
                            <CButton
                              color="success"
                              size="sm"
                              onClick={() => setVerifyModal({ visible: true, email })}
                            >
                              <CIcon icon={cilCheckCircle} className="me-1" />
                              Verify
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

      {/* Verify Modal */}
      <CModal visible={verifyModal.visible} onClose={() => setVerifyModal({ visible: false, email: null })}>
        <CModalHeader>
          <CModalTitle>Verify Email Address</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to verify the email address <strong>{verifyModal.email?.email}</strong> for user{' '}
            <strong>{verifyModal.email?.user_email}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setVerifyModal({ visible: false, email: null })}>
            Cancel
          </CButton>
          <CButton color="success" onClick={handleVerify} disabled={verifyLoading}>
            {verifyLoading ? <CSpinner size="sm" /> : 'Verify Email'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UserEmails
