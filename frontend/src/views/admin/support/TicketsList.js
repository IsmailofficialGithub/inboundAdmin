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
  CPagination,
  CPaginationItem,
  CFormCheck,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilInfo,
  cilPencil,
  cilTrash,
  cilFilter,
  cilCheckCircle,
  cilX,
  cilOptions,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { supportAPI, adminAPI } from '../../../utils/api'

const TicketsList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rolePrefix } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get('priority') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  // Selection state
  const [selectedTickets, setSelectedTickets] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [alert, setAlert] = useState(null)

  // Bulk action modals
  const [bulkActionModal, setBulkActionModal] = useState({ visible: false, action: '', title: '' })
  const [bulkActionForm, setBulkActionForm] = useState({ status: '', priority: '', assigned_to: '' })
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [admins, setAdmins] = useState([])
  const [adminsLoading, setAdminsLoading] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: pageSize,
      }
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== 'all') params.status = statusFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter

      const data = await supportAPI.getTickets(params)
      setTickets(data.tickets || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, statusFilter, priorityFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // Reset selection when tickets change
  useEffect(() => {
    setSelectedTickets(new Set())
    setSelectAll(false)
  }, [tickets])

  const handleSearch = (e) => {
    e.preventDefault()
    const newParams = new URLSearchParams(searchParams)
    newParams.set('search', searchTerm)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const handleFilterChange = (filterType, value) => {
    const newParams = new URLSearchParams(searchParams)
    if (filterType === 'status') {
      setStatusFilter(value)
      newParams.set('status', value)
    } else if (filterType === 'priority') {
      setPriorityFilter(value)
      newParams.set('priority', value)
    }
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      open: { color: 'info', label: 'Open' },
      in_progress: { color: 'warning', label: 'In Progress' },
      resolved: { color: 'success', label: 'Resolved' },
      closed: { color: 'secondary', label: 'Closed' },
    }
    const config = statusMap[status] || { color: 'secondary', label: status }
    return <CBadge color={config.color}>{config.label}</CBadge>
  }

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      low: { color: 'secondary', label: 'Low' },
      medium: { color: 'info', label: 'Medium' },
      high: { color: 'warning', label: 'High' },
      urgent: { color: 'danger', label: 'Urgent' },
    }
    const config = priorityMap[priority] || { color: 'secondary', label: priority }
    return <CBadge color={config.color}>{config.label}</CBadge>
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  // Selection handlers
  const handleSelectTicket = (ticketId) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId)
    } else {
      newSelected.add(ticketId)
    }
    setSelectedTickets(newSelected)
    setSelectAll(newSelected.size === tickets.length && tickets.length > 0)
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = new Set(tickets.map((t) => t.id))
      setSelectedTickets(allIds)
      setSelectAll(true)
    } else {
      setSelectedTickets(new Set())
      setSelectAll(false)
    }
  }

  // Bulk action handlers
  const openBulkActionModal = async (action) => {
    setBulkActionModal({ visible: true, action, title: getBulkActionTitle(action) })
    setBulkActionForm({ status: '', priority: '', assigned_to: '' })
    
    // Fetch admins if assigning
    if (action === 'assign') {
      setAdminsLoading(true)
      try {
        const data = await adminAPI.getAdmins({ limit: 100 })
        setAdmins(data.admins || [])
      } catch (err) {
        console.error('Error fetching admins:', err)
      } finally {
        setAdminsLoading(false)
      }
    }
  }

  const getBulkActionTitle = (action) => {
    const titles = {
      status: 'Change Status',
      priority: 'Change Priority',
      assign: 'Assign Tickets',
      delete: 'Delete Tickets',
    }
    return titles[action] || 'Bulk Action'
  }

  const handleBulkAction = async () => {
    if (selectedTickets.size === 0) {
      setAlert({ color: 'warning', message: 'Please select at least one ticket' })
      return
    }

    setBulkActionLoading(true)
    try {
      const ticketIds = Array.from(selectedTickets)
      const promises = []

      if (bulkActionModal.action === 'delete') {
        // Delete tickets
        for (const ticketId of ticketIds) {
          promises.push(supportAPI.deleteTicket(ticketId))
        }
      } else if (bulkActionModal.action === 'status') {
        // Update status
        if (!bulkActionForm.status) {
          setAlert({ color: 'warning', message: 'Please select a status' })
          setBulkActionLoading(false)
          return
        }
        for (const ticketId of ticketIds) {
          promises.push(supportAPI.updateTicket(ticketId, { status: bulkActionForm.status }))
        }
      } else if (bulkActionModal.action === 'priority') {
        // Update priority
        if (!bulkActionForm.priority) {
          setAlert({ color: 'warning', message: 'Please select a priority' })
          setBulkActionLoading(false)
          return
        }
        for (const ticketId of ticketIds) {
          promises.push(supportAPI.updateTicket(ticketId, { priority: bulkActionForm.priority }))
        }
      } else if (bulkActionModal.action === 'assign') {
        // Assign tickets
        for (const ticketId of ticketIds) {
          promises.push(
            supportAPI.updateTicket(ticketId, { assigned_to: bulkActionForm.assigned_to || null })
          )
        }
      }

      await Promise.all(promises)
      setAlert({
        color: 'success',
        message: `Successfully ${bulkActionModal.action === 'delete' ? 'deleted' : 'updated'} ${ticketIds.length} ticket(s)`,
      })
      setBulkActionModal({ visible: false, action: '', title: '' })
      setSelectedTickets(new Set())
      setSelectAll(false)
      fetchTickets()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message || 'Failed to perform bulk action' })
    } finally {
      setBulkActionLoading(false)
    }
  }

  if (loading && tickets.length === 0) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <h4 className="mb-4">Support Tickets</h4>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)} className="mb-3">
          {alert.message}
        </CAlert>
      )}

      {selectedTickets.size > 0 && (
        <CCard className="mb-3" color="info">
          <CCardBody>
            <CRow className="align-items-center">
              <CCol md={6}>
                <strong>{selectedTickets.size} ticket(s) selected</strong>
              </CCol>
              <CCol md={6} className="text-end">
                <CDropdown>
                  <CDropdownToggle color="primary">
                    <CIcon icon={cilOptions} className="me-2" />
                    Bulk Actions
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem onClick={() => openBulkActionModal('status')}>
                      Change Status
                    </CDropdownItem>
                    <CDropdownItem onClick={() => openBulkActionModal('priority')}>
                      Change Priority
                    </CDropdownItem>
                    <CDropdownItem onClick={() => openBulkActionModal('assign')}>
                      Assign Tickets
                    </CDropdownItem>
                    <CDropdownItem divider />
                    <CDropdownItem onClick={() => openBulkActionModal('delete')} className="text-danger">
                      Delete Tickets
                    </CDropdownItem>
                  </CDropdownMenu>
                </CDropdown>
                <CButton
                  color="secondary"
                  variant="outline"
                  className="ms-2"
                  onClick={() => {
                    setSelectedTickets(new Set())
                    setSelectAll(false)
                  }}
                >
                  Clear Selection
                </CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      )}

      <CCard className="mb-4">
        <CCardHeader>
          <CRow className="align-items-center">
            <CCol md={6}>
              <form onSubmit={handleSearch}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <CButton type="submit" color="primary">
                    Search
                  </CButton>
                </CInputGroup>
              </form>
            </CCol>
            <CCol md={6} className="text-end">
              <CButton
                color="primary"
                onClick={() => navigate(`/${rolePrefix}/support/tickets/new`)}
              >
                <CIcon icon={cilPlus} className="me-2" />
                New Ticket
              </CButton>
            </CCol>
          </CRow>
        </CCardHeader>
        <CCardBody>
          <CRow className="mb-3">
            <CCol md={6}>
              <CFormSelect
                value={statusFilter}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </CFormSelect>
            </CCol>
            <CCol md={6}>
              <CFormSelect
                value={priorityFilter}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </CFormSelect>
            </CCol>
          </CRow>

          <CTable hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>
                  <CFormCheck
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </CTableHeaderCell>
                <CTableHeaderCell>ID</CTableHeaderCell>
                <CTableHeaderCell>Subject</CTableHeaderCell>
                <CTableHeaderCell>User</CTableHeaderCell>
                <CTableHeaderCell>Status</CTableHeaderCell>
                <CTableHeaderCell>Priority</CTableHeaderCell>
                <CTableHeaderCell>Assigned To</CTableHeaderCell>
                <CTableHeaderCell>Created</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {tickets.length === 0 ? (
                <CTableRow>
                  <CTableDataCell colSpan="9" className="text-center">
                    No tickets found
                  </CTableDataCell>
                </CTableRow>
              ) : (
                tickets.map((ticket) => (
                  <CTableRow key={ticket.id}>
                    <CTableDataCell>
                      <CFormCheck
                        type="checkbox"
                        checked={selectedTickets.has(ticket.id)}
                        onChange={() => handleSelectTicket(ticket.id)}
                      />
                    </CTableDataCell>
                    <CTableDataCell>
                      <code className="small">{ticket.id.substring(0, 8)}...</code>
                    </CTableDataCell>
                    <CTableDataCell>
                      <strong>{ticket.subject}</strong>
                    </CTableDataCell>
                    <CTableDataCell>
                      {ticket.user_email || ticket.user_id?.email || 'N/A'}
                    </CTableDataCell>
                    <CTableDataCell>{getStatusBadge(ticket.status)}</CTableDataCell>
                    <CTableDataCell>{getPriorityBadge(ticket.priority)}</CTableDataCell>
                    <CTableDataCell>
                      {ticket.assigned_admin
                        ? `${ticket.assigned_admin.first_name || ''} ${ticket.assigned_admin.last_name || ''}`.trim() ||
                          ticket.assigned_admin.email
                        : 'Unassigned'}
                    </CTableDataCell>
                    <CTableDataCell>{formatDate(ticket.created_at)}</CTableDataCell>
                    <CTableDataCell>
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/${rolePrefix}/support/tickets/${ticket.id}`)}
                      >
                        <CIcon icon={cilInfo} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))
              )}
            </CTableBody>
          </CTable>

          {totalPages > 1 && (
            <CPagination className="mt-3">
              <CPaginationItem
                disabled={currentPage === 1}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('page', String(currentPage - 1))
                  setSearchParams(newParams)
                }}
              >
                Previous
              </CPaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <CPaginationItem
                  key={pageNum}
                  active={pageNum === currentPage}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams)
                    newParams.set('page', String(pageNum))
                    setSearchParams(newParams)
                  }}
                >
                  {pageNum}
                </CPaginationItem>
              ))}
              <CPaginationItem
                disabled={currentPage === totalPages}
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams)
                  newParams.set('page', String(currentPage + 1))
                  setSearchParams(newParams)
                }}
              >
                Next
              </CPaginationItem>
            </CPagination>
          )}
        </CCardBody>
      </CCard>

      {/* Bulk Action Modals */}
      <CModal visible={bulkActionModal.visible} onClose={() => setBulkActionModal({ visible: false, action: '', title: '' })}>
        <CModalHeader>
          <CModalTitle>{bulkActionModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {bulkActionModal.action === 'delete' ? (
            <div>
              <p>Are you sure you want to delete {selectedTickets.size} selected ticket(s)?</p>
              <p className="text-danger">This action cannot be undone.</p>
            </div>
          ) : bulkActionModal.action === 'status' ? (
            <div>
              <label className="form-label">New Status *</label>
              <CFormSelect
                value={bulkActionForm.status}
                onChange={(e) => setBulkActionForm({ ...bulkActionForm, status: e.target.value })}
              >
                <option value="">Select status...</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </CFormSelect>
              <p className="mt-2 text-muted">This will update {selectedTickets.size} ticket(s)</p>
            </div>
          ) : bulkActionModal.action === 'priority' ? (
            <div>
              <label className="form-label">New Priority *</label>
              <CFormSelect
                value={bulkActionForm.priority}
                onChange={(e) => setBulkActionForm({ ...bulkActionForm, priority: e.target.value })}
              >
                <option value="">Select priority...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </CFormSelect>
              <p className="mt-2 text-muted">This will update {selectedTickets.size} ticket(s)</p>
            </div>
          ) : bulkActionModal.action === 'assign' ? (
            <div>
              <label className="form-label">Assign To</label>
              {adminsLoading ? (
                <CSpinner size="sm" />
              ) : (
                <CFormSelect
                  value={bulkActionForm.assigned_to}
                  onChange={(e) => setBulkActionForm({ ...bulkActionForm, assigned_to: e.target.value })}
                >
                  <option value="">Unassign (remove assignment)</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.email} {admin.first_name || admin.last_name ? `(${admin.first_name || ''} ${admin.last_name || ''})`.trim() : ''} - {admin.role}
                    </option>
                  ))}
                </CFormSelect>
              )}
              <p className="mt-2 text-muted">This will update {selectedTickets.size} ticket(s)</p>
            </div>
          ) : null}
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            onClick={() => setBulkActionModal({ visible: false, action: '', title: '' })}
            disabled={bulkActionLoading}
          >
            Cancel
          </CButton>
          <CButton
            color={bulkActionModal.action === 'delete' ? 'danger' : 'primary'}
            onClick={handleBulkAction}
            disabled={bulkActionLoading}
          >
            {bulkActionLoading ? <CSpinner size="sm" className="me-2" /> : null}
            {bulkActionModal.action === 'delete' ? 'Delete' : 'Apply'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TicketsList
