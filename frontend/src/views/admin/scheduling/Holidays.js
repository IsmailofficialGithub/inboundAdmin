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
  CFormCheck,
  CFormLabel,
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
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPlus, cilPencil, cilTrash, cilCalendar } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const Holidays = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [isRecurringFilter, setIsRecurringFilter] = useState('all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ visible: false, holiday: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Create/Edit modal
  const [editModal, setEditModal] = useState({ visible: false, holiday: null })
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    holiday_name: '',
    holiday_date: '',
    is_recurring: false,
    is_active: true,
    user_id: null,
  })

  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (isActiveFilter !== 'all') params.append('is_active', isActiveFilter)
      if (isRecurringFilter !== 'all') params.append('is_recurring', isRecurringFilter)

      const response = await fetch(`${API_BASE}/holidays?${params}`, {
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
        setHolidays([])
        setTotalCount(0)
        return
      }

      setHolidays(data.holidays || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setHolidays([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, isActiveFilter, isRecurringFilter, pageSize])

  useEffect(() => {
    fetchHolidays()
  }, [fetchHolidays])

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAuthToken()
      const url = editModal.holiday
        ? `${API_BASE}/holidays/${editModal.holiday.id}`
        : `${API_BASE}/holidays`
      const method = editModal.holiday ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save holiday')

      toast.success(`Holiday ${editModal.holiday ? 'updated' : 'created'} successfully`)
      setEditModal({ visible: false, holiday: null })
      fetchHolidays()
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
      const response = await fetch(`${API_BASE}/holidays/${deleteModal.holiday.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete holiday')

      toast.success('Holiday deleted successfully')
      setDeleteModal({ visible: false, holiday: null })
      fetchHolidays()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredHolidays = holidays.filter((holiday) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (holiday.holiday_name && holiday.holiday_name.toLowerCase().includes(search)) ||
      (holiday.user_email && holiday.user_email.toLowerCase().includes(search))
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
              <strong>Holiday Calendar</strong>
              {['super_admin', 'ops'].includes(adminProfile?.role) && (
                <CButton
                  color="primary"
                  onClick={() => {
                    setFormData({
                      holiday_name: '',
                      holiday_date: '',
                      is_recurring: false,
                      is_active: true,
                      user_id: null,
                    })
                    setEditModal({ visible: true, holiday: null })
                  }}
                >
                  <CIcon icon={cilPlus} className="me-2" />
                  New Holiday
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
                  <select
                    className="form-select"
                    value={isActiveFilter}
                    onChange={(e) => setIsActiveFilter(e.target.value)}
                  >
                    <option value="all">All Holidays</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </CCol>
                <CCol md={3}>
                  <select
                    className="form-select"
                    value={isRecurringFilter}
                    onChange={(e) => setIsRecurringFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="true">Recurring</option>
                    <option value="false">One-time</option>
                  </select>
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Holiday Name</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>Recurring</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredHolidays.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={6} className="text-center">
                        No holidays found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredHolidays.map((holiday) => (
                      <CTableRow key={holiday.id}>
                        <CTableDataCell>{holiday.holiday_name}</CTableDataCell>
                        <CTableDataCell>{new Date(holiday.holiday_date).toLocaleDateString()}</CTableDataCell>
                        <CTableDataCell>{holiday.user_email || 'Global'}</CTableDataCell>
                        <CTableDataCell>
                          {holiday.is_recurring ? (
                            <CBadge color="info">Recurring</CBadge>
                          ) : (
                            <CBadge color="secondary">One-time</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {holiday.is_active ? (
                            <CBadge color="success">Active</CBadge>
                          ) : (
                            <CBadge color="secondary">Inactive</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {['super_admin', 'ops'].includes(adminProfile?.role) && (
                            <>
                              <CButton
                                color="info"
                                size="sm"
                                className="me-2"
                                onClick={() => {
                                  setFormData({
                                    holiday_name: holiday.holiday_name,
                                    holiday_date: holiday.holiday_date,
                                    is_recurring: holiday.is_recurring,
                                    is_active: holiday.is_active,
                                    user_id: holiday.user_id,
                                  })
                                  setEditModal({ visible: true, holiday })
                                }}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                size="sm"
                                onClick={() => setDeleteModal({ visible: true, holiday })}
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
        onClose={() => setEditModal({ visible: false, holiday: null })}
      >
        <CModalHeader>
          <CModalTitle>{editModal.holiday ? 'Edit' : 'Create'} Holiday</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Holiday Name *</CFormLabel>
                <CFormInput
                  value={formData.holiday_name}
                  onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                  placeholder="e.g., New Year's Day"
                  required
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Holiday Date *</CFormLabel>
                <CFormInput
                  type="date"
                  value={formData.holiday_date}
                  onChange={(e) => setFormData({ ...formData, holiday_date: e.target.value })}
                  required
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormCheck
                  label="Recurring (repeats every year)"
                  checked={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
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
          <CButton color="secondary" onClick={() => setEditModal({ visible: false, holiday: null })}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSave} disabled={saving || !formData.holiday_name || !formData.holiday_date}>
            {saving ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Modal */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, holiday: null })}>
        <CModalHeader>
          <CModalTitle>Delete Holiday</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p>
            Are you sure you want to delete <strong>{deleteModal.holiday?.holiday_name}</strong>?
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, holiday: null })}>
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

export default Holidays
