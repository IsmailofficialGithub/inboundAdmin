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
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CForm,
  CFormLabel,
  CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilUser,
  cilUserPlus,
  cilShieldAlt,
  cilReload,
  cilCopy,
  cilAccountLogout,
  cilLockLocked,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { adminAPI, authAPI } from '../../../utils/api'

const AdminsList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, hasRole } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1 // URL uses 1-based, backend uses 0-based
  const [alert, setAlert] = useState(null)
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // ---- Create Admin Modal ----
  const [createModal, setCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 'support',
    generate_password: true,
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [createSuccess, setCreateSuccess] = useState(null)

  // Force logout modal
  const [forceLogoutModal, setForceLogoutModal] = useState({ visible: false, admin: null })
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false)

  // Reset password modal
  const [resetPwModal, setResetPwModal] = useState({ visible: false, admin: null })
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwForm, setResetPwForm] = useState({
    password: '',
    generate_password: true,
  })
  const [resetPwGenerated, setResetPwGenerated] = useState('')

  // Check if user is super_admin
  const isSuperAdmin = hasRole(['super_admin'])

  // =====================
  // FETCH ADMINS
  // =====================
  const fetchAdmins = useCallback(async () => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (roleFilter !== 'all') params.role = roleFilter
      if (searchTerm) params.search = searchTerm

      const data = await adminAPI.getAdmins(params)
      setAdmins(data.admins || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Fetch admins error:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, searchTerm, isSuperAdmin, pageSize])

  // Update URL when filters change
  const updateURL = useCallback((newPage, newRole, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 0) params.set('page', newPage.toString())
    if (newRole && newRole !== 'all') params.set('role', newRole)
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  // =====================
  // RANDOM PASSWORD GENERATOR
  // =====================
  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const nums = '0123456789'
    const syms = '!@#$%&*'
    const all = upper + lower + nums + syms
    let pw = ''
    pw += upper[Math.floor(Math.random() * upper.length)]
    pw += lower[Math.floor(Math.random() * lower.length)]
    pw += nums[Math.floor(Math.random() * nums.length)]
    pw += syms[Math.floor(Math.random() * syms.length)]
    for (let i = 4; i < 12; i++) pw += all[Math.floor(Math.random() * all.length)]
    return pw.split('').sort(() => Math.random() - 0.5).join('')
  }

  // =====================
  // CREATE ADMIN
  // =====================
  const openCreateModal = () => {
    const pw = generatePassword()
    setCreateForm({
      email: '',
      first_name: '',
      last_name: '',
      password: pw,
      role: 'support',
      generate_password: true,
    })
    setGeneratedPassword(pw)
    setCreateSuccess(null)
    setCreateModal(true)
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateSuccess(null)
    try {
      const payload = {
        email: createForm.email,
        first_name: createForm.first_name || undefined,
        last_name: createForm.last_name || undefined,
        role: createForm.role,
      }

      if (createForm.generate_password) {
        // Backend will generate password if not provided
        payload.password = generatedPassword
      } else {
        payload.password = createForm.password
      }

      const result = await adminAPI.createAdmin(payload)

      setCreateSuccess({
        message: result.message,
        admin: result.admin,
      })
      setAlert({ color: 'success', message: `Admin "${createForm.email}" created successfully!` })
      fetchAdmins()

      // Close modal after 3 seconds
      setTimeout(() => {
        setCreateModal(false)
        setCreateSuccess(null)
      }, 3000)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setCreateLoading(false)
    }
  }

  const regeneratePassword = () => {
    const pw = generatePassword()
    setGeneratedPassword(pw)
    setCreateForm((prev) => ({ ...prev, password: pw }))
  }

  const copyPassword = () => {
    const pw = createForm.generate_password ? generatedPassword : createForm.password
    navigator.clipboard.writeText(pw)
    setAlert({ color: 'info', message: 'Password copied to clipboard!' })
  }

  // =====================
  // RESET PASSWORD
  // =====================
  const openResetPasswordModal = (admin) => {
    const pw = generatePassword()
    setResetPwForm({
      password: pw,
      generate_password: true,
    })
    setResetPwGenerated(pw)
    setResetPwModal({ visible: true, admin })
  }

  const regenerateResetPassword = () => {
    const pw = generatePassword()
    setResetPwGenerated(pw)
    setResetPwForm((prev) => ({ ...prev, password: pw }))
  }

  const handleResetPassword = async () => {
    if (!resetPwModal.admin) return

    setResetPwLoading(true)
    try {
      // Always send the password - either generated or manually entered
      const passwordToSend = resetPwForm.generate_password ? resetPwGenerated : resetPwForm.password

      if (!passwordToSend || passwordToSend.length < 8) {
        setAlert({ color: 'danger', message: 'Password must be at least 8 characters long' })
        setResetPwLoading(false)
        return
      }

      const payload = {
        password: passwordToSend,
        generate_password: resetPwForm.generate_password,
      }

      const result = await adminAPI.resetAdminPassword(resetPwModal.admin.id, payload)
      
      // Show success message
      setAlert({
        color: 'success',
        message: result.message || 'Password reset successfully. Email sent with new password via SendGrid.',
      })
      setResetPwModal({ visible: false, admin: null })
      setResetPwForm({ password: '', generate_password: true })
      setResetPwGenerated('')
    } catch (err) {
      setAlert({ color: 'danger', message: err.message || 'Failed to reset password' })
    } finally {
      setResetPwLoading(false)
    }
  }

  // =====================
  // FORCE LOGOUT
  // =====================
  const handleForceLogout = async () => {
    if (!forceLogoutModal.admin) return

    setForceLogoutLoading(true)
    try {
      await authAPI.forceLogout(forceLogoutModal.admin.id)
      setAlert({
        color: 'success',
        message: `Successfully logged out ${forceLogoutModal.admin.email}`,
      })
      setForceLogoutModal({ visible: false, admin: null })
      fetchAdmins()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message || 'Failed to force logout' })
    } finally {
      setForceLogoutLoading(false)
    }
  }

  // =====================
  // HELPERS
  // =====================
  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    updateURL(1, roleFilter, value)
  }

  const handleRoleFilter = (e) => {
    const value = e.target.value
    setRoleFilter(value)
    updateURL(1, value, searchTerm)
  }

  const handlePageChange = (newPage) => {
    updateURL(newPage, roleFilter, searchTerm)
  }

  const getRoleBadge = (role) => {
    const colorMap = {
      super_admin: 'danger',
      finance: 'info',
      support: 'success',
      ops: 'warning',
    }
    const labelMap = {
      super_admin: 'Super Admin',
      finance: 'Finance',
      support: 'Support',
      ops: 'Operations',
    }
    return <CBadge color={colorMap[role] || 'secondary'}>{labelMap[role] || role}</CBadge>
  }

  const getStatusBadge = (isActive) => {
    return (
      <CBadge color={isActive ? 'success' : 'secondary'}>
        {isActive ? 'Active' : 'Inactive'}
      </CBadge>
    )
  }

  // =====================
  // RENDER
  // =====================

  // Show access denied if not super admin
  if (!isSuperAdmin) {
    return (
      <CRow>
        <CCol>
          <CCard>
            <CCardBody className="text-center py-5">
              <CIcon icon={cilShieldAlt} size="3xl" className="text-danger mb-3" />
              <h4>Access Denied</h4>
              <p className="text-body-secondary">
                Only Super Admins can manage admin accounts.
              </p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilShieldAlt} className="me-2" />
                Admin Management
              </strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small me-2">{totalCount} total admins</span>
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  <CIcon icon={cilUserPlus} className="me-1" /> Create Admin
                </CButton>
              </div>
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
                      placeholder="Search by email or name..."
                      value={searchTerm}
                      onChange={handleSearch}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={roleFilter} onChange={handleRoleFilter}>
                    <option value="all">All Roles</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="finance">Finance</option>
                    <option value="support">Support</option>
                    <option value="ops">Operations</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* Admins Table */}
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
                        <CTableHeaderCell>Email</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Last Login</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {admins.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">
                            No admins found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        admins.map((admin) => (
                          <CTableRow key={admin.id}>
                            <CTableDataCell>
                              <span className="text-body-secondary small">{admin.email || '-'}</span>
                            </CTableDataCell>
                            <CTableDataCell>
                              <span className="text-body-secondary">{admin.email || '-'}</span>
                            </CTableDataCell>
                            <CTableDataCell>{getStatusBadge(admin.is_active)}</CTableDataCell>
                            <CTableDataCell>
                              {admin.last_login_at
                                ? new Date(admin.last_login_at).toLocaleDateString()
                                : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {new Date(admin.created_at).toLocaleDateString()}
                            </CTableDataCell>
                            <CTableDataCell>
                              {admin.id !== adminProfile?.id && (
                                <>
                                  <CButton
                                    color="info"
                                    size="sm"
                                    variant="outline"
                                    className="me-2"
                                    onClick={() => openResetPasswordModal(admin)}
                                  >
                                    <CIcon icon={cilLockLocked} size="sm" className="me-1" />
                                    Reset Password
                                  </CButton>
                                  <CButton
                                    color="warning"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setForceLogoutModal({ visible: true, admin })}
                                  >
                                    <CIcon icon={cilAccountLogout} size="sm" className="me-1" />
                                    Force Logout
                                  </CButton>
                                </>
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
                          onClick={() => handlePageChange(currentPage)}
                        >
                          Previous
                        </CButton>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages - 1}
                          onClick={() => handlePageChange(currentPage + 1)}
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

      {/* ======================== */}
      {/* CREATE ADMIN MODAL       */}
      {/* ======================== */}
      <CModal
        size="lg"
        visible={createModal}
        onClose={() => setCreateModal(false)}
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilUserPlus} className="me-2" />
            Create New Admin
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreateAdmin}>
          <CModalBody>
            {createSuccess ? (
              <CAlert color="success">
                <h6 className="alert-heading">Admin Created!</h6>
                <p>{createSuccess.message}</p>
                <p>
                  <strong>Email:</strong> {createSuccess.admin.email}
                </p>
                <p>
                  <strong>Role:</strong> {getRoleBadge(createSuccess.admin.role)}
                </p>
              </CAlert>
            ) : (
              <>
                <CRow className="mb-3">
                  <CCol md={12}>
                    <CFormLabel>
                      Email <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormInput
                      type="email"
                      placeholder="admin@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      required
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>First Name</CFormLabel>
                    <CFormInput
                      placeholder="John"
                      value={createForm.first_name}
                      onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Last Name</CFormLabel>
                    <CFormInput
                      placeholder="Doe"
                      value={createForm.last_name}
                      onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={12}>
                    <CFormLabel>
                      Role <span className="text-danger">*</span>
                    </CFormLabel>
                    <CFormSelect
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                      required
                    >
                      <option value="support">Support</option>
                      <option value="finance">Finance</option>
                      <option value="ops">Operations</option>
                      <option value="super_admin">Super Admin</option>
                    </CFormSelect>
                    <div className="form-text">
                      Select the role for this admin. Super Admin has full access.
                    </div>
                  </CCol>
                </CRow>

                <hr />

                <CRow className="mb-3">
                  <CCol md={12}>
                    <CFormCheck
                      id="generatePassword"
                      label="Auto-generate a strong password"
                      checked={createForm.generate_password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, generate_password: e.target.checked })
                      }
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={12}>
                    <CFormLabel>
                      Password <span className="text-danger">*</span>
                    </CFormLabel>
                    <CInputGroup>
                      <CFormInput
                        type="text"
                        value={createForm.generate_password ? generatedPassword : createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        readOnly={createForm.generate_password}
                        required
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.95rem',
                          letterSpacing: '0.05em',
                        }}
                      />
                      {createForm.generate_password && (
                        <CButton
                          color="secondary"
                          variant="outline"
                          onClick={regeneratePassword}
                          title="Regenerate password"
                        >
                          <CIcon icon={cilReload} size="sm" />
                        </CButton>
                      )}
                      <CButton
                        color="primary"
                        variant="outline"
                        onClick={copyPassword}
                        title="Copy password"
                      >
                        <CIcon icon={cilCopy} size="sm" />
                      </CButton>
                    </CInputGroup>
                    <div className="form-text">
                      This password will be emailed to the admin along with their account details.
                    </div>
                  </CCol>
                </CRow>
              </>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setCreateModal(false)}>
              {createSuccess ? 'Close' : 'Cancel'}
            </CButton>
            {!createSuccess && (
              <CButton type="submit" color="primary" disabled={createLoading}>
                {createLoading ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Creating...
                  </>
                ) : (
                  'Create Admin'
                )}
              </CButton>
            )}
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Reset Password Modal */}
      <CModal
        visible={resetPwModal.visible}
        onClose={() => {
          setResetPwModal({ visible: false, admin: null })
          setResetPwForm({ password: '', generate_password: true })
          setResetPwGenerated('')
        }}
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilLockLocked} className="me-2" />
            Reset Admin Password
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}>
          <CModalBody>
            <p className="mb-3">
              Reset password for <strong>{resetPwModal.admin?.email || 'this admin'}</strong>. The new
              password will be sent via email.
            </p>
            <CFormCheck
              type="checkbox"
              id="generate-password-check"
              label="Generate random password"
              checked={resetPwForm.generate_password}
              onChange={(e) => {
                setResetPwForm({
                  ...resetPwForm,
                  generate_password: e.target.checked,
                })
              }}
              className="mb-3"
            />
            {resetPwForm.generate_password ? (
              <div>
                <CFormLabel>Generated Password (This will be sent via email)</CFormLabel>
                <CInputGroup>
                  <CFormInput
                    type="text"
                    value={resetPwGenerated}
                    readOnly
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.95rem',
                      letterSpacing: '0.05em',
                      backgroundColor: '#f8f9fa',
                    }}
                  />
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={regenerateResetPassword}
                    title="Regenerate password"
                  >
                    <CIcon icon={cilReload} size="sm" />
                  </CButton>
                  <CButton
                    color="secondary"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(resetPwGenerated)
                      setAlert({ color: 'info', message: 'Password copied to clipboard!' })
                    }}
                    title="Copy password"
                  >
                    <CIcon icon={cilCopy} size="sm" />
                  </CButton>
                </CInputGroup>
                <small className="text-body-secondary d-block mt-2">
                  This password will be set and sent to {resetPwModal.admin?.email || 'the admin'} via email.
                </small>
              </div>
            ) : (
              <div>
                <CFormLabel>Enter New Password</CFormLabel>
                <CFormInput
                  type="text"
                  value={resetPwForm.password}
                  onChange={(e) =>
                    setResetPwForm({ ...resetPwForm, password: e.target.value })
                  }
                  placeholder="Enter new password (min 8 characters)"
                  required
                  minLength={8}
                />
                <small className="text-body-secondary d-block mt-2">
                  Password must be at least 8 characters long. This password will be set and sent via email.
                </small>
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              onClick={() => {
                setResetPwModal({ visible: false, admin: null })
                setResetPwForm({ password: '', generate_password: true })
                setResetPwGenerated('')
              }}
              disabled={resetPwLoading}
            >
              Cancel
            </CButton>
            <CButton type="submit" color="primary" disabled={resetPwLoading}>
              {resetPwLoading ? (
                <>
                  <CSpinner size="sm" className="me-1" /> Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Force Logout Modal */}
      <CModal
        visible={forceLogoutModal.visible}
        onClose={() => setForceLogoutModal({ visible: false, admin: null })}
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilAccountLogout} className="me-2" />
            Force Logout Admin
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to force logout{' '}
          <strong>{forceLogoutModal.admin?.email || 'this admin'}</strong>? This will revoke all
          active sessions and they will need to log in again.
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setForceLogoutModal({ visible: false, admin: null })}
            disabled={forceLogoutLoading}
          >
            Cancel
          </CButton>
          <CButton color="warning" onClick={handleForceLogout} disabled={forceLogoutLoading}>
            {forceLogoutLoading ? (
              <>
                <CSpinner size="sm" className="me-1" /> Logging out...
              </>
            ) : (
              'Force Logout'
            )}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AdminsList
