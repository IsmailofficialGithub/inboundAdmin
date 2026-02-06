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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CForm,
  CFormLabel,
  CFormCheck,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilUser,
  cilBan,
  cilCheckCircle,
  cilUserPlus,
  cilPencil,
  cilTrash,
  cilLockLocked,
  cilReload,
  cilCopy,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { usersAPI } from '../../../utils/api'

const UsersList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const isCurrentUserSuperAdmin = adminProfile?.role === 'super_admin'
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1 // URL uses 1-based, backend uses 0-based
  const [alert, setAlert] = useState(null)
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // ---- Create User Modal ----
  const [createModal, setCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    country_code: '',
    phone: '',
    generate_password: true,
  })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [createSuccess, setCreateSuccess] = useState(null)

  // ---- Action Modal (suspend/unsuspend/delete) ----
  const [actionModal, setActionModal] = useState({ visible: false, user: null, action: '' })
  const [actionLoading, setActionLoading] = useState(false)

  // ---- Edit Modal ----
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: '',
    first_name: '',
    last_name: '',
    country_code: '',
    phone: '',
    date_of_birth: '',
    bio: '',
    account_status: 'active',
  })

  // ---- Reset Password Modal ----
  const [resetPwModal, setResetPwModal] = useState({ visible: false, user: null })
  const [resetPwLoading, setResetPwLoading] = useState(false)

  // =====================
  // FETCH USERS
  // =====================
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchTerm) params.search = searchTerm

      const data = await usersAPI.list(params)
      setUsers(data.users || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Fetch users error:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, pageSize])

  // Update URL when filters change
  const updateURL = useCallback((newPage, newStatus, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 0) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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
  // CREATE USER
  // =====================
  const openCreateModal = () => {
    const pw = generatePassword()
    setCreateForm({
      email: '',
      first_name: '',
      last_name: '',
      password: pw,
      country_code: '+1',
      phone: '',
      generate_password: true,
    })
    setGeneratedPassword(pw)
    setCreateSuccess(null)
    setCreateModal(true)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateSuccess(null)
    try {
      const payload = {
        email: createForm.email,
        first_name: createForm.first_name || undefined,
        last_name: createForm.last_name || undefined,
        country_code: createForm.country_code || undefined,
        phone: createForm.phone || undefined,
      }

      if (createForm.generate_password) {
        payload.generate_password = true
      } else {
        payload.password = createForm.password
      }

      const result = await usersAPI.create(payload)

      setCreateSuccess({
        message: result.message,
        emailSent: result.emailSent,
        user: result.user,
      })
      setAlert({ color: 'success', message: `User "${createForm.email}" created successfully!` })
      fetchUsers()

      // Close modal after 2 seconds
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
  // EDIT USER
  // =====================
  const openEditModal = (user) => {
    setEditForm({
      id: user.id,
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
      const { id, ...updateData } = editForm
      await usersAPI.update(id, updateData)
      setAlert({ color: 'success', message: 'User updated successfully!' })
      setEditModal(false)
      fetchUsers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  // =====================
  // SUSPEND / UNSUSPEND / DELETE
  // =====================
  const handleUserAction = async () => {
    const { user, action } = actionModal
    if (!user || !action) return

    setActionLoading(true)
    try {
      if (action === 'suspend') {
        await usersAPI.suspend(user.id)
        setAlert({ color: 'success', message: 'User suspended successfully.' })
      } else if (action === 'unsuspend') {
        await usersAPI.unsuspend(user.id)
        setAlert({ color: 'success', message: 'User unsuspended successfully.' })
      } else if (action === 'delete') {
        await usersAPI.delete(user.id)
        setAlert({ color: 'success', message: 'User deleted successfully.' })
      }
      fetchUsers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, user: null, action: '' })
    }
  }

  // =====================
  // RESET PASSWORD
  // =====================
  const handleResetPassword = async () => {
    const { user } = resetPwModal
    if (!user) return
    setResetPwLoading(true)
    try {
      await usersAPI.resetPassword(user.id)
      setAlert({ color: 'success', message: `Password reset email sent to ${user.email || 'user'}.` })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setResetPwLoading(false)
      setResetPwModal({ visible: false, user: null })
    }
  }

  // =====================
  // HELPERS
  // =====================
  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    updateURL(1, statusFilter, value)
  }

  const handleStatusFilter = (e) => {
    const value = e.target.value
    setStatusFilter(value)
    updateURL(1, value, searchTerm)
  }

  const handlePageChange = (newPage) => {
    updateURL(newPage, statusFilter, searchTerm)
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

  // =====================
  // RENDER
  // =====================
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
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small me-2">{totalCount} total users</span>
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  <CIcon icon={cilUserPlus} className="me-1" /> Create User
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
                      placeholder="Search by name, email or phone..."
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
                        <CTableHeaderCell>Joined</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {users.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={7} className="text-center text-body-secondary py-4">
                            No users found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        users.map((user) => (
                          <CTableRow key={user.id}>
                            <CTableDataCell
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/${rolePrefix}/users/${user.id}`)}
                            >
                              <span className="text-body-secondary small">{user.email || '-'}</span>
                            </CTableDataCell>
                            <CTableDataCell
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/${rolePrefix}/users/${user.id}`)}
                            >
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
                              {new Date(user.created_at).toLocaleDateString()}
                            </CTableDataCell>
                            <CTableDataCell>
                              <div className="d-flex gap-1 flex-wrap">
                                {/* Edit */}
                                <CTooltip content="Edit user">
                                  <CButton
                                    color="info"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditModal(user)
                                    }}
                                  >
                                    <CIcon icon={cilPencil} size="sm" />
                                  </CButton>
                                </CTooltip>

                                {/* Reset Password */}
                                <CTooltip content="Reset password">
                                  <CButton
                                    color="secondary"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setResetPwModal({ visible: true, user })
                                    }}
                                  >
                                    <CIcon icon={cilLockLocked} size="sm" />
                                  </CButton>
                                </CTooltip>

                                {/* Suspend / Unsuspend */}
                                {/* Only show suspend/unsuspend for super admins if current user is also super admin */}
                                {user.account_status === 'active' && (!user.is_super_admin || isCurrentUserSuperAdmin) && (
                                  <CTooltip content="Suspend user">
                                    <CButton
                                      color="warning"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActionModal({ visible: true, user, action: 'suspend' })
                                      }}
                                    >
                                      <CIcon icon={cilBan} size="sm" />
                                    </CButton>
                                  </CTooltip>
                                )}
                                {user.account_status === 'suspended' && (!user.is_super_admin || isCurrentUserSuperAdmin) && (
                                  <CTooltip content="Unsuspend user">
                                    <CButton
                                      color="success"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActionModal({ visible: true, user, action: 'unsuspend' })
                                      }}
                                    >
                                      <CIcon icon={cilCheckCircle} size="sm" />
                                    </CButton>
                                  </CTooltip>
                                )}

                                {/* Delete */}
                                {/* Hide delete button for super admins */}
                                {user.account_status !== 'deleted' && !user.is_super_admin && (
                                  <CTooltip content="Delete user">
                                    <CButton
                                      color="danger"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActionModal({ visible: true, user, action: 'delete' })
                                      }}
                                    >
                                      <CIcon icon={cilTrash} size="sm" />
                                    </CButton>
                                  </CTooltip>
                                )}
                              </div>
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
                          onClick={() => handlePageChange(page)}
                        >
                          Previous
                        </CButton>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages - 1}
                          onClick={() => handlePageChange(page + 2)}
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
      {/* CREATE USER MODAL        */}
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
            Create New User
          </CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreateUser}>
          <CModalBody>
            {createSuccess ? (
              <CAlert color="success">
                <h6 className="alert-heading">User Created!</h6>
                <p>{createSuccess.message}</p>
                <p>
                  <strong>Email sent:</strong>{' '}
                  <CBadge color={createSuccess.emailSent ? 'success' : 'warning'}>
                    {createSuccess.emailSent ? 'Yes' : 'Failed (check SMTP settings)'}
                  </CBadge>
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
                      placeholder="user@example.com"
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
                  <CCol md={4}>
                    <CFormLabel>Country Code</CFormLabel>
                    <CFormSelect
                      value={createForm.country_code}
                      onChange={(e) => setCreateForm({ ...createForm, country_code: e.target.value })}
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
                      placeholder="3001234567"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
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
                        value={
                          createForm.generate_password ? generatedPassword : createForm.password
                        }
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
                      This password will be emailed to the user along with their account details.
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
                  'Create User'
                )}
              </CButton>
            )}
          </CModalFooter>
        </CForm>
      </CModal>

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
      {/* ACTION MODAL (suspend/unsuspend/delete) */}
      {/* ======================== */}
      <CModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, user: null, action: '' })}
      >
        <CModalHeader>
          <CModalTitle>
            {actionModal.action === 'suspend'
              ? 'Suspend User'
              : actionModal.action === 'unsuspend'
                ? 'Unsuspend User'
                : 'Delete User'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to {actionModal.action}{' '}
          <strong>
            {actionModal.user?.email ||
              `${actionModal.user?.first_name || ''} ${actionModal.user?.last_name || ''}`.trim() ||
              'this user'}
          </strong>
          ?
          {actionModal.action === 'suspend' && (
            <p className="text-body-secondary mt-2 small">
              This will block the user from accessing their account.
            </p>
          )}
          {actionModal.action === 'delete' && (
            <p className="text-danger mt-2 small">
              This will soft-delete the user. Their data will be preserved but marked as deleted.
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
            color={
              actionModal.action === 'delete'
                ? 'danger'
                : actionModal.action === 'suspend'
                  ? 'warning'
                  : 'success'
            }
            onClick={handleUserAction}
            disabled={actionLoading}
          >
            {actionLoading ? <CSpinner size="sm" /> : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* ======================== */}
      {/* RESET PASSWORD MODAL     */}
      {/* ======================== */}
      <CModal
        visible={resetPwModal.visible}
        onClose={() => setResetPwModal({ visible: false, user: null })}
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilLockLocked} className="me-2" />
            Reset Password
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          This will send a password reset email to{' '}
          <strong>{resetPwModal.user?.email || 'the user'}</strong>. The user will receive a link to
          set a new password.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setResetPwModal({ visible: false, user: null })}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleResetPassword} disabled={resetPwLoading}>
            {resetPwLoading ? <CSpinner size="sm" /> : 'Send Reset Email'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default UsersList
