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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
  CForm,
  CFormLabel,
  CFormTextarea,
  CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilCog } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const AIPrompts = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ visible: false, prompt: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Create/Edit modal
  const [editModal, setEditModal] = useState({ visible: false, prompt: null })
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    system_prompt: '',
    status: 'draft',
    is_template: false,
    is_active: true,
  })

  const fetchPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`${API_BASE}/ai-prompts?${params}`, {
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
        setPrompts([])
        setTotalCount(0)
        return
      }

      setPrompts(data.prompts || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setPrompts([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, categoryFilter, statusFilter, pageSize])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAuthToken()
      const url = editModal.prompt
        ? `${API_BASE}/ai-prompts/${editModal.prompt.id}`
        : `${API_BASE}/ai-prompts`
      const method = editModal.prompt ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save prompt')

      toast.success(`Prompt ${editModal.prompt ? 'updated' : 'created'} successfully`)
      setEditModal({ visible: false, prompt: null })
      fetchPrompts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/ai-prompts/${deleteModal.prompt.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete prompt')

      toast.success('AI prompt deleted successfully')
      setDeleteModal({ visible: false, prompt: null })
      fetchPrompts()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredPrompts = prompts.filter((prompt) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (prompt.name && prompt.name.toLowerCase().includes(search)) ||
      (prompt.user_email && prompt.user_email.toLowerCase().includes(search)) ||
      (prompt.category && prompt.category.toLowerCase().includes(search))
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
              <strong>AI Prompts</strong>
              {['super_admin', 'ops'].includes(adminProfile?.role) && (
                <CButton
                  color="primary"
                  onClick={() => {
                    setFormData({
                      name: '',
                      category: 'general',
                      system_prompt: '',
                      status: 'draft',
                      is_template: false,
                      is_active: true,
                    })
                    setEditModal({ visible: true, prompt: null })
                  }}
                >
                  <CIcon icon={cilPlus} className="me-2" />
                  New Prompt
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    <option value="general">General</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Category</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Template</CTableHeaderCell>
                    <CTableHeaderCell>Usage</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredPrompts.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No prompts found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredPrompts.map((prompt) => (
                      <CTableRow key={prompt.id}>
                        <CTableDataCell>{prompt.name}</CTableDataCell>
                        <CTableDataCell>{prompt.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">{prompt.category}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={prompt.status === 'active' ? 'success' : 'secondary'}>
                            {prompt.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {prompt.is_template ? (
                            <CBadge color="primary">Template</CBadge>
                          ) : (
                            <CBadge color="secondary">Custom</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>{prompt.usage_count || 0}</CTableDataCell>
                        <CTableDataCell>
                          {['super_admin', 'ops'].includes(adminProfile?.role) && (
                            <>
                              <CButton
                                color="info"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                  setFormData({
                                    name: prompt.name,
                                    category: prompt.category,
                                    system_prompt: prompt.system_prompt || '',
                                    status: prompt.status,
                                    is_template: prompt.is_template,
                                    is_active: prompt.is_active,
                                  })
                                  setEditModal({ visible: true, prompt })
                                }}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => setDeleteModal({ visible: true, prompt })}
                              >
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

      {/* Create/Edit Modal */}
      <CModal
        visible={editModal.visible}
        onClose={() => setEditModal({ visible: false, prompt: null })}
        size="xl"
      >
        <CModalHeader>
          <CModalTitle>{editModal.prompt ? 'Edit' : 'Create'} AI Prompt</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Name *</CFormLabel>
                <CFormInput
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Prompt name"
                  required
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Category</CFormLabel>
                <CFormSelect
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>System Prompt *</CFormLabel>
                <CFormTextarea
                  rows={10}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                  placeholder="Enter the system prompt..."
                  required
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormCheck
                  label="Is Template"
                  checked={formData.is_template}
                  onChange={(e) => setFormData({ ...formData, is_template: e.target.checked })}
                />
              </CCol>
              <CCol>
                <CFormCheck
                  label="Active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal({ visible: false, prompt: null })}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.system_prompt}
          >
            {saving ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Modal */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, prompt: null })}>
        <CModalHeader>
          <CModalTitle>Delete AI Prompt</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to delete <strong>{deleteModal.prompt?.name}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, prompt: null })}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default AIPrompts
