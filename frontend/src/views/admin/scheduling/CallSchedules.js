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
  CSpinner,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilClock } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const CallSchedules = () => {
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ visible: false, schedule: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (isActiveFilter !== 'all') params.append('is_active', isActiveFilter)

      const response = await fetch(`${API_BASE}/call-schedules?${params}`, {
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
        setSchedules([])
        setTotalCount(0)
        return
      }

      setSchedules(data.schedules || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setSchedules([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, isActiveFilter, pageSize])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/call-schedules/${deleteModal.schedule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete schedule')

      toast.success('Schedule deleted successfully')
      setDeleteModal({ visible: false, schedule: null })
      fetchSchedules()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredSchedules = schedules.filter((schedule) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (schedule.schedule_name && schedule.schedule_name.toLowerCase().includes(search)) ||
      (schedule.user_email && schedule.user_email.toLowerCase().includes(search)) ||
      (schedule.agent_name && schedule.agent_name.toLowerCase().includes(search))
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
              <strong>Call Schedules</strong>
              {['super_admin', 'ops'].includes(adminProfile?.role) && (
                <CButton color="primary" onClick={() => navigate(`/${rolePrefix}/scheduling/schedules/new`)}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Schedule
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
                      placeholder="Search by name, user, or agent..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <select
                    className="form-select"
                    value={isActiveFilter}
                    onChange={(e) => setIsActiveFilter(e.target.value)}
                  >
                    <option value="all">All Schedules</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Schedule Name</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Agent</CTableHeaderCell>
                    <CTableHeaderCell>Timezone</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredSchedules.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No schedules found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredSchedules.map((schedule) => (
                      <CTableRow key={schedule.id}>
                        <CTableDataCell>{schedule.schedule_name}</CTableDataCell>
                        <CTableDataCell>{schedule.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{schedule.agent_name || '-'}</CTableDataCell>
                        <CTableDataCell>{schedule.timezone}</CTableDataCell>
                        <CTableDataCell>
                          {schedule.is_active ? (
                            <CBadge color="success">Active</CBadge>
                          ) : (
                            <CBadge color="secondary">Inactive</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>{new Date(schedule.created_at).toLocaleDateString()}</CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            size="sm"
                            className="me-2"
                            onClick={() => navigate(`/${rolePrefix}/scheduling/schedules/${schedule.id}`)}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                          {['super_admin', 'ops'].includes(adminProfile?.role) && (
                            <CButton
                              color="danger"
                              size="sm"
                              onClick={() => setDeleteModal({ visible: true, schedule })}
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
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, schedule: null })}>
        <CModalHeader>
          <CModalTitle>Delete Call Schedule</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to delete the schedule <strong>{deleteModal.schedule?.schedule_name}</strong>?
          </p>
          <p className="text-muted">This action cannot be undone.</p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, schedule: null })}>
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

export default CallSchedules
