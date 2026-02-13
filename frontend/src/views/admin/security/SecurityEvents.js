import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
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
  CButton,
  CFormSelect,
  CSpinner,
  CBadge,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilShieldAlt } from '@coreui/icons'
import { adminAPI } from '../../../utils/api'

const SecurityEvents = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState(searchParams.get('severity') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1 // URL uses 1-based, backend uses 0-based
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: page.toString(),
        limit: pageSize.toString(),
      }

      if (severityFilter !== 'all') {
        params.severity = severityFilter
      }

      const data = await adminAPI.getSecurityEvents(params)

      setEvents(data.events || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      console.error('Error fetching security events:', err)
    } finally {
      setLoading(false)
    }
  }, [page, severityFilter, pageSize])

  // Update URL when filters change
  const updateURL = useCallback((newPage, newSeverity) => {
    const params = new URLSearchParams()
    if (newPage > 0) params.set('page', newPage.toString())
    if (newSeverity && newSeverity !== 'all') params.set('severity', newSeverity)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'info'
      case 'low':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const handleSeverityFilter = (e) => {
    const value = e.target.value
    setSeverityFilter(value)
    updateURL(1, value)
  }

  const handlePageChange = (newPage) => {
    updateURL(newPage, severityFilter)
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>
              <CIcon icon={cilShieldAlt} className="me-2" />
              Security Events
            </strong>
            <span className="text-body-secondary small">{totalCount} total events</span>
          </CCardHeader>
          <CCardBody>
            {/* Filters */}
            <CRow className="mb-3">
              <CCol md={4}>
                <CFormSelect value={severityFilter} onChange={handleSeverityFilter}>
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {/* Events Table */}
            {loading ? (
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            ) : (
              <>
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Date & Time</CTableHeaderCell>
                      <CTableHeaderCell>Event Type</CTableHeaderCell>
                      <CTableHeaderCell>Severity</CTableHeaderCell>
                      <CTableHeaderCell>IP Address</CTableHeaderCell>
                      <CTableHeaderCell>Details</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {events.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell
                          colSpan={5}
                          className="text-center text-body-secondary py-4"
                        >
                          No security events found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      events.map((event) => (
                        <CTableRow key={event.id}>
                          <CTableDataCell>
                            <div>{new Date(event.created_at).toLocaleDateString()}</div>
                            <small className="text-body-secondary">
                              {new Date(event.created_at).toLocaleTimeString()}
                            </small>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="info">{event.event_type || 'Unknown'}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getSeverityColor(event.severity)}>
                              {event.severity || 'unknown'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {event.ip_address || '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            {event.details && Object.keys(event.details).length > 0 ? (
                              <small className="text-break">
                                {JSON.stringify(event.details, null, 2)}
                              </small>
                            ) : (
                              '-'
                            )}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="text-body-secondary small">
                      Page {page + 1} of {totalPages}
                    </span>
                    <div>
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        className="me-2"
                        disabled={page === 0}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Previous
                      </CButton>
                      <CButton
                        color="primary"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
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
  )
}

export default SecurityEvents
