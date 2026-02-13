import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
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
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
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
  cilPencil,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { usersAPI } from '../../../utils/api'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const isCurrentUserSuperAdmin = adminProfile?.role === 'super_admin'

  const [user, setUser] = useState(null)
  const [loginActivity, setLoginActivity] = useState([])
  const [securityEvents, setSecurityEvents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [alert, setAlert] = useState(null)
  const isInitialMount = useRef(true)

  // Action modal
  const [actionModal, setActionModal] = useState({ visible: false, action: '', title: '', body: '' })
  const [actionLoading, setActionLoading] = useState(false)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({})

  // Reset password modal
  const [resetPwModal, setResetPwModal] = useState(false)
  const [resetPwLoading, setResetPwLoading] = useState(false)

  // =====================
  // FETCH USER DATA
  // =====================
  const fetchUserData = async () => {
    try {
      const data = await usersAPI.getById(id)

      if (!data.user) {
        navigate(`/${rolePrefix}/users/list`)
        return
      }

      setUser(data.user)
      setLoginActivity(data.loginActivity || [])
      setSecurityEvents(data.securityEvents || [])
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Error fetching user:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    isInitialMount.current = true
    fetchUserData()
  }, [id])

  // Refetch data when tab changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (id) {
      fetchUserData()
    }
  }, [activeTab])

  // =====================
  // EDIT USER
  // =====================
  const openEditModal = () => {
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      country_code: user.country_code || '',
      phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      bio: user.bio || '',
      account_status: user.account_status || 'active',
    })
    setEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const result = await usersAPI.update(id, editForm)
      setUser(result.user)
      setAlert({ color: 'success', message: 'User updated successfully!' })
      setEditModal(false)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  // =====================
  // SUSPEND / UNSUSPEND
  // =====================
  const handleSuspendToggle = async () => {
    setActionLoading(true)
    try {
      if (user.account_status === 'suspended') {
        await usersAPI.unsuspend(id)
        setUser({ ...user, account_status: 'active' })
        setAlert({ color: 'success', message: 'User unsuspended successfully.' })
      } else {
        await usersAPI.suspend(id)
        setUser({ ...user, account_status: 'suspended' })
        setAlert({ color: 'success', message: 'User suspended successfully.' })
      }
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, action: '', title: '', body: '' })
    }
  }

  // =====================
  // RESET EMAIL VERIFICATION
  // =====================
  const handleResetEmailVerification = async () => {
    setActionLoading(true)
    try {
      await usersAPI.resetEmailVerification(id)
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

  // =====================
  // RESET PASSWORD
  // =====================
  const handleResetPassword = async () => {
    setResetPwLoading(true)
    try {
      await usersAPI.resetPassword(id)
      setAlert({
        color: 'success',
        message: `Password reset email sent to ${user.email || 'user'}.`,
      })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setResetPwLoading(false)
      setResetPwModal(false)
    }
  }

  // =====================
  // DELETE USER
  // =====================
  const handleDeleteUser = async () => {
    setActionLoading(true)
    try {
      await usersAPI.delete(id)
      setAlert({ color: 'success', message: 'User marked as deleted.' })
      setUser({ ...user, account_status: 'deleted', deleted_at: new Date().toISOString() })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, action: '', title: '', body: '' })
    }
  }

  // =====================
  // EXECUTE ACTION
  // =====================
  const executeAction = () => {
    switch (actionModal.action) {
      case 'suspend':
      case 'unsuspend':
        handleSuspendToggle()
        break
      case 'reset_email':
        handleResetEmailVerification()
        break
      case 'delete':
        handleDeleteUser()
        break
      default:
        break
    }
  }

  // =====================
  // LOADING / NOT FOUND
  // =====================
  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!user) {
    return <CAlert color="danger">User not found.</CAlert>
  }

  const statusColor = {
    active: 'success',
    inactive: 'secondary',
    suspended: 'warning',
    deleted: 'danger',
  }

  // =====================
  // RENDER
  // =====================
  return (
    <>
      {/* Back Button */}
      <CButton
        color="link"
        className="mb-3 ps-0"
        onClick={() => navigate(`/${rolePrefix}/users/list`)}
      >
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
            <CCol md={7}>
              <h4 className="mb-1">
                {user.first_name} {user.last_name}
                <CBadge
                  color={statusColor[user.account_status] || 'secondary'}
                  className="ms-2"
                >
                  {user.account_status}
                </CBadge>
              </h4>
              <p className="text-body-secondary mb-0">
                {user.email && (
                  <>
                    <strong>{user.email}</strong> &middot;{' '}
                  </>
                )}
                User ID: <code>{user.id}</code>
              </p>
            </CCol>
            <CCol md={5} className="text-end">
              {/* Edit Button */}
              <CButton
                color="primary"
                size="sm"
                className="me-2"
                onClick={openEditModal}
              >
                <CIcon icon={cilPencil} size="sm" /> Edit
              </CButton>

              {/* Reset Password */}
              <CButton
                color="secondary"
                size="sm"
                className="me-2"
                variant="outline"
                onClick={() => setResetPwModal(true)}
              >
                <CIcon icon={cilLockLocked} size="sm" /> Reset Password
              </CButton>

              {/* Suspend / Unsuspend */}
              {/* Only show suspend/unsuspend for super admins if current user is also super admin */}
              {user.account_status === 'active' && (!user.is_super_admin || isCurrentUserSuperAdmin) && (
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
              {user.account_status === 'suspended' && (!user.is_super_admin || isCurrentUserSuperAdmin) && (
                <CButton
                  color="success"
                  size="sm"
                  className="me-2"
                  onClick={() =>
                    setActionModal({
                      visible: true,
                      action: 'unsuspend',
                      title: 'Unsuspend User',
                      body: "This will restore the user's access. Are you sure?",
                    })
                  }
                >
                  <CIcon icon={cilCheckCircle} size="sm" /> Unsuspend
                </CButton>
              )}

              {/* Reset Email Verification */}
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

              {/* Delete */}
              {/* Hide delete button for super admins */}
              {user.account_status !== 'deleted' && !user.is_super_admin && (
                <CButton
                  color="danger"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActionModal({
                      visible: true,
                      action: 'delete',
                      title: 'Delete User',
                      body: 'This will soft-delete the user. Their data will be preserved but marked as deleted.',
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
          <CNavLink
            active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
            href="#"
          >
            Profile
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            href="#"
          >
            <CIcon icon={cilHistory} className="me-1" /> Login Activity
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'security'}
            onClick={() => setActiveTab('security')}
            href="#"
          >
            <CIcon icon={cilShieldAlt} className="me-1" /> Security Events
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            active={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
            href="#"
          >
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
                      <span className="text-body-secondary">Email</span>
                      <strong>{user.email || '-'}</strong>
                    </CListGroupItem>
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
                      <CTableDataCell
                        colSpan={7}
                        className="text-center text-body-secondary py-3"
                      >
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
                      <CTableDataCell
                        colSpan={5}
                        className="text-center text-body-secondary py-3"
                      >
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
                      <CTableDataCell
                        colSpan={5}
                        className="text-center text-body-secondary py-3"
                      >
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

      {/* ======================== */}
      {/* EDIT USER MODAL          */}
      {/* ======================== */}
      <CModal size="lg" visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit User
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleUpdateUser}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>First Name</CFormLabel>
                <CFormInput
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Last Name</CFormLabel>
                <CFormInput
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel>Country Code</CFormLabel>
                <CFormSelect
                  value={editForm.country_code}
                  onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value })}
                >
                  <option value="">Select</option>
                  <option value="+1">+1 (US/CA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+92">+92 (PK)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+49">+49 (DE)</option>
                  <option value="+33">+33 (FR)</option>
                  <option value="+81">+81 (JP)</option>
                  <option value="+86">+86 (CN)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+966">+966 (SA)</option>
                </CFormSelect>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Phone Number</CFormLabel>
                <CFormInput
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Date of Birth</CFormLabel>
                <CFormInput
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Account Status</CFormLabel>
                <CFormSelect
                  value={editForm.account_status}
                  onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Bio</CFormLabel>
                <CFormInput
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Short bio..."
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? (
                <>
                  <CSpinner size="sm" className="me-1" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* ======================== */}
      {/* RESET PASSWORD MODAL     */}
      {/* ======================== */}
      <CModal visible={resetPwModal} onClose={() => setResetPwModal(false)}>
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilLockLocked} className="me-2" />
            Reset Password
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          This will send a password reset email to{' '}
          <strong>{user?.email || 'the user'}</strong>. The user will receive a link to set a new
          password.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setResetPwModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleResetPassword} disabled={resetPwLoading}>
            {resetPwLoading ? <CSpinner size="sm" /> : 'Send Reset Email'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ======================== */}
      {/* ACTION CONFIRMATION MODAL */}
      {/* ======================== */}
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
