import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CSpinner,
  CBadge,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CListGroup,
  CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilBan,
  cilCheckCircle,
  cilLockLocked,
  cilEnvelopeClosed,
  cilShieldAlt,
  cilHistory,
  cilTrash,
} from '@coreui/icons'
import { supabase } from '../../../supabase/supabaseClient'
import { useAuth } from '../../../contexts/AuthContext'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()

  const [user, setUser] = useState(null)
  const [loginActivity, setLoginActivity] = useState([])
  const [securityEvents, setSecurityEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [alert, setAlert] = useState(null)
  const [actionModal, setActionModal] = useState({ visible: false, action: '', title: '', body: '' })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (profileError) {
          console.error('Error fetching user:', profileError)
          navigate(`/${rolePrefix}/users/list`)
          return
        }

        setUser(profileData)

        // Fetch login activity
        const { data: activityData } = await supabase
          .from('login_activity')
          .select('*')
          .eq('user_id', id)
          .order('login_at', { ascending: false })
          .limit(20)

        setLoginActivity(activityData || [])

        // Fetch security events
        const { data: eventsData } = await supabase
          .from('security_events')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(20)

        setSecurityEvents(eventsData || [])

        // Fetch notifications
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(20)

        setNotifications(notifData || [])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [id, navigate])

  const logAdminAction = async (action, details = {}) => {
    await supabase.from('admin_activity_log').insert({
      admin_id: adminProfile.id,
      action,
      target_type: 'user',
      target_id: id,
      details: {
        user_name: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
        ...details,
      },
    })
  }

  const handleSuspend = async () => {
    setActionLoading(true)
    try {
      const newStatus = user.account_status === 'suspended' ? 'active' : 'suspended'
      const { error } = await supabase
        .from('user_profiles')
        .update({ account_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await logAdminAction(newStatus === 'suspended' ? 'user_suspend' : 'user_unsuspend', {
        previous_status: user.account_status,
        new_status: newStatus,
      })

      setUser({ ...user, account_status: newStatus })
      setAlert({
        color: 'success',
        message: `User ${newStatus === 'suspended' ? 'suspended' : 'unsuspended'} successfully.`,
      })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, action: '', title: '', body: '' })
    }
  }

  const handleForceEmailVerification = async () => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ email_verified: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      await logAdminAction('force_email_verification_reset')

      setUser({ ...user, email_verified: false })
      setAlert({
        color: 'success',
        message: 'Email verification status reset. User will need to re-verify.',
      })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, action: '', title: '', body: '' })
    }
  }

  const handleDeleteUser = async () => {
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          account_status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      await logAdminAction('user_soft_delete')

      setAlert({ color: 'success', message: 'User marked as deleted.' })
      setUser({ ...user, account_status: 'deleted', deleted_at: new Date().toISOString() })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, action: '', title: '', body: '' })
    }
  }

  const executeAction = () => {
    switch (actionModal.action) {
      case 'suspend':
      case 'unsuspend':
        handleSuspend()
        break
      case 'reset_email':
        handleForceEmailVerification()
        break
      case 'delete':
        handleDeleteUser()
        break
      default:
        break
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!user) {
    return (
      <CAlert color="danger">User not found.</CAlert>
    )
  }

  const statusColor = {
    active: 'success',
    inactive: 'secondary',
    suspended: 'warning',
    deleted: 'danger',
  }

  return (
    <>
      {/* Back Button */}
      <CButton color="link" className="mb-3 ps-0" onClick={() => navigate(`/${rolePrefix}/users/list`)}>
        <CIcon icon={cilArrowLeft} className="me-1" /> Back to Users
      </CButton>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      {/* User Header Card */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="align-items-center">
            <CCol md={8}>
              <h4 className="mb-1">
                {user.first_name} {user.last_name}
                <CBadge color={statusColor[user.account_status] || 'secondary'} className="ms-2">
                  {user.account_status}
                </CBadge>
              </h4>
              <p className="text-body-secondary mb-0">
                User ID: <code>{user.id}</code>
              </p>
            </CCol>
            <CCol md={4} className="text-end">
              {/* Action Buttons */}
              {user.account_status === 'active' && (
                <CButton
                  color="warning"
                  size="sm"
                  className="me-2"
                  onClick={() =>
                    setActionModal({
                      visible: true,
                      action: 'suspend',
                      title: 'Suspend User',
                      body: 'This will block the user from accessing their account. Are you sure?',
                    })
                  }
                >
                  <CIcon icon={cilBan} size="sm" /> Suspend
                </CButton>
              )}
              {user.account_status === 'suspended' && (
                <CButton
                  color="success"
                  size="sm"
                  className="me-2"
                  onClick={() =>
                    setActionModal({
                      visible: true,
                      action: 'unsuspend',
                      title: 'Unsuspend User',
                      body: 'This will restore the user\'s access. Are you sure?',
                    })
                  }
                >
                  <CIcon icon={cilCheckCircle} size="sm" /> Unsuspend
                </CButton>
              )}
              <CButton
                color="info"
                size="sm"
                className="me-2"
                variant="outline"
                onClick={() =>
                  setActionModal({
                    visible: true,
                    action: 'reset_email',
                    title: 'Reset Email Verification',
                    body: 'This will reset the email verification status. The user will need to verify their email again.',
                  })
                }
              >
                <CIcon icon={cilEnvelopeClosed} size="sm" /> Reset Email
              </CButton>
              {user.account_status !== 'deleted' && (
                <CButton
                  color="danger"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActionModal({
                      visible: true,
                      action: 'delete',
                      title: 'Delete User',
                      body: 'This will soft-delete the user. Their data will be preserved but marked as deleted. This action can be reversed.',
                    })
                  }
                >
                  <CIcon icon={cilTrash} size="sm" /> Delete
                </CButton>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* Tabs */}
      <CNav variant="tabs" className="mb-3">
        <CNavItem>
          <CNavLink active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} href="#">
            Profile
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} href="#">
            <CIcon icon={cilHistory} className="me-1" /> Login Activity
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === 'security'} onClick={() => setActiveTab('security')} href="#">
            <CIcon icon={cilShieldAlt} className="me-1" /> Security Events
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} href="#">
            Notifications
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        {/* Profile Tab */}
        <CTabPane visible={activeTab === 'profile'}>
          <CRow>
            <CCol md={6}>
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Personal Information</strong>
                </CCardHeader>
                <CCardBody>
                  <CListGroup flush>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">First Name</span>
                      <strong>{user.first_name || '-'}</strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Last Name</span>
                      <strong>{user.last_name || '-'}</strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Phone</span>
                      <strong>
                        {user.country_code}
                        {user.phone || '-'}
                      </strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Date of Birth</span>
                      <strong>{user.date_of_birth || '-'}</strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Bio</span>
                      <strong>{user.bio || '-'}</strong>
                    </CListGroupItem>
                  </CListGroup>
                </CCardBody>
              </CCard>
            </CCol>
            <CCol md={6}>
              <CCard className="mb-4">
                <CCardHeader>
                  <strong>Account Details</strong>
                </CCardHeader>
                <CCardBody>
                  <CListGroup flush>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Account Status</span>
                      <CBadge color={statusColor[user.account_status] || 'secondary'}>
                        {user.account_status}
                      </CBadge>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Email Verified</span>
                      <CBadge color={user.email_verified ? 'success' : 'danger'}>
                        {user.email_verified ? 'Yes' : 'No'}
                      </CBadge>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Phone Verified</span>
                      <CBadge color={user.phone_verified ? 'success' : 'danger'}>
                        {user.phone_verified ? 'Yes' : 'No'}
                      </CBadge>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Last Login</span>
                      <strong>
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString()
                          : 'Never'}
                      </strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Last Active</span>
                      <strong>
                        {user.last_active_at
                          ? new Date(user.last_active_at).toLocaleString()
                          : 'Never'}
                      </strong>
                    </CListGroupItem>
                    <CListGroupItem className="d-flex justify-content-between">
                      <span className="text-body-secondary">Created</span>
                      <strong>{new Date(user.created_at).toLocaleString()}</strong>
                    </CListGroupItem>
                    {user.deleted_at && (
                      <CListGroupItem className="d-flex justify-content-between">
                        <span className="text-body-secondary">Deleted At</span>
                        <strong className="text-danger">
                          {new Date(user.deleted_at).toLocaleString()}
                        </strong>
                      </CListGroupItem>
                    )}
                  </CListGroup>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>
        </CTabPane>

        {/* Login Activity Tab */}
        <CTabPane visible={activeTab === 'activity'}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Login Activity</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>IP Address</CTableHeaderCell>
                    <CTableHeaderCell>Device</CTableHeaderCell>
                    <CTableHeaderCell>Browser</CTableHeaderCell>
                    <CTableHeaderCell>Location</CTableHeaderCell>
                    <CTableHeaderCell>Method</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {loginActivity.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center text-body-secondary py-3">
                        No login activity found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    loginActivity.map((entry) => (
                      <CTableRow key={entry.id}>
                        <CTableDataCell>
                          {new Date(entry.login_at).toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell>{entry.ip_address || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {entry.device_name || entry.device_type || '-'}
                        </CTableDataCell>
                        <CTableDataCell>{entry.browser_name || '-'}</CTableDataCell>
                        <CTableDataCell>
                          {[entry.location_city, entry.location_country]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{entry.login_method || '-'}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={entry.success ? 'success' : 'danger'}>
                            {entry.success ? 'Success' : 'Failed'}
                          </CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Security Events Tab */}
        <CTabPane visible={activeTab === 'security'}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Security Events</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Event Type</CTableHeaderCell>
                    <CTableHeaderCell>Severity</CTableHeaderCell>
                    <CTableHeaderCell>IP Address</CTableHeaderCell>
                    <CTableHeaderCell>Details</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {securityEvents.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center text-body-secondary py-3">
                        No security events found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    securityEvents.map((event) => (
                      <CTableRow key={event.id}>
                        <CTableDataCell>
                          {new Date(event.created_at).toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{event.event_type}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge
                            color={
                              event.severity === 'critical'
                                ? 'danger'
                                : event.severity === 'high'
                                  ? 'warning'
                                  : event.severity === 'medium'
                                    ? 'info'
                                    : 'secondary'
                            }
                          >
                            {event.severity}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{event.ip_address || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <small>
                            {event.details && Object.keys(event.details).length > 0
                              ? JSON.stringify(event.details)
                              : '-'}
                          </small>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CTabPane>

        {/* Notifications Tab */}
        <CTabPane visible={activeTab === 'notifications'}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>User Notifications</strong>
            </CCardHeader>
            <CCardBody>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>Type</CTableHeaderCell>
                    <CTableHeaderCell>Title</CTableHeaderCell>
                    <CTableHeaderCell>Email Sent</CTableHeaderCell>
                    <CTableHeaderCell>Read</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {notifications.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-center text-body-secondary py-3">
                        No notifications found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    notifications.map((notif) => (
                      <CTableRow key={notif.id}>
                        <CTableDataCell>
                          {new Date(notif.created_at).toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{notif.type}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{notif.title}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={notif.email_sent ? 'success' : 'secondary'}>
                            {notif.email_sent ? 'Yes' : 'No'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={notif.read_at ? 'success' : 'secondary'}>
                            {notif.read_at ? 'Yes' : 'No'}
                          </CBadge>
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>

      {/* Action Confirmation Modal */}
      <CModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, action: '', title: '', body: '' })}
      >
        <CModalHeader>
          <CModalTitle>{actionModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody>{actionModal.body}</CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setActionModal({ visible: false, action: '', title: '', body: '' })}
          >
            Cancel
          </CButton>
          <CButton
            color={actionModal.action === 'delete' ? 'danger' : 'primary'}
            onClick={executeAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CSpinner size="sm" /> : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UserDetail
