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
import { cilSearch, cilCheckCircle, cilX, cilClock } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const AccountDeactivations = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [searchTerm, setSearchTerm] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Action modal
  const [actionModal, setActionModal] = useState({ visible: false, request: null, action: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionNotes, setActionNotes] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setAlert(null) // Clear any previous alerts
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`${API_BASE}/account-deactivations?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      // Only show error for actual server errors (5xx) or auth errors (401, 403)
      // Don't show error for 404 or empty data - that's normal
      if (!response.ok) {
        if (response.status >= 500) {
          setAlert({ color: 'danger', message: data.error || 'Server error. Please try again later.' })
        } else if (response.status === 401 || response.status === 403) {
          setAlert({ color: 'danger', message: 'You do not have permission to view this page.' })
        }
        // For other errors (like 404), just set empty data
        setRequests([])
        setTotalCount(0)
        return
      }

      setRequests(data.requests || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      // Only show alert for network errors or unexpected errors
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        setAlert({ color: 'danger', message: 'Network error. Please check your connection.' })
      } else {
        console.error('Fetch requests error:', err)
        // Don't show alert for other errors - just log them
      }
      setRequests([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleAction = async () => {
    setActionLoading(true)
    try {
      const token = getAuthToken()
      const endpoint = actionModal.action === 'approve' ? 'approve' : 'reject'
      const response = await fetch(`${API_BASE}/account-deactivations/${actionModal.request.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes: actionNotes }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Action failed')

      toast.success(`Deactivation ${actionModal.action === 'approve' ? 'approved' : 'rejected'} successfully`)
      setActionModal({ visible: false, request: null, action: '' })
      setActionNotes('')
      fetchRequests()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: <CBadge color="warning">Pending</CBadge>,
      completed: <CBadge color="success">Completed</CBadge>,
      cancelled: <CBadge color="secondary">Cancelled</CBadge>,
    }
    return badges[status] || <CBadge>{status}</CBadge>
  }

  const filteredRequests = requests.filter((req) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (req.user_email && req.user_email.toLowerCase().includes(search)) ||
      (req.reason && req.reason.toLowerCase().includes(search))
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
              <strong>Account Deactivation Requests</strong>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CRow className="mb-3">
                <CCol md={6}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search by email or reason..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>User Email</CTableHeaderCell>
                    <CTableHeaderCell>Reason</CTableHeaderCell>
                    <CTableHeaderCell>Scheduled Deletion</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredRequests.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center">
                        No deactivation requests found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <CTableRow key={request.id}>
                        <CTableDataCell>{request.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{request.reason || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {request.scheduled_deletion_at
                            ? new Date(request.scheduled_deletion_at).toLocaleDateString()
                            : '-'}
                        </CTableDataCell>
                        <CTableDataCell>{getStatusBadge(request.status)}</CTableDataCell>
                        <CTableDataCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          {request.status === 'pending' && adminProfile?.role === 'super_admin' && (
                            <>
                              <CButton
                                color="success"
                                size="sm"
                                className="me-2"
                                onClick={() =>
                                  setActionModal({ visible: true, request, action: 'approve' })
                                }
                              >
                                <CIcon icon={cilCheckCircle} className="me-1" />
                                Approve
                              </CButton>
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => setActionModal({ visible: true, request, action: 'reject' })}
                              >
                                <CIcon icon={cilX} className="me-1" />
                                Reject
                              </CButton>
                            </>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>

              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                  </div>
                  <div>
                    <CButton
                      color="secondary"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setSearchParams({ ...Object.fromEntries(searchParams), page: page.toString() })}
                    >
                      Previous
                    </CButton>
                    <span className="mx-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <CButton
                      color="secondary"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() =>
                        setSearchParams({ ...Object.fromEntries(searchParams), page: (page + 2).toString() })
                      }
                    >
                      Next
                    </CButton>
                  </div>
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Action Modal */}
      <CModal visible={actionModal.visible} onClose={() => setActionModal({ visible: false, request: null, action: '' })}>
        <CModalHeader>
          <CModalTitle>
            {actionModal.action === 'approve' ? 'Approve' : 'Reject'} Deactivation Request
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to {actionModal.action} the deactivation request for{' '}
            <strong>{actionModal.request?.user_email}</strong>?
          </p>
          <CFormLabel>Notes (optional)</CFormLabel>
          <CFormTextarea
            rows={3}
            value={actionNotes}
            onChange={(e) => setActionNotes(e.target.value)}
            placeholder="Add any notes about this action..."
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setActionModal({ visible: false, request: null, action: '' })}
          >
            Cancel
          </CButton>
          <CButton
            color={actionModal.action === 'approve' ? 'success' : 'danger'}
            onClick={handleAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CSpinner size="sm" /> : actionModal.action === 'approve' ? 'Approve' : 'Reject'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AccountDeactivations
