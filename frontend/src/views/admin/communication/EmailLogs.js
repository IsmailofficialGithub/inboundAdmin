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
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilEnvelopeOpen, cilMagnifyingGlass } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const EmailLogs = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  // View modal
  const [viewModal, setViewModal] = useState({ visible: false, log: null })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`${API_BASE}/email-logs?${params}`, {
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
        setLogs([])
        setTotalCount(0)
        return
      }

      setLogs(data.logs || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, dateFrom, dateTo, pageSize])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const getStatusBadge = (status) => {
    const badges = {
      pending: <CBadge color="warning">Pending</CBadge>,
      sent: <CBadge color="success">Sent</CBadge>,
      failed: <CBadge color="danger">Failed</CBadge>,
    }
    return badges[status] || <CBadge>{status}</CBadge>
  }

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (log.user_email && log.user_email.toLowerCase().includes(search)) ||
      (log.to_email && log.to_email.toLowerCase().includes(search)) ||
      (log.subject && log.subject.toLowerCase().includes(search))
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
            <CCardHeader>
              <strong>Email Logs</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="mb-3">
                <CCol md={3}>
                  <CInputGroup>
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                    <CFormInput
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </CInputGroup>
                </CCol>
                <CCol md={2}>
                  <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormInput
                    type="date"
                    placeholder="From Date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormInput
                    type="date"
                    placeholder="To Date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </CCol>
              </CRow>

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                    <CTableHeaderCell>User</CTableHeaderCell>
                    <CTableHeaderCell>To Email</CTableHeaderCell>
                    <CTableHeaderCell>Subject</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Sent At</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {filteredLogs.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No email logs found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <CTableRow key={log.id}>
                        <CTableDataCell>{new Date(log.created_at).toLocaleString()}</CTableDataCell>
                        <CTableDataCell>{log.user_email || 'N/A'}</CTableDataCell>
                        <CTableDataCell>{log.to_email}</CTableDataCell>
                        <CTableDataCell>{log.subject}</CTableDataCell>
                        <CTableDataCell>{getStatusBadge(log.status)}</CTableDataCell>
                        <CTableDataCell>
                          {log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="info"
                            size="sm"
                            onClick={() => setViewModal({ visible: true, log })}
                          >
                            <CIcon icon={cilMagnifyingGlass} />
                          </CButton>
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

      {/* View Modal */}
      <CModal visible={viewModal.visible} onClose={() => setViewModal({ visible: false, log: null })} size="lg">
        <CModalHeader>
          <CModalTitle>Email Log Details</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {viewModal.log && (
            <>
              <p>
                <strong>From:</strong> {viewModal.log.from_email}
              </p>
              <p>
                <strong>To:</strong> {viewModal.log.to_email}
              </p>
              <p>
                <strong>Subject:</strong> {viewModal.log.subject}
              </p>
              <p>
                <strong>Status:</strong> {getStatusBadge(viewModal.log.status)}
              </p>
              {viewModal.log.error_message && (
                <p>
                  <strong>Error:</strong> <span className="text-danger">{viewModal.log.error_message}</span>
                </p>
              )}
              <hr />
              <div>
                <strong>Body:</strong>
                <div
                  className="mt-2 p-3 border rounded"
                  style={{ maxHeight: '400px', overflow: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: viewModal.log.body }}
                />
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setViewModal({ visible: false, log: null })}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default EmailLogs
