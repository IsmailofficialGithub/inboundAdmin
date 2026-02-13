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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilFile, cilInfo } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const KnowledgeBases = () => {
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [knowledgeBases, setKnowledgeBases] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ visible: false, kb: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchKnowledgeBases = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`${API_BASE}/knowledge-bases?${params}`, {
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
        setKnowledgeBases([])
        setTotalCount(0)
        return
      }

      setKnowledgeBases(data.knowledge_bases || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setKnowledgeBases([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  useEffect(() => {
    fetchKnowledgeBases()
  }, [fetchKnowledgeBases])

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/knowledge-bases/${deleteModal.kb.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete knowledge base')

      toast.success('Knowledge base deleted successfully')
      setDeleteModal({ visible: false, kb: null })
      fetchKnowledgeBases()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredKBs = knowledgeBases.filter((kb) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (kb.name && kb.name.toLowerCase().includes(search)) ||
      (kb.user_email && kb.user_email.toLowerCase().includes(search)) ||
      (kb.description && kb.description.toLowerCase().includes(search))
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
              <strong>Knowledge Bases</strong>
              {['super_admin', 'ops'].includes(adminProfile?.role) && (
                <CButton color="primary">
                  <CIcon icon={cilPlus} className="me-2" />
                  New Knowledge Base
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
                      placeholder="Search by name or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Name</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Documents</CTableHeaderCell>
                    <CTableHeaderCell>FAQs</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredKBs.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No knowledge bases found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredKBs.map((kb) => (
                      <CTableRow key={kb.id}>
                        <CTableDataCell>{kb.name}</CTableDataCell>
                        <CTableDataCell>{kb.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">
                            <CIcon icon={cilFile} className="me-1" />
                            {kb.document_count || 0}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="info">
                            <CIcon icon={cilInfo} className="me-1" />
                            {kb.faq_count || 0}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={kb.status === 'active' ? 'success' : 'secondary'}>
                            {kb.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{new Date(kb.created_at).toLocaleDateString()}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            size="sm"
                            className="me-2"
                            onClick={() => navigate(`/${rolePrefix}/knowledge/bases/${kb.id}`)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          {['super_admin', 'ops'].includes(adminProfile?.role) && (
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => setDeleteModal({ visible: true, kb })}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
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

      {/* Delete Modal */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, kb: null })}>
        <CModalHeader>
          <CModalTitle>Delete Knowledge Base</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to delete <strong>{deleteModal.kb?.name}</strong>?
          </p>
          <p className="text-muted">This will also delete all associated documents and FAQs.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, kb: null })}>
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

export default KnowledgeBases
