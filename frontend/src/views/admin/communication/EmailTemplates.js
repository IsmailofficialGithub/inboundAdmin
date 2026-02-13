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
  CSpinner,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormTextarea,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilCheckCircle, cilMagnifyingGlass } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const EmailTemplates = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'ops'].includes(adminProfile?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Edit/Create modal
  const [editModal, setEditModal] = useState({ visible: false, template: null })
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    description: '',
    is_default: false,
    accent_color: '#4F46E5',
    design_style: 'modern',
    company_name: '',
  })

  // Preview modal
  const [previewModal, setPreviewModal] = useState({ visible: false, template: null })

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })

      const response = await fetch(`${API_BASE}/email-templates?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status >= 500) {
          toast.error(data.error || 'Server error. Please try again later.')
        } else if (response.status === 401 || response.status === 403) {
          toast.error('You do not have permission to view this page.')
        }
        setTemplates([])
        setTotalCount(0)
        return
      }

      setTemplates(data.templates || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setTemplates([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleOpenEdit = (template = null) => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        body: template.body,
        description: template.description || '',
        is_default: template.is_default,
        accent_color: template.accent_color,
        design_style: template.design_style,
        company_name: template.company_name || '',
      })
      setEditModal({ visible: true, template })
    } else {
      setFormData({
        name: '',
        subject: '',
        body: '',
        description: '',
        is_default: false,
        accent_color: '#4F46E5',
        design_style: 'modern',
        company_name: '',
      })
      setEditModal({ visible: true, template: null })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAuthToken()
      const url = editModal.template
        ? `${API_BASE}/email-templates/${editModal.template.id}`
        : `${API_BASE}/email-templates`
      const method = editModal.template ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save template')

      toast.success(`Template ${editModal.template ? 'updated' : 'created'} successfully`)
      setEditModal({ visible: false, template: null })
      fetchTemplates()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/email-templates/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete template')

      toast.success('Template deleted successfully')
      fetchTemplates()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (template.name && template.name.toLowerCase().includes(search)) ||
      (template.subject && template.subject.toLowerCase().includes(search)) ||
      (template.user_email && template.user_email.toLowerCase().includes(search))
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
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Email Templates</strong>
              {canEdit && (
                <CButton color="primary" onClick={() => handleOpenEdit()}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Template
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search by name or subject..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Subject</CTableHeaderCell>
                    <CTableHeaderCell>Default</CTableHeaderCell>
                    <CTableHeaderCell>Style</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredTemplates.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No templates found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredTemplates.map((template) => (
                      <CTableRow key={template.id}>
                        <CTableDataCell>{template.name}</CTableDataCell>
                        <CTableDataCell>{template.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{template.subject}</CTableDataCell>
                        <CTableDataCell>
                          {template.is_default ? (
                            <CBadge color="primary">
                              <CIcon icon={cilCheckCircle} className="me-1" />
                              Default
                            </CBadge>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{template.design_style}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{new Date(template.created_at).toLocaleDateString()}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            size="sm"
                            className="me-2"
                            onClick={() => setPreviewModal({ visible: true, template })}
                          >
                            <CIcon icon={cilMagnifyingGlass} />
                          </CButton>
                          {canEdit && (
                            <>
                              <CButton
                                color="info"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEdit(template)}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton color="danger" size="sm" onClick={() => handleDelete(template.id)}>
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))
                  )}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Modal */}
      <CModal
        visible={editModal.visible}
        onClose={() => setEditModal({ visible: false, template: null })}
        size="xl"
      >
        <CModalHeader>
          <CModalTitle>{editModal.template ? 'Edit' : 'Create'} Email Template</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Template Name *</CFormLabel>
                <CFormInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Subject *</CFormLabel>
                <CFormInput
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Body (HTML) *</CFormLabel>
                <CFormTextarea
                  rows={10}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  required
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Accent Color</CFormLabel>
                <CFormInput
                  type="color"
                  value={formData.accent_color}
                  onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                  disabled={!canEdit}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Design Style</CFormLabel>
                <select
                  className="form-select"
                  value={formData.design_style}
                  onChange={(e) => setFormData({ ...formData, design_style: e.target.value })}
                  disabled={!canEdit}
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormCheck
                  label="Set as default template"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal({ visible: false, template: null })}>
            Cancel
          </CButton>
          {canEdit && (
            <CButton color="primary" onClick={handleSave} disabled={saving}>
              {saving ? <CSpinner size="sm" /> : 'Save'}
            </CButton>
          )}
        </CModalFooter>
      </CModal>

      {/* Preview Modal */}
      <CModal
        visible={previewModal.visible}
        onClose={() => setPreviewModal({ visible: false, template: null })}
        size="xl"
      >
        <CModalHeader>
          <CModalTitle>Email Template Preview</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {previewModal.template && (
            <div>
              <p>
                <strong>Subject:</strong> {previewModal.template.subject}
              </p>
              <hr />
              <div
                className="p-3 border rounded"
                style={{ maxHeight: '500px', overflow: 'auto' }}
                dangerouslySetInnerHTML={{ __html: previewModal.template.body }}
              />
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setPreviewModal({ visible: false, template: null })}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default EmailTemplates
