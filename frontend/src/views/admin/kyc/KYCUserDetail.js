import React, { useState, useEffect, useCallback } from 'react'
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
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilCheckCircle,
  cilX,
  cilInfo,
  cilPencil,
  cilHistory,
  cilImage,
  cilCloudDownload,
  cilMagnifyingGlass,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { kycAPI } from '../../../utils/api'

const KYCUserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rolePrefix } = useAuth()

  const [user, setUser] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [documents, setDocuments] = useState({})
  const [documentsLoading, setDocumentsLoading] = useState(false)
  const [viewDocumentModal, setViewDocumentModal] = useState({ visible: false, url: '', name: '' })

  // Action modal
  const [actionModal, setActionModal] = useState({ visible: false, action: '' })
  const [actionLoading, setActionLoading] = useState(false)
  const [actionForm, setActionForm] = useState({ notes: '', reason: '' })

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({})

  // =====================
  // FETCH USER DATA
  // =====================
  const fetchUserData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await kycAPI.getUserDetails(id)

      if (!data.user) {
        navigate(`/${rolePrefix}/kyc`)
        return
      }

      setUser(data.user)
      setHistory(data.history || [])
    } catch (err) {
      console.error('Error fetching KYC user:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [id, navigate, rolePrefix])

  // =====================
  // FETCH DOCUMENTS
  // =====================
  const fetchDocuments = useCallback(async () => {
    setDocumentsLoading(true)
    try {
      const data = await kycAPI.getDocuments(id)
      setDocuments(data.documents || {})
    } catch (err) {
      console.error('Error fetching KYC documents:', err)
      // Don't show error alert for documents, just log it
    } finally {
      setDocumentsLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      fetchUserData()
      fetchDocuments()
    }
  }, [id, fetchUserData, fetchDocuments])

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const isImageFile = (fileName) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'))
    return imageExtensions.includes(ext)
  }

  const openDocumentViewer = (url, name) => {
    setViewDocumentModal({ visible: true, url, name })
  }

  // =====================
  // KYC ACTIONS
  // =====================
  const handleAction = async () => {
    setActionLoading(true)
    try {
      const { action } = actionModal
      if (action === 'approve') {
        await kycAPI.approve(id, { notes: actionForm.notes })
      } else if (action === 'reject') {
        await kycAPI.reject(id, { reason: actionForm.reason, notes: actionForm.notes })
      } else if (action === 'request-info') {
        await kycAPI.requestInfo(id, { notes: actionForm.notes })
      }
      setAlert({ color: 'success', message: 'Action completed successfully' })
      setActionModal({ visible: false, action: '' })
      setActionForm({ notes: '', reason: '' })
      fetchUserData()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
    }
  }

  // =====================
  // EDIT KYC INFO
  // =====================
  const openEditModal = () => {
    setEditForm({
      company_name: user.company_name || '',
      company_registration_number: user.company_registration_number || '',
      company_address: user.company_address || '',
      company_city: user.company_city || '',
      company_state: user.company_state || '',
      company_country: user.company_country || '',
      company_postal_code: user.company_postal_code || '',
      company_website: user.company_website || '',
      tax_id: user.tax_id || '',
      kyc_status: user.kyc_status || 'pending',
    })
    setEditModal(true)
  }

  const handleUpdateKYC = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      await kycAPI.update(id, editForm)
      setAlert({ color: 'success', message: 'KYC information updated successfully!' })
      setEditModal(false)
      fetchUserData()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  // =====================
  // STATUS BADGE
  // =====================
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

  // =====================
  // RENDER
  // =====================
  return (
    <>
      {/* Back Button */}
      <CButton
        color="link"
        className="mb-3 ps-0"
        onClick={() => navigate(`/${rolePrefix}/kyc`)}
      >
        <CIcon icon={cilArrowLeft} className="me-1" /> Back to KYC Moderation
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
                {getStatusBadge(user.kyc_status)}
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

              {/* Approve Button */}
              {user.kyc_status !== 'approved' && (
                <CButton
                  color="success"
                  size="sm"
                  className="me-2"
                  onClick={() => setActionModal({ visible: true, action: 'approve' })}
                >
                  <CIcon icon={cilCheckCircle} size="sm" /> Approve
                </CButton>
              )}

              {/* Reject Button */}
              {user.kyc_status !== 'rejected' && (
                <CButton
                  color="danger"
                  size="sm"
                  className="me-2"
                  onClick={() => setActionModal({ visible: true, action: 'reject' })}
                >
                  <CIcon icon={cilX} size="sm" /> Reject
                </CButton>
              )}

              {/* Request Info Button */}
              {user.kyc_status !== 'needs_info' && (
                <CButton
                  color="info"
                  size="sm"
                  onClick={() => setActionModal({ visible: true, action: 'request-info' })}
                >
                  <CIcon icon={cilInfo} size="sm" /> Request Info
                </CButton>
              )}
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>

      {/* User Information */}
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
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Company Information</strong>
            </CCardHeader>
            <CCardBody>
              <CListGroup flush>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Company Name</span>
                  <strong>{user.company_name || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Registration Number</span>
                  <strong>{user.company_registration_number || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Tax ID</span>
                  <strong>{user.tax_id || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Address</span>
                  <strong>{user.company_address || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">City</span>
                  <strong>{user.company_city || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">State</span>
                  <strong>{user.company_state || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Country</span>
                  <strong>{user.company_country || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Postal Code</span>
                  <strong>{user.company_postal_code || '-'}</strong>
                </CListGroupItem>
                <CListGroupItem className="d-flex justify-content-between">
                  <span className="text-body-secondary">Website</span>
                  <strong>
                    {user.company_website ? (
                      <a href={user.company_website} target="_blank" rel="noopener noreferrer">
                        {user.company_website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </strong>
                </CListGroupItem>
              </CListGroup>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* KYC Status Information */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>KYC Status Information</strong>
        </CCardHeader>
        <CCardBody>
          <CListGroup flush>
            <CListGroupItem className="d-flex justify-content-between">
              <span className="text-body-secondary">KYC Status</span>
              {getStatusBadge(user.kyc_status)}
            </CListGroupItem>
            {user.kyc_verified_at && (
              <CListGroupItem className="d-flex justify-content-between">
                <span className="text-body-secondary">Verified At</span>
                <strong>{new Date(user.kyc_verified_at).toLocaleString()}</strong>
              </CListGroupItem>
            )}
            {user.kyc_verified_by && user.verified_by_admin && (
              <CListGroupItem className="d-flex justify-content-between">
                <span className="text-body-secondary">Verified By</span>
                <strong>
                  {user.verified_by_admin.first_name} {user.verified_by_admin.last_name} (
                  {user.verified_by_admin.email})
                </strong>
              </CListGroupItem>
            )}
            {user.kyc_rejection_reason && (
              <CListGroupItem className="d-flex justify-content-between">
                <span className="text-body-secondary">Rejection Reason</span>
                <strong>{user.kyc_rejection_reason}</strong>
              </CListGroupItem>
            )}
          </CListGroup>
        </CCardBody>
      </CCard>

      {/* KYC Documents */}
      <CCard className="mb-4">
        <CCardHeader>
          <strong>
            <CIcon icon={cilImage} className="me-2" />
            KYC Documents
          </strong>
        </CCardHeader>
        <CCardBody>
          {documentsLoading ? (
            <div className="text-center py-3">
              <CSpinner size="sm" /> Loading documents...
            </div>
          ) : Object.keys(documents).length === 0 ? (
            <p className="text-body-secondary">No documents found for this user.</p>
          ) : (
            Object.entries(documents).map(([documentType, files]) => (
              <div key={documentType} className="mb-4">
                <h6 className="text-uppercase text-body-secondary mb-3">
                  {documentType.replace('_', ' ')}
                </h6>
                <CRow>
                  {files.map((file, index) => (
                    <CCol md={4} sm={6} key={index} className="mb-3">
                      <CCard>
                        <CCardBody className="p-2">
                          {isImageFile(file.name) ? (
                            <div
                              className="mb-2"
                              style={{
                                width: '100%',
                                height: '200px',
                                overflow: 'hidden',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                              }}
                              onClick={() => openDocumentViewer(file.url, file.name)}
                            >
                              <img
                                src={file.url}
                                alt={file.name}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.parentElement.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-body-secondary">Preview not available</div>'
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              className="mb-2 d-flex align-items-center justify-content-center"
                              style={{
                                width: '100%',
                                height: '200px',
                                backgroundColor: '#f8f9fa',
                                borderRadius: '4px',
                              }}
                            >
                              <CIcon icon={cilImage} size="3xl" className="text-body-secondary" />
                            </div>
                          )}
                          <div className="small">
                            <div className="fw-semibold text-truncate" title={file.name}>
                              {file.name}
                            </div>
                            <div className="text-body-secondary">
                              {formatFileSize(file.size)}
                              {file.created_at && (
                                <> &middot; {new Date(file.created_at).toLocaleDateString()}</>
                              )}
                            </div>
                            <div className="mt-2 d-flex gap-2">
                              <CButton
                                color="primary"
                                size="sm"
                                variant="outline"
                                onClick={() => openDocumentViewer(file.url, file.name)}
                              >
                                <CIcon icon={cilMagnifyingGlass} size="sm" className="me-1" />
                                View
                              </CButton>
                              <CButton
                                color="secondary"
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <CIcon icon={cilCloudDownload} size="sm" className="me-1" />
                                Download
                              </CButton>
                            </div>
                          </div>
                        </CCardBody>
                      </CCard>
                    </CCol>
                  ))}
                </CRow>
              </div>
            ))
          )}
        </CCardBody>
      </CCard>

      {/* Moderation History */}
      <CCard>
        <CCardHeader>
          <strong>
            <CIcon icon={cilHistory} className="me-2" />
            Moderation History
          </strong>
        </CCardHeader>
        <CCardBody>
          {history.length === 0 ? (
            <p className="text-body-secondary">No moderation history available.</p>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>Action</CTableHeaderCell>
                  <CTableHeaderCell>Previous Status</CTableHeaderCell>
                  <CTableHeaderCell>New Status</CTableHeaderCell>
                  <CTableHeaderCell>Admin</CTableHeaderCell>
                  <CTableHeaderCell>Notes</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {history.map((item) => (
                  <CTableRow key={item.id}>
                    <CTableDataCell>
                      {new Date(item.created_at).toLocaleString()}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="info">{item.action}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell>
                      {item.previous_status ? getStatusBadge(item.previous_status) : '-'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {item.new_status ? getStatusBadge(item.new_status) : '-'}
                    </CTableDataCell>
                    <CTableDataCell>
                      {item.admin
                        ? `${item.admin.first_name || ''} ${item.admin.last_name || ''} (${
                            item.admin.email || ''
                          })`
                        : '-'}
                    </CTableDataCell>
                    <CTableDataCell>{item.notes || '-'}</CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Action Modal */}
      <CModal
        visible={actionModal.visible}
        onClose={() => setActionModal({ visible: false, action: '' })}
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
            onClick={() => setActionModal({ visible: false, action: '' })}
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

      {/* Edit Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)}>
        <CModalHeader>
          <CModalTitle>Edit KYC Information</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleUpdateKYC}>
          <CModalBody>
            <CFormLabel>Company Name</CFormLabel>
            <CFormInput
              value={editForm.company_name}
              onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
              className="mb-3"
            />

            <CFormLabel>Company Registration Number</CFormLabel>
            <CFormInput
              value={editForm.company_registration_number}
              onChange={(e) =>
                setEditForm({ ...editForm, company_registration_number: e.target.value })
              }
              className="mb-3"
            />

            <CFormLabel>Tax ID</CFormLabel>
            <CFormInput
              value={editForm.tax_id}
              onChange={(e) => setEditForm({ ...editForm, tax_id: e.target.value })}
              className="mb-3"
            />

            <CFormLabel>Company Address</CFormLabel>
            <CFormInput
              value={editForm.company_address}
              onChange={(e) => setEditForm({ ...editForm, company_address: e.target.value })}
              className="mb-3"
            />

            <CRow>
              <CCol md={6}>
                <CFormLabel>City</CFormLabel>
                <CFormInput
                  value={editForm.company_city}
                  onChange={(e) => setEditForm({ ...editForm, company_city: e.target.value })}
                  className="mb-3"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>State</CFormLabel>
                <CFormInput
                  value={editForm.company_state}
                  onChange={(e) => setEditForm({ ...editForm, company_state: e.target.value })}
                  className="mb-3"
                />
              </CCol>
            </CRow>

            <CRow>
              <CCol md={6}>
                <CFormLabel>Country</CFormLabel>
                <CFormInput
                  value={editForm.company_country}
                  onChange={(e) => setEditForm({ ...editForm, company_country: e.target.value })}
                  className="mb-3"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Postal Code</CFormLabel>
                <CFormInput
                  value={editForm.company_postal_code}
                  onChange={(e) =>
                    setEditForm({ ...editForm, company_postal_code: e.target.value })
                  }
                  className="mb-3"
                />
              </CCol>
            </CRow>

            <CFormLabel>Website</CFormLabel>
            <CFormInput
              value={editForm.company_website}
              onChange={(e) => setEditForm({ ...editForm, company_website: e.target.value })}
              className="mb-3"
            />

            <CFormLabel>KYC Status</CFormLabel>
            <CFormSelect
              value={editForm.kyc_status}
              onChange={(e) => setEditForm({ ...editForm, kyc_status: e.target.value })}
              className="mb-3"
            >
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_info">Needs Info</option>
            </CFormSelect>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </CButton>
            <CButton color="primary" type="submit" disabled={editLoading}>
              {editLoading ? <CSpinner size="sm" /> : 'Update'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Document Viewer Modal */}
      <CModal
        visible={viewDocumentModal.visible}
        onClose={() => setViewDocumentModal({ visible: false, url: '', name: '' })}
        size="xl"
      >
        <CModalHeader>
          <CModalTitle>{viewDocumentModal.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {isImageFile(viewDocumentModal.name) ? (
            <img
              src={viewDocumentModal.url}
              alt={viewDocumentModal.name}
              style={{ width: '100%', height: 'auto', maxHeight: '70vh', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = '<div class="text-center py-5 text-body-secondary">Failed to load image</div>'
              }}
            />
          ) : (
            <div className="text-center py-5">
              <p className="text-body-secondary mb-3">Preview not available for this file type.</p>
              <CButton
                color="primary"
                onClick={() => window.open(viewDocumentModal.url, '_blank')}
              >
                <CIcon icon={cilCloudDownload} className="me-2" />
                Open in New Tab
              </CButton>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setViewDocumentModal({ visible: false, url: '', name: '' })}
          >
            Close
          </CButton>
          <CButton
            color="primary"
            onClick={() => window.open(viewDocumentModal.url, '_blank')}
          >
            <CIcon icon={cilCloudDownload} className="me-2" />
            Download
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default KYCUserDetail
