import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  CInputGroup,
  CInputGroupText,
  CPagination,
  CPaginationItem,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormTextarea,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilCheckCircle,
  cilX,
  cilInfo,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { kycAPI } from '../../../utils/api'

const KYCModeration = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rolePrefix } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // Action modals
  const [actionModal, setActionModal] = useState({ visible: false, user: null, action: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionForm, setActionForm] = useState({ notes: '', reason: '' })
  const [alert, setAlert] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: pageSize,
      }
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== 'all') params.status = statusFilter

      const data = await kycAPI.getPending(params)
      setUsers(data.users || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e) => {
    e.preventDefault()
    const newParams = new URLSearchParams(searchParams)
    newParams.set('search', searchTerm)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const handleAction = async () => {
    setActionLoading(true)
    try {
      const { user, action } = actionModal
      if (action === 'approve') {
        await kycAPI.approve(user.id, { notes: actionForm.notes })
      } else if (action === 'reject') {
        await kycAPI.reject(user.id, { reason: actionForm.reason, notes: actionForm.notes })
      } else if (action === 'request-info') {
        await kycAPI.requestInfo(user.id, { notes: actionForm.notes })
      }
      setAlert({ color: 'success', message: 'Action completed successfully' })
      setActionModal({ visible: false, user: null, action: '' })
      setActionForm({ notes: '', reason: '' })
      fetchUsers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { color: 'warning', label: 'Pending' },
      under_review: { color: 'info', label: 'Under Review' },
      approved: { color: 'success', label: 'Approved' },
      rejected: { color: 'danger', label: 'Rejected' },
      needs_info: { color: 'secondary', label: 'Needs Info' },
    }
    const config = statusMap[status] || { color: 'secondary', label: status }
    return <CBadge color={config.color}>{config.label}</CBadge>
  }

  if (loading && users.length === 0) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <h4 className="mb-4">KYC Moderation</h4>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      <CCard>
        <CCardHeader>
          <CRow className="align-items-center">
            <CCol md={6}>
              <form onSubmit={handleSearch}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <CButton type="submit" color="primary">
                    Search
                  </CButton>
                </CInputGroup>
              </form>
            </CCol>
            <CCol md={6}>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('status', e.target.value)
                  newParams.set('page', '1')
                  setSearchParams(newParams)
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="needs_info">Needs Info</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </CFormSelect>
            </CCol>
          </CRow>
        </CCardHeader>
        <CCardBody>
          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>User</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Company</CTableHeaderCell>
                <CTableHeaderCell>KYC Status</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {users.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan="5" className="text-center">
                    No users found
                  </CTableDataCell>
                </CTableRow>
              ) : (
                users.map((user) => (
                  <CTableRow key={user.id}>
                    <CTableDataCell>
                      {user.first_name || ''} {user.last_name || ''}
                    </CTableDataCell>
                    <CTableDataCell>{user.email || 'N/A'}</CTableDataCell>
                    <CTableDataCell>{user.company_name || 'N/A'}</CTableDataCell>
                    <CTableDataCell>{getStatusBadge(user.kyc_status)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/${rolePrefix}/kyc/users/${user.id}`)}
                      >
                        <CIcon icon={cilInfo} />
                      </CButton>
                      {user.kyc_status !== 'approved' && (
                        <>
                          <CButton
                            color="success"
                            variant="outline"
                            size="sm"
                            className="me-2"
                            onClick={() =>
                              setActionModal({ visible: true, user, action: 'approve' })
                            }
                          >
                            <CIcon icon={cilCheckCircle} />
                          </CButton>
                          <CButton
                            color="danger"
                            variant="outline"
                            size="sm"
                            className="me-2"
                            onClick={() =>
                              setActionModal({ visible: true, user, action: 'reject' })
                            }
                          >
                            <CIcon icon={cilX} />
                          </CButton>
                          <CButton
                            color="info"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setActionModal({ visible: true, user, action: 'request-info' })
                            }
                          >
                            <CIcon icon={cilInfo} />
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
            <CPagination className="mt-3">
              <CPaginationItem
                disabled={currentPage === 1}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('page', String(currentPage - 1))
                  setSearchParams(newParams)
                }}
              >
                Previous
              </CPaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <CPaginationItem
                  key={pageNum}
                  active={pageNum === currentPage}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams)
                    newParams.set('page', String(pageNum))
                    setSearchParams(newParams)
                  }}
                >
                  {pageNum}
                </CPaginationItem>
              ))}
              <CPaginationItem
                disabled={currentPage === totalPages}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('page', String(currentPage + 1))
                  setSearchParams(newParams)
                }}
              >
                Next
              </CPaginationItem>
            </CPagination>
          )}
        </CCardBody>
      </CCard>

      {/* Action Modal */}
      <CModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, user: null, action: '' })}
      >
        <CModalHeader>
          <CModalTitle>
            {actionModal.action === 'approve' && 'Approve KYC'}
            {actionModal.action === 'reject' && 'Reject KYC'}
            {actionModal.action === 'request-info' && 'Request Information'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            {actionModal.action === 'reject' && (
              <>
                <CFormLabel>Rejection Reason *</CFormLabel>
                <CFormTextarea
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  rows={3}
                  placeholder="Enter the reason for rejection..."
                />
              </>
            )}
            <CFormLabel className="mt-3">Notes</CFormLabel>
            <CFormTextarea
              value={actionForm.notes}
              onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setActionModal({ visible: false, user: null, action: '' })}
          >
            Cancel
          </CButton>
          <CButton
            color={
              actionModal.action === 'approve'
                ? 'success'
                : actionModal.action === 'reject'
                  ? 'danger'
                  : 'info'
            }
            onClick={handleAction}
            disabled={actionLoading || (actionModal.action === 'reject' && !actionForm.reason.trim())}
          >
            {actionLoading ? <CSpinner size="sm" /> : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default KYCModeration
