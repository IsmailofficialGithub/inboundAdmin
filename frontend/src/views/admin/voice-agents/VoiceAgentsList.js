import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CSpinner, CBadge,
  CInputGroup, CInputGroupText, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch, cilMicrophone, cilCheckCircle, cilBan, cilTrash, cilPencil, cilInfo,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { voiceAgentsAPI } from '../../../utils/api'

const VoiceAgentsList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'ops'].includes(adminProfile?.role)
  const canDelete = adminProfile?.role === 'super_admin'

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Action modal
  const [actionModal, setActionModal] = useState({ visible: false, agent: null, action: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (typeFilter !== 'all') params.agent_type = typeFilter
      if (searchTerm) params.search = searchTerm

      const data = await voiceAgentsAPI.list(params)
      setAgents(data.agents || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Fetch agents error:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, typeFilter, searchTerm, pageSize])

  const updateURL = useCallback((newPage, newStatus, newType, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    if (newType && newType !== 'all') params.set('type', newType)
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  const handleAction = async () => {
    const { agent, action } = actionModal
    if (!agent || !action) return
    setActionLoading(true)
    try {
      if (action === 'activate') {
        await voiceAgentsAPI.activate(agent.id)
        setAlert({ color: 'success', message: `Agent "${agent.name}" activated.` })
      } else if (action === 'deactivate') {
        await voiceAgentsAPI.deactivate(agent.id)
        setAlert({ color: 'success', message: `Agent "${agent.name}" deactivated.` })
      } else if (action === 'delete') {
        await voiceAgentsAPI.delete(agent.id)
        setAlert({ color: 'success', message: `Agent "${agent.name}" deleted.` })
      }
      fetchAgents()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setActionLoading(false)
      setActionModal({ visible: false, agent: null, action: '' })
    }
  }

  const getStatusBadge = (status) => {
    const map = { active: 'success', inactive: 'secondary', archived: 'danger', testing: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  const getTypeBadge = (type) => {
    const map = { sales: 'primary', support: 'info', booking: 'warning', general: 'secondary' }
    return type ? <CBadge color={map[type] || 'secondary'}>{type}</CBadge> : <span className="text-body-secondary">-</span>
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilMicrophone} className="me-2" />
                Voice Agents
              </strong>
              <span className="text-body-secondary small">{totalCount} total agents</span>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CRow className="mb-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                    <CFormInput
                      placeholder="Search by name, company, phone..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); updateURL(1, statusFilter, typeFilter, e.target.value) }}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); updateURL(1, e.target.value, typeFilter, searchTerm) }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="testing">Testing</option>
                    <option value="archived">Archived</option>
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormSelect
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); updateURL(1, statusFilter, e.target.value, searchTerm) }}
                  >
                    <option value="all">All Types</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="booking">Booking</option>
                    <option value="general">General</option>
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
                        <CTableHeaderCell>Name</CTableHeaderCell>
                        <CTableHeaderCell>Owner</CTableHeaderCell>
                        <CTableHeaderCell>Type</CTableHeaderCell>
                        <CTableHeaderCell>Phone</CTableHeaderCell>
                        <CTableHeaderCell>Model</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {agents.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canEdit ? 8 : 7} className="text-center text-body-secondary py-4">
                            No voice agents found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        agents.map((agent) => (
                          <CTableRow key={agent.id}>
                            <CTableDataCell
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/${rolePrefix}/voice-agents/${agent.id}`)}
                            >
                              <div className="fw-semibold">{agent.name}</div>
                              {agent.company_name && (
                                <div className="small text-body-secondary">{agent.company_name}</div>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <span className="text-body-secondary small">{agent.owner_email || '-'}</span>
                            </CTableDataCell>
                            <CTableDataCell>{getTypeBadge(agent.agent_type)}</CTableDataCell>
                            <CTableDataCell className="small">{agent.phone_number}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color="dark" className="text-uppercase" style={{ fontSize: '0.7rem' }}>{agent.model}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell>{getStatusBadge(agent.status)}</CTableDataCell>
                            <CTableDataCell className="small">
                              {new Date(agent.created_at).toLocaleDateString()}
                            </CTableDataCell>
                            {canEdit && (
                              <CTableDataCell>
                                <div className="d-flex gap-1">
                                  <CTooltip content="View details">
                                    <CButton color="info" size="sm" variant="ghost"
                                      onClick={() => navigate(`/${rolePrefix}/voice-agents/${agent.id}`)}>
                                      <CIcon icon={cilInfo} size="sm" />
                                    </CButton>
                                  </CTooltip>
                                  {agent.status === 'active' && (
                                    <CTooltip content="Deactivate">
                                      <CButton color="warning" size="sm" variant="ghost"
                                        onClick={() => setActionModal({ visible: true, agent, action: 'deactivate' })}>
                                        <CIcon icon={cilBan} size="sm" />
                                      </CButton>
                                    </CTooltip>
                                  )}
                                  {(agent.status === 'inactive' || agent.status === 'testing') && (
                                    <CTooltip content="Activate">
                                      <CButton color="success" size="sm" variant="ghost"
                                        onClick={() => setActionModal({ visible: true, agent, action: 'activate' })}>
                                        <CIcon icon={cilCheckCircle} size="sm" />
                                      </CButton>
                                    </CTooltip>
                                  )}
                                  {canDelete && agent.status !== 'archived' && (
                                    <CTooltip content="Delete">
                                      <CButton color="danger" size="sm" variant="ghost"
                                        onClick={() => setActionModal({ visible: true, agent, action: 'delete' })}>
                                        <CIcon icon={cilTrash} size="sm" />
                                      </CButton>
                                    </CTooltip>
                                  )}
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
                          disabled={page === 0} onClick={() => updateURL(page, statusFilter, typeFilter, searchTerm)}>
                          Previous
                        </CButton>
                        <CButton color="primary" variant="outline" size="sm"
                          disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, statusFilter, typeFilter, searchTerm)}>
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

      {/* Action Confirm Modal */}
      <CModal visible={actionModal.visible} onClose={() => setActionModal({ visible: false, agent: null, action: '' })}>
        <CModalHeader>
          <CModalTitle>
            {actionModal.action === 'activate' ? 'Activate Agent' : actionModal.action === 'deactivate' ? 'Deactivate Agent' : 'Delete Agent'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to {actionModal.action} <strong>{actionModal.agent?.name}</strong>?
          {actionModal.action === 'delete' && (
            <p className="text-danger mt-2 small">This will soft-delete the agent. It can be restored later.</p>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setActionModal({ visible: false, agent: null, action: '' })}>Cancel</CButton>
          <CButton
            color={actionModal.action === 'delete' ? 'danger' : actionModal.action === 'deactivate' ? 'warning' : 'success'}
            onClick={handleAction} disabled={actionLoading}
          >
            {actionLoading ? <CSpinner size="sm" /> : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default VoiceAgentsList
