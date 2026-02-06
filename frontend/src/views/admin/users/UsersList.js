import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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
  CButton,
  CFormInput,
  CFormSelect,
  CSpinner,
  CBadge,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilUser, cilBan, cilCheckCircle } from '@coreui/icons'
import { supabase } from '../../../supabase/supabaseClient'
import { useAuth } from '../../../contexts/AuthContext'

const UsersList = () => {
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [actionModal, setActionModal] = useState({ visible: false, user: null, action: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const pageSize = 20

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (statusFilter !== 'all') {
        query = query.eq('account_status', statusFilter)
      }

      if (searchTerm) {
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
        )
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching users:', error)
        return
      }

      setUsers(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fetch users error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
    setPage(0)
  }

  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value)
    setPage(0)
  }

  const handleUserAction = async () => {
    const { user, action } = actionModal
    if (!user || !action) return

    setActionLoading(true)
    try {
      let newStatus = ''
      if (action === 'suspend') newStatus = 'suspended'
      else if (action === 'unsuspend') newStatus = 'active'

      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      // Log the activity
      await supabase.from('admin_activity_log').insert({
        admin_id: adminProfile.id,
        action: `user_${action}`,
        target_type: 'user',
        target_id: user.id,
        details: {
          user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          previous_status: user.account_status,
          new_status: newStatus,
        },
      })

      setAlert({
        color: 'success',
        message: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully.`,
      })

      fetchUsers()
    } catch (err) {
      setAlert({ color: 'danger', message: `Failed to ${action} user: ${err.message}` })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, user: null, action: '' })
    }
  }

  const getStatusBadge = (status) => {
    const colorMap = {
      active: 'success',
      inactive: 'secondary',
      suspended: 'warning',
      deleted: 'danger',
    }
    return <CBadge color={colorMap[status] || 'secondary'}>{status}</CBadge>
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilUser} className="me-2" />
                User Management
              </strong>
              <span className="text-body-secondary small">{totalCount} total users</span>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              {/* Filters */}
              <CRow className="mb-3">
                <CCol md={6}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search by name or phone..."
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={statusFilter} onChange={handleStatusFilter}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Users Table */}
              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <>
                  <CTable hover responsive align="middle">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Email</CTableHeaderCell>
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Phone</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Email Verified</CTableHeaderCell>
                        <CTableHeaderCell>Last Login</CTableHeaderCell>
                        <CTableHeaderCell>Joined</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {users.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell
                            colSpan={8}
                            className="text-center text-body-secondary py-4"
                          >
                            No users found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        users.map((user) => (
                          <CTableRow
                            key={user.id}
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/${rolePrefix}/users/${user.id}`)}
                          >
                            <CTableDataCell>
                              <span className="text-body-secondary small">
                                {user.email || '-'}
                              </span>
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="fw-semibold">
                                {user.first_name} {user.last_name}
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>
                              {user.country_code}
                              {user.phone || '-'}
                            </CTableDataCell>
                            <CTableDataCell>{getStatusBadge(user.account_status)}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={user.email_verified ? 'success' : 'danger'}>
                                {user.email_verified ? 'Yes' : 'No'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              {user.last_login_at
                                ? new Date(user.last_login_at).toLocaleString()
                                : 'Never'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {new Date(user.created_at).toLocaleDateString()}
                            </CTableDataCell>
                            <CTableDataCell>
                              {user.account_status === 'active' ? (
                                <CButton
                                  color="warning"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActionModal({
                                      visible: true,
                                      user,
                                      action: 'suspend',
                                    })
                                  }}
                                >
                                  <CIcon icon={cilBan} size="sm" /> Suspend
                                </CButton>
                              ) : user.account_status === 'suspended' ? (
                                <CButton
                                  color="success"
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setActionModal({
                                      visible: true,
                                      user,
                                      action: 'unsuspend',
                                    })
                                  }}
                                >
                                  <CIcon icon={cilCheckCircle} size="sm" /> Unsuspend
                                </CButton>
                              ) : null}
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-body-secondary small">
                        Page {page + 1} of {totalPages}
                      </span>
                      <div>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          className="me-2"
                          disabled={page === 0}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </CButton>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages - 1}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </CButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Action Confirmation Modal */}
      <CModal visible={actionModal.visible} onClose={() => setActionModal({ visible: false, user: null, action: '' })}>
        <CModalHeader>
          <CModalTitle>
            {actionModal.action === 'suspend' ? 'Suspend User' : 'Unsuspend User'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to {actionModal.action}{' '}
          <strong>
            {actionModal.user?.first_name} {actionModal.user?.last_name}
          </strong>
          ?
          {actionModal.action === 'suspend' && (
            <p className="text-body-secondary mt-2 small">
              This will block the user from accessing their account.
            </p>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setActionModal({ visible: false, user: null, action: '' })}
          >
            Cancel
          </CButton>
          <CButton
            color={actionModal.action === 'suspend' ? 'warning' : 'success'}
            onClick={handleUserAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CSpinner size="sm" /> : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UsersList
