import React, { useState, useEffect, useRef } from 'react'
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
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CListGroup,
  CListGroupItem,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilArrowLeft,
  cilPencil,
  cilTrash,
  cilCheckCircle,
  cilX,
  cilNoteAdd,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { supportAPI, usersAPI } from '../../../utils/api'

const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const isNew = id === 'new'
  const [ticket, setTicket] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // User search for create ticket
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const userSearchRef = useRef(null)

  // Create/Edit form
  const [createForm, setCreateForm] = useState({
    user_id: '',
    subject: '',
    description: '',
    priority: 'medium',
  })
  const [createLoading, setCreateLoading] = useState(false)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    subject: '',
    description: '',
    status: 'open',
    priority: 'medium',
    assigned_to: '',
  })

  // Note modal
  const [noteModal, setNoteModal] = useState(false)
  const [noteLoading, setNoteLoading] = useState(false)
  const [noteForm, setNoteForm] = useState({
    note: '',
    is_internal: true,
  })

  // Delete modal
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    if (isNew) {
      setLoading(false)
    } else {
      fetchTicketData()
    }
  }, [id])

  // Debounced user search
  useEffect(() => {
    if (!isNew) return

    // Clear results if query is too short
    if (userSearchQuery.length < 2) {
      setUserSearchResults([])
      setShowUserDropdown(false)
      return
    }

    // Set up debounce timer
    const debounceTimer = setTimeout(() => {
      searchUsers(userSearchQuery)
    }, 300) // 300ms debounce

    return () => clearTimeout(debounceTimer)
  }, [userSearchQuery, isNew])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target)) {
        setShowUserDropdown(false)
      }
    }

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserDropdown])

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setUserSearchResults([])
      setShowUserDropdown(false)
      return
    }

    setUserSearchLoading(true)
    try {
      const data = await usersAPI.list({ search: query, limit: 20 })
      setUserSearchResults(data.users || [])
      setShowUserDropdown(true)
    } catch (err) {
      console.error('Error searching users:', err)
      setUserSearchResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }

  const handleUserSelect = (user) => {
    setSelectedUser(user)
    setCreateForm({ ...createForm, user_id: user.id })
    setUserSearchQuery(user.email || `${user.first_name || ''} ${user.last_name || ''}`.trim())
    setShowUserDropdown(false)
  }

  const handleUserSearchChange = (e) => {
    const value = e.target.value
    setUserSearchQuery(value)
    if (value.length < 2) {
      setSelectedUser(null)
      setCreateForm({ ...createForm, user_id: '' })
      setShowUserDropdown(false)
    }
  }

  const fetchTicketData = async () => {
    setLoading(true)
    try {
      const data = await supportAPI.getTicketById(id)
      setTicket(data.ticket)
      setNotes(data.notes || [])
      setEditForm({
        subject: data.ticket.subject,
        description: data.ticket.description,
        status: data.ticket.status,
        priority: data.ticket.priority,
        assigned_to: data.ticket.assigned_to || '',
      })
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.user_id || !createForm.subject || !createForm.description) {
      setAlert({ color: 'warning', message: 'Please fill in all required fields, including selecting a user' })
      return
    }
    setCreateLoading(true)
    try {
      const data = await supportAPI.createTicket(createForm)
      setAlert({ color: 'success', message: 'Ticket created successfully' })
      navigate(`/${rolePrefix}/support/tickets/${data.ticket.id}`)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
      setCreateLoading(false)
    }
  }

  const handleUpdate = async () => {
    setEditLoading(true)
    try {
      await supportAPI.updateTicket(id, editForm)
      setAlert({ color: 'success', message: 'Ticket updated successfully' })
      setEditModal(false)
      fetchTicketData()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteForm.note.trim()) {
      setAlert({ color: 'warning', message: 'Note cannot be empty' })
      return
    }
    setNoteLoading(true)
    try {
      await supportAPI.addNote(id, noteForm)
      setAlert({ color: 'success', message: 'Note added successfully' })
      setNoteModal(false)
      setNoteForm({ note: '', is_internal: true })
      fetchTicketData()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setNoteLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await supportAPI.deleteTicket(id)
      navigate(`/${rolePrefix}/support/tickets`)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
      setDeleteLoading(false)
    }
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

  if (isNew) {
    return (
      <>
        <CRow className="mb-3">
          <CCol>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => navigate(`/${rolePrefix}/support/tickets`)}
            >
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back to Tickets
            </CButton>
          </CCol>
        </CRow>

        {alert && (
          <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
            {alert.message}
          </CAlert>
        )}

        <CCard>
          <CCardHeader>
            <h5>Create New Ticket</h5>
          </CCardHeader>
          <CCardBody>
            <CForm>
              <CFormLabel>User *</CFormLabel>
              <div ref={userSearchRef} style={{ position: 'relative' }}>
                <CFormInput
                  type="text"
                  value={userSearchQuery}
                  onChange={handleUserSearchChange}
                  onFocus={() => {
                    if (userSearchResults.length > 0) {
                      setShowUserDropdown(true)
                    }
                  }}
                  placeholder="Search users by email or name (min 2 characters)..."
                  autoComplete="off"
                />
                {userSearchLoading && (
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    <CSpinner size="sm" />
                  </div>
                )}
                {showUserDropdown && userSearchResults.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      marginTop: '2px',
                    }}
                  >
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        style={{
                          padding: '10px 15px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                          backgroundColor: selectedUser?.id === user.id ? '#e7f3ff' : 'white',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = selectedUser?.id === user.id ? '#e7f3ff' : 'white'
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{user.email}</div>
                        {(user.first_name || user.last_name) && (
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            {user.first_name || ''} {user.last_name || ''}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showUserDropdown && userSearchQuery.length >= 2 && userSearchResults.length === 0 && !userSearchLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 1000,
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '15px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      marginTop: '2px',
                    }}
                  >
                    No users found
                  </div>
                )}
              </div>
              {selectedUser && (
                <div className="mt-2">
                  <CBadge color="info">
                    Selected: {selectedUser.email}
                    {selectedUser.first_name || selectedUser.last_name
                      ? ` (${selectedUser.first_name || ''} ${selectedUser.last_name || ''})`.trim()
                      : ''}
                  </CBadge>
                </div>
              )}

              <CFormLabel className="mt-3">Subject *</CFormLabel>
              <CFormInput
                value={createForm.subject}
                onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                placeholder="Enter ticket subject..."
              />

              <CFormLabel className="mt-3">Description *</CFormLabel>
              <CFormTextarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                rows={5}
                placeholder="Enter ticket description..."
              />

              <CFormLabel className="mt-3">Priority</CFormLabel>
              <CFormSelect
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </CFormSelect>

              <div className="mt-4">
                <CButton
                  color="primary"
                  onClick={handleCreate}
                  disabled={createLoading}
                >
                  {createLoading ? <CSpinner size="sm" className="me-2" /> : null}
                  Create Ticket
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  className="ms-2"
                  onClick={() => navigate(`/${rolePrefix}/support/tickets`)}
                >
                  Cancel
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <CAlert color="danger">
        Ticket not found
        <CButton
          color="primary"
          className="ms-2"
          onClick={() => navigate(`/${rolePrefix}/support/tickets`)}
        >
          Back to Tickets
        </CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow className="mb-3">
        <CCol>
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate(`/${rolePrefix}/support/tickets`)}
          >
            <CIcon icon={cilArrowLeft} className="me-2" />
            Back to Tickets
          </CButton>
        </CCol>
      </CRow>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      <CRow>
        <CCol md={8}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <h5>{ticket.subject}</h5>
                <div className="mt-2">
                  {getStatusBadge(ticket.status)} {getPriorityBadge(ticket.priority)}
                </div>
              </div>
              <div>
                <CButton
                  color="primary"
                  variant="outline"
                  className="me-2"
                  onClick={() => setEditModal(true)}
                >
                  <CIcon icon={cilPencil} className="me-2" />
                  Edit
                </CButton>
                {(adminProfile?.role === 'super_admin' || adminProfile?.role === 'support') && (
                  <CButton
                    color="danger"
                    variant="outline"
                    onClick={() => setDeleteModal(true)}
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-2">{ticket.description}</p>
              </div>
              <div className="mb-3">
                <strong>User:</strong> {ticket.user_email || ticket.user_id?.email || 'N/A'}
              </div>
              <div className="mb-3">
                <strong>Assigned To:</strong>{' '}
                {ticket.assigned_admin
                  ? `${ticket.assigned_admin.first_name || ''} ${ticket.assigned_admin.last_name || ''}`.trim() ||
                    ticket.assigned_admin.email
                  : 'Unassigned'}
              </div>
              <div className="mb-3">
                <strong>Created:</strong> {new Date(ticket.created_at).toLocaleString()}
              </div>
              {ticket.resolved_at && (
                <div className="mb-3">
                  <strong>Resolved:</strong> {new Date(ticket.resolved_at).toLocaleString()}
                </div>
              )}
              {ticket.closed_at && (
                <div className="mb-3">
                  <strong>Closed:</strong> {new Date(ticket.closed_at).toLocaleString()}
                </div>
              )}
            </CCardBody>
          </CCard>

          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <h5>Notes</h5>
              <CButton color="primary" onClick={() => setNoteModal(true)}>
                <CIcon icon={cilNoteAdd} className="me-2" />
                Add Note
              </CButton>
            </CCardHeader>
            <CCardBody>
              {notes.length === 0 ? (
                <p className="text-muted">No notes yet</p>
              ) : (
                <CListGroup>
                  {notes.map((note) => (
                    <CListGroupItem key={note.id}>
                      <div className="d-flex justify-content-between mb-2">
                        <div>
                          <strong>
                            {note.admin?.first_name || ''} {note.admin?.last_name || ''}
                          </strong>
                          {note.is_internal && (
                            <CBadge color="warning" className="ms-2">
                              Internal
                            </CBadge>
                          )}
                        </div>
                        <small className="text-muted">
                          {new Date(note.created_at).toLocaleString()}
                        </small>
                      </div>
                      <p className="mb-0">{note.note}</p>
                    </CListGroupItem>
                  ))}
                </CListGroup>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)}>
        <CModalHeader>
          <CModalTitle>Edit Ticket</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormLabel>Subject</CFormLabel>
            <CFormInput
              value={editForm.subject}
              onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
            />
            <CFormLabel className="mt-3">Description</CFormLabel>
            <CFormTextarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={5}
            />
            <CFormLabel className="mt-3">Status</CFormLabel>
            <CFormSelect
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </CFormSelect>
            <CFormLabel className="mt-3">Priority</CFormLabel>
            <CFormSelect
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </CFormSelect>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleUpdate} disabled={editLoading}>
            {editLoading ? <CSpinner size="sm" /> : 'Update'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Note Modal */}
      <CModal visible={noteModal} onClose={() => setNoteModal(false)}>
        <CModalHeader>
          <CModalTitle>Add Note</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormLabel>Note</CFormLabel>
            <CFormTextarea
              value={noteForm.note}
              onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })}
              rows={5}
              placeholder="Enter your note..."
            />
            <CFormLabel className="mt-3">
              <input
                type="checkbox"
                checked={noteForm.is_internal}
                onChange={(e) => setNoteForm({ ...noteForm, is_internal: e.target.checked })}
                className="me-2"
              />
              Internal Note (not visible to user)
            </CFormLabel>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setNoteModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleAddNote} disabled={noteLoading}>
            {noteLoading ? <CSpinner size="sm" /> : 'Add Note'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Modal */}
      <CModal visible={deleteModal} onClose={() => setDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Delete Ticket</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this ticket? This action cannot be undone.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal(false)}>
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

export default TicketDetail
