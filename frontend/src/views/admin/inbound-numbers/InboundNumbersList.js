import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CSpinner, CBadge, CAlert,
  CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPhone, cilInfo, cilPencil, cilLink } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { inboundNumbersAPI, voiceAgentsAPI } from '../../../utils/api'

const InboundNumbersList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'ops'].includes(adminProfile?.role)

  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [providerFilter, setProviderFilter] = useState(searchParams.get('provider') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Assign modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignNumber, setAssignNumber] = useState(null)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [availableAgents, setAvailableAgents] = useState([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', phone_label: '', status: '', call_forwarding_number: '', notes: '' })

  const fetchNumbers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (providerFilter !== 'all') params.provider = providerFilter
      if (searchTerm) params.search = searchTerm
      const data = await inboundNumbersAPI.list(params)
      setNumbers(data.numbers || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, providerFilter, searchTerm, pageSize])

  const updateURL = useCallback((newPage, newStatus, newProvider, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    if (newProvider && newProvider !== 'all') params.set('provider', newProvider)
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchNumbers() }, [fetchNumbers])

  const openAssignModal = async (num) => {
    setAssignNumber(num)
    setSelectedAgentId(num.assigned_to_agent_id || '')
    setAssignModal(true)
    setAgentsLoading(true)
    try {
      const data = await voiceAgentsAPI.list({ limit: 200 })
      setAvailableAgents(data.agents || [])
    } catch (err) {
      console.error('Failed to load agents:', err)
    } finally {
      setAgentsLoading(false)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssignLoading(true)
    try {
      await inboundNumbersAPI.assign(assignNumber.id, selectedAgentId || null)
      setAlert({ color: 'success', message: selectedAgentId ? 'Number assigned to agent!' : 'Number unassigned!' })
      setAssignModal(false)
      fetchNumbers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setAssignLoading(false)
    }
  }

  const openEditModal = (num) => {
    setEditForm({
      id: num.id,
      phone_label: num.phone_label || '',
      status: num.status,
      call_forwarding_number: num.call_forwarding_number || '',
      notes: num.notes || '',
    })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const { id, ...data } = editForm
      await inboundNumbersAPI.update(id, data)
      setAlert({ color: 'success', message: 'Number updated successfully!' })
      setEditModal(false)
      fetchNumbers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = { active: 'success', inactive: 'secondary', suspended: 'warning', error: 'danger', pending: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  const getHealthBadge = (status) => {
    const map = { healthy: 'success', unhealthy: 'danger', unknown: 'secondary', testing: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong><CIcon icon={cilPhone} className="me-2" />Inbound Numbers</strong>
              <span className="text-body-secondary small">{totalCount} numbers</span>
            </CCardHeader>
            <CCardBody>
              {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

              <CRow className="mb-3">
                <CCol md={3}>
                  <CInputGroup>
                    <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                    <CFormInput placeholder="Search phone numbers..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); updateURL(1, statusFilter, providerFilter, e.target.value) }} />
                  </CInputGroup>
                </CCol>
                <CCol md={2}>
                  <CFormSelect value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); updateURL(1, e.target.value, providerFilter, searchTerm) }}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="error">Error</option>
                    <option value="pending">Pending</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormSelect value={providerFilter}
                    onChange={(e) => { setProviderFilter(e.target.value); updateURL(1, statusFilter, e.target.value, searchTerm) }}>
                    <option value="all">All Providers</option>
                    <option value="twilio">Twilio</option>
                    <option value="vonage">Vonage</option>
                    <option value="telnyx">Telnyx</option>
                    <option value="callhippo">CallHippo</option>
                    <option value="other">Other</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {loading ? (
                <div className="text-center py-5"><CSpinner color="primary" /></div>
              ) : (
                <>
                  <CTable hover responsive align="middle">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Number</CTableHeaderCell>
                        <CTableHeaderCell>Label</CTableHeaderCell>
                        <CTableHeaderCell>Owner</CTableHeaderCell>
                        <CTableHeaderCell>Provider</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Health</CTableHeaderCell>
                        <CTableHeaderCell>Assigned Agent</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {numbers.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canEdit ? 9 : 8} className="text-center text-body-secondary py-4">
                            No inbound numbers found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        numbers.map((num) => (
                          <CTableRow key={num.id}>
                            <CTableDataCell className="fw-semibold">
                              {num.country_code}{num.phone_number}
                            </CTableDataCell>
                            <CTableDataCell className="small">{num.phone_label || '-'}</CTableDataCell>
                            <CTableDataCell><span className="text-body-secondary small">{num.owner_email || '-'}</span></CTableDataCell>
                            <CTableDataCell><CBadge color="dark">{num.provider}</CBadge></CTableDataCell>
                            <CTableDataCell>{getStatusBadge(num.status)}</CTableDataCell>
                            <CTableDataCell>{getHealthBadge(num.health_status)}</CTableDataCell>
                            <CTableDataCell className="small">{num.agent_name || <span className="text-body-secondary">Unassigned</span>}</CTableDataCell>
                            <CTableDataCell className="small">{new Date(num.created_at).toLocaleDateString()}</CTableDataCell>
                            {canEdit && (
                              <CTableDataCell>
                                <div className="d-flex gap-1">
                                  <CButton color="info" size="sm" variant="ghost"
                                    onClick={() => navigate(`/${rolePrefix}/inbound-numbers/${num.id}`)}>
                                    <CIcon icon={cilInfo} size="sm" />
                                  </CButton>
                                  <CButton color="primary" size="sm" variant="ghost" onClick={() => openEditModal(num)}>
                                    <CIcon icon={cilPencil} size="sm" />
                                  </CButton>
                                  <CButton color="warning" size="sm" variant="ghost" onClick={() => openAssignModal(num)}>
                                    <CIcon icon={cilLink} size="sm" />
                                  </CButton>
                                </div>
                              </CTableDataCell>
                            )}
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-body-secondary small">Page {page + 1} of {totalPages}</span>
                      <div>
                        <CButton color="primary" variant="outline" size="sm" className="me-2"
                          disabled={page === 0} onClick={() => updateURL(page, statusFilter, providerFilter, searchTerm)}>Previous</CButton>
                        <CButton color="primary" variant="outline" size="sm"
                          disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, statusFilter, providerFilter, searchTerm)}>Next</CButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Assign to Agent Modal */}
      <CModal visible={assignModal} onClose={() => setAssignModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Assign Number to Agent</CModalTitle></CModalHeader>
        <CForm onSubmit={handleAssign}>
          <CModalBody>
            <p>Number: <strong>{assignNumber?.country_code}{assignNumber?.phone_number}</strong></p>
            <div className="mb-3">
              <CFormLabel>Select Agent</CFormLabel>
              {agentsLoading ? (
                <div className="text-center py-2"><CSpinner size="sm" /></div>
              ) : (
                <CFormSelect value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                  <option value="">-- Unassign --</option>
                  {availableAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
                  ))}
                </CFormSelect>
              )}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setAssignModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={assignLoading}>
              {assignLoading ? <><CSpinner size="sm" className="me-1" /> Assigning...</> : 'Save Assignment'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Edit Number Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Edit Inbound Number</CModalTitle></CModalHeader>
        <CForm onSubmit={handleEdit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Label</CFormLabel>
              <CFormInput value={editForm.phone_label} onChange={(e) => setEditForm({ ...editForm, phone_label: e.target.value })} />
            </div>
            <div className="mb-3">
              <CFormLabel>Status</CFormLabel>
              <CFormSelect value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Call Forwarding Number</CFormLabel>
              <CFormInput value={editForm.call_forwarding_number}
                onChange={(e) => setEditForm({ ...editForm, call_forwarding_number: e.target.value })} />
            </div>
            <div className="mb-3">
              <CFormLabel>Notes</CFormLabel>
              <CFormInput value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? <><CSpinner size="sm" className="me-1" /> Saving...</> : 'Save Changes'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default InboundNumbersList
