import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner, CBadge, CButton,
  CAlert, CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPhone, cilCloudDownload } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { callsAPI } from '../../../utils/api'

const CallDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rolePrefix } = useAuth()

  const [call, setCall] = useState(null)
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const data = await callsAPI.getById(id)
        setCall(data.call)
        setRecordings(data.recordings || [])
      } catch (err) {
        setAlert({ color: 'danger', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    fetchCall()
  }, [id])

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const formatTranscript = (transcript) => {
    if (!transcript) return ''
    const escapeHtml = (text) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
    
    return transcript.split('\n').map((line) => {
      if (line.startsWith('AI:') || line.startsWith('User:')) {
        const parts = line.split(':')
        const label = parts[0]
        const content = parts.slice(1).join(':')
        return `<strong>${escapeHtml(label)}:</strong>${escapeHtml(content)}`
      }
      return escapeHtml(line)
    }).join('\n')
  }

  if (loading) return <div className="text-center py-5"><CSpinner color="primary" /></div>
  if (!call) return <CAlert color="danger">Call not found</CAlert>

  return (
    <>
      <CButton color="link" className="mb-3 p-0" onClick={() => navigate(`/${rolePrefix}/calls`)}>
        <CIcon icon={cilArrowLeft} className="me-1" /> Back to Calls
      </CButton>

      {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader>
          <CIcon icon={cilPhone} className="me-2" />
          <strong>Call Details</strong>
          <CBadge color={call.call_status === 'completed' ? 'success' : 'secondary'} className="ms-2">{call.call_status}</CBadge>
        </CCardHeader>
        <CCardBody>
          <CRow>
            <CCol md={6}>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Owner</td><td>{call.owner_email || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Agent</td><td>{call.agent_name || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Caller Number</td><td>{call.caller_number || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Called Number</td><td>{call.called_number || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Forwarded To</td><td>{call.call_forwarded_to || '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Status</td><td><CBadge color="info">{call.call_status}</CBadge></td></tr>
                </tbody>
              </table>
            </CCol>
            <CCol md={6}>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Duration</td><td>{formatDuration(call.call_duration)}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Cost</td><td>{call.call_cost != null ? `$${Number(call.call_cost).toFixed(2)}` : '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Start Time</td><td>{call.call_start_time ? new Date(call.call_start_time).toLocaleString() : '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Answered At</td><td>{call.call_answered_time ? new Date(call.call_answered_time).toLocaleString() : '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">End Time</td><td>{call.call_end_time ? new Date(call.call_end_time).toLocaleString() : '-'}</td></tr>
                  <tr><td className="text-body-secondary fw-semibold">Created</td><td>{new Date(call.created_at).toLocaleString()}</td></tr>
                </tbody>
              </table>
            </CCol>
          </CRow>

          {call.notes && (
            <div className="mt-3">
              <h6 className="text-body-secondary">Notes</h6>
              <p className="bg-body-tertiary p-3 rounded">{call.notes}</p>
            </div>
          )}

          {call.transcript && (
            <div className="mt-3">
              <h6 className="text-body-secondary">Transcript</h6>
              <pre className="bg-body-tertiary p-3 rounded" style={{ whiteSpace: 'pre-wrap', maxHeight: '400px', overflow: 'auto', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: formatTranscript(call.transcript) }} />
            </div>
          )}

          {recordings.length > 0 && (
            <div className="mt-4">
              <h6 className="text-body-secondary">Recordings</h6>
              <CTable hover responsive small>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Format</CTableHeaderCell>
                    <CTableHeaderCell>Duration</CTableHeaderCell>
                    <CTableHeaderCell>Size</CTableHeaderCell>
                    <CTableHeaderCell>Transcript</CTableHeaderCell>
                    <CTableHeaderCell>Created</CTableHeaderCell>
                    <CTableHeaderCell>Audio Player</CTableHeaderCell>
                    <CTableHeaderCell>Action</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {recordings.map((rec) => (
                    <CTableRow key={rec.id}>
                      <CTableDataCell>{rec.file_format || '-'}</CTableDataCell>
                      <CTableDataCell>{formatDuration(rec.recording_duration)}</CTableDataCell>
                      <CTableDataCell>{rec.file_size_bytes ? `${(rec.file_size_bytes / 1024).toFixed(1)} KB` : '-'}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={rec.transcript_available ? 'success' : 'secondary'}>
                          {rec.transcript_available ? 'Yes' : 'No'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell className="small">{new Date(rec.created_at).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>
                        {rec.recording_url && (
                          <audio controls style={{ width: '100%', maxWidth: '300px' }}>
                            <source src={rec.recording_url} type="audio/mpeg" />
                            <source src={rec.recording_url} type="audio/wav" />
                            <source src={rec.recording_url} type="audio/ogg" />
                            Your browser does not support the audio element.
                          </audio>
                        )}
                      </CTableDataCell>
                      <CTableDataCell>
                        {rec.recording_url && (
                          <CButton color="secondary" size="sm" variant="outline"
                            href={rec.recording_url} target="_blank" rel="noopener noreferrer"
                            download>
                            <CIcon icon={cilCloudDownload} className="me-1" />
                            Download
                          </CButton>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}

          {call.recording_url && recordings.length === 0 && (
            <div className="mt-3">
              <h6 className="text-body-secondary mb-3">Recording</h6>
              <div className="mb-3">
                <audio controls style={{ width: '100%', maxWidth: '500px' }}>
                  <source src={call.recording_url} type="audio/mpeg" />
                  <source src={call.recording_url} type="audio/wav" />
                  <source src={call.recording_url} type="audio/ogg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
              <CButton color="secondary" size="sm" variant="outline"
                href={call.recording_url} target="_blank" rel="noopener noreferrer"
                download>
                <CIcon icon={cilCloudDownload} className="me-1" />
                Download Recording
              </CButton>
            </div>
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default CallDetail
