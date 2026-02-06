import React, { useState, useEffect, useCallback } from 'react'
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilHistory } from '@coreui/icons'
import { supabase } from '../../../supabase/supabaseClient'

const ActivityLog = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const pageSize = 25

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('admin_activity_log')
        .select('*, admin_profiles(email, first_name, last_name, role)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching activities:', error)
        return
      }

      setActivities(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Fetch activities error:', err)
    } finally {
      setLoading(false)
    }
  }, [page, actionFilter])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  const getActionColor = (action) => {
    if (action.includes('login')) return 'info'
    if (action.includes('logout')) return 'secondary'
    if (action.includes('suspend')) return 'warning'
    if (action.includes('unsuspend')) return 'success'
    if (action.includes('delete')) return 'danger'
    if (action.includes('reset')) return 'primary'
    return 'info'
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>
              <CIcon icon={cilHistory} className="me-2" />
              Admin Activity Log
            </strong>
            <span className="text-body-secondary small">{totalCount} total entries</span>
          </CCardHeader>
          <CCardBody>
            {/* Filters */}
            <CRow className="mb-3">
              <CCol md={6}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Search by action or details..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(0)
                    }}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={3}>
                <CFormSelect
                  value={actionFilter}
                  onChange={(e) => {
                    setActionFilter(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="all">All Actions</option>
                  <option value="admin_login">Admin Login</option>
                  <option value="admin_logout">Admin Logout</option>
                  <option value="user_suspend">User Suspend</option>
                  <option value="user_unsuspend">User Unsuspend</option>
                  <option value="user_soft_delete">User Delete</option>
                  <option value="force_email_verification_reset">Email Reset</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {/* Activity Table */}
            {loading ? (
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            ) : (
              <>
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Date & Time</CTableHeaderCell>
                      <CTableHeaderCell>Admin</CTableHeaderCell>
                      <CTableHeaderCell>Role</CTableHeaderCell>
                      <CTableHeaderCell>Action</CTableHeaderCell>
                      <CTableHeaderCell>Target</CTableHeaderCell>
                      <CTableHeaderCell>Details</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {activities.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={6}
                          className="text-center text-body-secondary py-4"
                        >
                          No activity logs found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      activities.map((activity) => (
                        <CTableRow key={activity.id}>
                          <CTableDataCell>
                            <div>{new Date(activity.created_at).toLocaleDateString()}</div>
                            <small className="text-body-secondary">
                              {new Date(activity.created_at).toLocaleTimeString()}
                            </small>
                          </CTableDataCell>
                          <CTableDataCell>
                            {activity.admin_profiles?.first_name
                              ? `${activity.admin_profiles.first_name} ${activity.admin_profiles.last_name || ''}`
                              : activity.admin_profiles?.email || 'Unknown'}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="primary" className="text-uppercase">
                              {activity.admin_profiles?.role?.replace('_', ' ') || '-'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getActionColor(activity.action)}>
                              {activity.action}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {activity.target_type && (
                              <small>
                                {activity.target_type}
                                {activity.target_id && (
                                  <>
                                    : <code>{activity.target_id.slice(0, 8)}...</code>
                                  </>
                                )}
                              </small>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {activity.details && Object.keys(activity.details).length > 0 ? (
                              <small>
                                {activity.details.user_name && (
                                  <span className="me-2">{activity.details.user_name}</span>
                                )}
                                {activity.details.email && (
                                  <span className="text-body-secondary">
                                    {activity.details.email}
                                  </span>
                                )}
                              </small>
                            ) : (
                              '-'
                            )}
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
  )
}

export default ActivityLog
