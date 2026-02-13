import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CSpinner, CBadge,
  CInputGroup, CInputGroupText, CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPhone } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { callsAPI } from '../../../utils/api'

const CallsList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { rolePrefix } = useAuth()

  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.call_status = statusFilter
      if (searchTerm) params.search = searchTerm
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const data = await callsAPI.list(params)
      setCalls(data.calls || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, dateFrom, dateTo, pageSize])

  const updateURL = useCallback((newPage, newStatus, newSearch, newFrom, newTo) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    if (newSearch) params.set('search', newSearch)
    if (newFrom) params.set('from', newFrom)
    if (newTo) params.set('to', newTo)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  const getStatusBadge = (status) => {
    const map = {
      completed: 'success', answered: 'success', failed: 'danger', busy: 'warning',
      'no-answer': 'secondary', initiated: 'info', ringing: 'info',
    }
    return <CBadge color={map[status] || 'secondary'}>{status || '-'}</CBadge>
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong><CIcon icon={cilPhone} className="me-2" />Call History</strong>
            <span className="text-body-secondary small">{totalCount} total calls</span>
          </CCardHeader>
          <CCardBody>
            {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

            <CRow className="mb-3">
              <CCol md={3}>
                <CInputGroup>
                  <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                  <CFormInput
                    placeholder="Search phone numbers..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); updateURL(1, statusFilter, e.target.value, dateFrom, dateTo) }}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CFormSelect value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); updateURL(1, e.target.value, searchTerm, dateFrom, dateTo) }}>
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="answered">Answered</option>
                  <option value="failed">Failed</option>
                  <option value="busy">Busy</option>
                  <option value="no-answer">No Answer</option>
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormInput type="date" placeholder="From" value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); updateURL(1, statusFilter, searchTerm, e.target.value, dateTo) }} />
              </CCol>
              <CCol md={2}>
                <CFormInput type="date" placeholder="To" value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); updateURL(1, statusFilter, searchTerm, dateFrom, e.target.value) }} />
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5"><CSpinner color="primary" /></div>
            ) : (
              <>
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Owner</CTableHeaderCell>
                      <CTableHeaderCell>Agent</CTableHeaderCell>
                      <CTableHeaderCell>Caller</CTableHeaderCell>
                      <CTableHeaderCell>Called</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Duration</CTableHeaderCell>
                      <CTableHeaderCell>Cost</CTableHeaderCell>
                      <CTableHeaderCell>Start Time</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {calls.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={9} className="text-center text-body-secondary py-4">No calls found</CTableDataCell>
                      </CTableRow>
                    ) : (
                      calls.map((call) => (
                        <CTableRow key={call.id}>
                          <CTableDataCell><span className="text-body-secondary small">{call.owner_email || '-'}</span></CTableDataCell>
                          <CTableDataCell className="small">{call.agent_name || '-'}</CTableDataCell>
                          <CTableDataCell className="small">{call.caller_number || '-'}</CTableDataCell>
                          <CTableDataCell className="small">{call.called_number || '-'}</CTableDataCell>
                          <CTableDataCell>{getStatusBadge(call.call_status)}</CTableDataCell>
                          <CTableDataCell>{formatDuration(call.call_duration)}</CTableDataCell>
                          <CTableDataCell>{call.call_cost != null ? `$${Number(call.call_cost).toFixed(2)}` : '-'}</CTableDataCell>
                          <CTableDataCell className="small">
                            {call.call_start_time ? new Date(call.call_start_time).toLocaleString() : '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton color="info" size="sm" variant="ghost"
                              onClick={() => navigate(`/${rolePrefix}/calls/${call.id}`)}>
                              View
                            </CButton>
                          </CTableDataCell>
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
                        disabled={page === 0} onClick={() => updateURL(page, statusFilter, searchTerm, dateFrom, dateTo)}>Previous</CButton>
                      <CButton color="primary" variant="outline" size="sm"
                        disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, statusFilter, searchTerm, dateFrom, dateTo)}>Next</CButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CallsList
