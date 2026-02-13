import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner, CBadge, CButton,
  CAlert, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPhone } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { inboundNumbersAPI } from '../../../utils/api'

const InboundNumberDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rolePrefix } = useAuth()

  const [number, setNumber] = useState(null)
  const [assignedAgent, setAssignedAgent] = useState(null)
  const [recentCalls, setRecentCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const data = await inboundNumbersAPI.getById(id)
        setNumber(data.number)
        setAssignedAgent(data.assignedAgent)
        setRecentCalls(data.recentCalls || [])
      } catch (err) {
        setAlert({ color: 'danger', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    fetchNumber()
  }, [id])

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  if (loading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (!number) return <CAlert color="danger">Inbound number not found</CAlert>

  const statusColor = { active: 'success', inactive: 'secondary', suspended: 'warning', error: 'danger', pending: 'info' }
  const healthColor = { healthy: 'success', unhealthy: 'danger', unknown: 'secondary', testing: 'info' }

  return (
    <>
      <CButton color="link" className="mb-3 p-0" onClick={() => navigate(`/${rolePrefix}/inbound-numbers`)}>
        <CIcon icon={cilArrowLeft} className="me-1" /> Back to Inbound Numbers
      </CButton>

      {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader>
          <CIcon icon={cilPhone} className="me-2" />
          <strong>{number.phone_number || '-'}</strong>
          <CBadge color={statusColor[number.status] || 'secondary'} className="ms-2">{number.status}</CBadge>
          {number.phone_label && <span className="text-body-secondary ms-2">({number.phone_label})</span>}
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Owner</td><td>{number.owner_email || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Provider</td><td><CBadge color="dark">{number.provider}</CBadge></td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Country Code</td><td>{number.country_code}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">SMS Enabled</td><td>{number.sms_enabled ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">In Use</td><td>{number.is_in_use ? 'Yes' : 'No'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Forwarding</td><td>{number.call_forwarding_number || '-'}</td></tr>
                </tbody>
              </table>
            </CCol>
            <CCol md={6}>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Health</td><td><CBadge color={healthColor[number.health_status] || 'secondary'}>{number.health_status}</CBadge></td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Last Health Check</td><td>{number.last_health_check ? new Date(number.last_health_check).toLocaleString() : '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Webhook Status</td><td><CBadge color={number.webhook_status === 'active' ? 'success' : 'secondary'}>{number.webhook_status}</CBadge></td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Created</td><td>{new Date(number.created_at).toLocaleString()}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Updated</td><td>{new Date(number.updated_at).toLocaleString()}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Notes</td><td>{number.notes || '-'}</td></tr>
                </tbody>
              </table>
            </CCol>
          </CRow>

          {assignedAgent && (
            <div className="mt-3">
              <h6 className="text-body-secondary">Assigned Agent</h6>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr><td className="text-body-secondary fw-semibold" style={{ width: '20%' }}>Name</td><td>{assignedAgent.name}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Type</td><td>{assignedAgent.agent_type || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Status</td><td><CBadge color={assignedAgent.status === 'active' ? 'success' : 'secondary'}>{assignedAgent.status}</CBadge></td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Phone</td><td>{assignedAgent.phone_number}</td></tr>
                </tbody>
              </table>
            </div>
          )}

          {recentCalls.length > 0 && (
            <div className="mt-4">
              <h6 className="text-body-secondary">Recent Calls</h6>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Caller</CTableHeaderCell>
                    <CTableHeaderCell>Called</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Date</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recentCalls.map((call) => (
                    <CTableRow key={call.id}>
                      <CTableDataCell className="small">{call.caller_number || '-'}</CTableDataCell>
                      <CTableDataCell className="small">{call.called_number || '-'}</CTableDataCell>
                      <CTableDataCell><CBadge color={call.call_status === 'completed' ? 'success' : 'secondary'}>{call.call_status}</CBadge></CTableDataCell>
                      <CTableDataCell>{formatDuration(call.call_duration)}</CTableDataCell>
                      <CTableDataCell className="small">{call.call_start_time ? new Date(call.call_start_time).toLocaleString() : '-'}</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default InboundNumberDetail
