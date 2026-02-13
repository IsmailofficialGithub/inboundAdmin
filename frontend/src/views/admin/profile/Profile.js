import React, { useState, useEffect, useRef } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CBadge,
  CListGroup,
  CListGroupItem,
  CAvatar,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CAlert,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilEnvelopeClosed, cilShieldAlt, cilCalendar, cilPencil, cilHistory, cilImage } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { authAPI } from '../../../utils/api'
import avatar8 from '../../../assets/images/avatars/8.jpg'

const Profile = () => {
  const { adminProfile, rolePrefix, refreshProfile } = useAuth()
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [alert, setAlert] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileInputRef = useRef(null)

  if (!adminProfile) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  const roleBadgeColor = {
    super_admin: 'danger',
    finance: 'warning',
    support: 'info',
    ops: 'success',
  }

  const displayName = adminProfile?.first_name
    ? `${adminProfile.first_name} ${adminProfile.last_name || ''}`
    : adminProfile?.email || 'Admin'

  // Get avatar URL - use profile avatar_url or fallback to default
  const avatarUrl = adminProfile?.avatar_url || avatar8

  // Open edit modal
  const openEditModal = () => {
    setEditForm({
      first_name: adminProfile.first_name || '',
      last_name: adminProfile.last_name || '',
    })
    setEditModal(true)
    setAlert(null)
  }

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    setAlert(null)
    try {
      const result = await authAPI.updateProfile(editForm)
      // Refresh the profile in context
      await refreshProfile()
      setAlert({ color: 'success', message: result.message || 'Profile updated successfully!' })
      setEditModal(false)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message || 'Failed to update profile' })
    } finally {
      setEditLoading(false)
    }
  }

  // Fetch sessions
  const fetchSessions = async () => {
    setSessionsLoading(true)
    try {
      const result = await authAPI.getSessions()
      setSessions(result.sessions || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Handle avatar file selection
  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAlert({ color: 'danger', message: 'Please select an image file' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ color: 'danger', message: 'Image size must be less than 5MB' })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setAlert({ color: 'warning', message: 'Please select an image file first' })
      return
    }

    setUploadingAvatar(true)
    setAlert(null)
    try {
      const result = await authAPI.uploadAvatar(file)
      // Refresh the profile in context
      await refreshProfile()
      setAlert({ color: 'success', message: result.message || 'Avatar uploaded successfully!' })
      setAvatarPreview(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      setAlert({ color: 'danger', message: err.message || 'Failed to upload avatar' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <>
      <h4 className="mb-4">My Profile</h4>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)} className="mb-4">
          {alert.message}
        </CAlert>
      )}

      {/* Profile Header Card */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow className="align-items-center">
            <CCol md={2} className="text-center mb-3 mb-md-0">
              <div className="position-relative d-inline-block">
                <CAvatar 
                  src={avatarPreview || avatarUrl} 
                  size="xl" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to change avatar"
                />
                <div 
                  className="position-absolute bottom-0 end-0 bg-primary rounded-circle p-1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Change avatar"
                >
                  <CIcon icon={cilImage} size="sm" className="text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileSelect}
                />
              </div>
              {avatarPreview && (
                <div className="mt-2">
                  <CButton
                    color="success"
                    size="sm"
                    onClick={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <CSpinner size="sm" className="me-1" /> Uploading...
                      </>
                    ) : (
                      'Save Avatar'
                    )}
                  </CButton>
                  <CButton
                    color="secondary"
                    size="sm"
                    className="ms-2"
                    onClick={() => {
                      setAvatarPreview(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    disabled={uploadingAvatar}
                  >
                    Cancel
                  </CButton>
                </div>
              )}
            </CCol>
            <CCol md={8}>
              <h4 className="mb-1">
                {displayName}
                <CBadge
                  color={roleBadgeColor[adminProfile.role] || 'secondary'}
                  className="ms-2 text-uppercase"
                >
                  {adminProfile.role?.replace('_', ' ')}
                </CBadge>
              </h4>
              <p className="text-body-secondary mb-0">
                <CIcon icon={cilEnvelopeClosed} className="me-1" />
                {adminProfile.email}
              </p>
            </CCol>
            <CCol md={2} className="text-end">
              <CButton color="primary" size="sm" onClick={openEditModal}>
                <CIcon icon={cilPencil} size="sm" className="me-1" />
                Edit Profile
              </CButton>
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
            active={activeTab === 'sessions'}
            onClick={() => setActiveTab('sessions')}
            href="#"
          >
            <CIcon icon={cilHistory} className="me-1" />
            Sessions & Login History
          </CNavLink>
        </CNavItem>
      </CNav>

      <CTabContent>
        {/* Profile Tab */}
        <CTabPane visible={activeTab === 'profile'}>
          {/* Profile Information */}
          <CRow>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilUser} className="me-2" />
              <strong>Personal Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">First Name</span>
                  <strong>{adminProfile.first_name || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Last Name</span>
                  <strong>{adminProfile.last_name || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Email</span>
                  <strong>{adminProfile.email || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Full Name</span>
                  <strong>{displayName}</strong>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilShieldAlt} className="me-2" />
              <strong>Account Details</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Role</span>
                  <CBadge color={roleBadgeColor[adminProfile.role] || 'secondary'}>
                    {adminProfile.role?.replace('_', ' ').toUpperCase()}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Account Status</span>
                  <CBadge color={adminProfile.is_active ? 'success' : 'danger'}>
                    {adminProfile.is_active ? 'Active' : 'Inactive'}
                  </CBadge>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Last Login</span>
                  <strong>
                    {adminProfile.last_login_at
                      ? new Date(adminProfile.last_login_at).toLocaleString()
                      : 'Never'}
                  </strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">
                    <CIcon icon={cilCalendar} className="me-1" />
                    Account Created
                  </span>
                  <strong>
                    {adminProfile.created_at
                      ? new Date(adminProfile.created_at).toLocaleDateString()
                      : '-'}
                  </strong>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
        </CTabPane>

        {/* Sessions Tab */}
        <CTabPane visible={activeTab === 'sessions'}>
          <CCard>
            <CCardHeader>
              <strong>Login Sessions & IP History</strong>
            </CCardHeader>
            <CCardBody>
              {sessionsLoading ? (
                <div className="text-center py-4">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Login Date</CTableHeaderCell>
                      <CTableHeaderCell>IP Address</CTableHeaderCell>
                      <CTableHeaderCell>User Agent</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {sessions.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={3} className="text-center text-body-secondary py-4">
                          No login sessions found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      sessions.map((session) => (
                        <CTableRow key={session.id}>
                          <CTableDataCell>
                            {new Date(session.login_at).toLocaleString()}
                          </CTableDataCell>
                          <CTableDataCell>
                            <code>{session.ip_address || '-'}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            <small className="text-body-secondary">
                              {session.user_agent || '-'}
                            </small>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CTabPane>
      </CTabContent>

      {/* Edit Profile Modal */}
      <CModal size="lg" visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilPencil} className="me-2" />
            Edit Profile
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleUpdateProfile}>
          <CModalBody>
            {alert && (
              <CAlert color={alert.color} className="mb-3">
                {alert.message}
              </CAlert>
            )}
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>First Name</CFormLabel>
                <CFormInput
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="Enter first name"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Last Name</CFormLabel>
                <CFormInput
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Enter last name"
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput
                  type="email"
                  value={adminProfile.email || ''}
                  disabled
                  readOnly
                />
                <small className="text-body-secondary">
                  Email cannot be changed. Please contact an administrator if you need to update your email.
                </small>
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)} disabled={editLoading}>
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
    </>
  )
}

export default Profile
