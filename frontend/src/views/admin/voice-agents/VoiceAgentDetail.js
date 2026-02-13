import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner, CBadge, CButton,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CAlert, CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormInput, CFormLabel, CFormSelect, CFormTextarea, CNav, CNavItem, CNavLink, CTabContent, CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilPencil, cilMicrophone, cilPhone, cilChartLine } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { voiceAgentsAPI } from '../../../utils/api'

// Voice configurations
const vapiVoices = [
  { value: 'Elliot', label: 'Elliot (Male)', provider: 'vapi', gender: 'masculine'},
  { value: 'Rohan', label: 'Rohan (Male)', provider: 'vapi', gender: 'masculine' },
  { value: 'Savannah', label: 'Savannah (Female)', provider: 'vapi', gender: 'feminine' },
  { value: 'Leah', label: 'Leah (Female)', provider: 'vapi', gender: 'feminine' },
  { value: 'Tara', label: 'Tara (Female)', provider: 'vapi', gender: 'feminine' },
  { value: 'Jess', label: 'Jess (Female)', provider: 'vapi', gender: 'feminine' },
  { value: 'Leo', label: 'Leo (Male)', provider: 'vapi', gender: 'masculine' },
  { value: 'Dan', label: 'Dan (Male)', provider: 'vapi', gender: 'masculine' },
  { value: 'Mia', label: 'Mia (Female)', provider: 'vapi', gender: 'feminine' },
  { value: 'Zac', label: 'Zac (Male)', provider: 'vapi', gender: 'masculine' },
  { value: 'Zoe', label: 'Zoe (Female)', provider: 'vapi', gender: 'feminine' },
]

// Deepgram voices
const deepgramVoices = [
  { value: 'amalthea', label: 'Amalthea (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-amalthea.wav', description: 'Engaging, Natural, Cheerful', useCase: 'Casual chat' },
  { value: 'apollo', label: 'Apollo (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-apollo.wav', description: 'Confident, Comfortable, Casual', useCase: 'Casual chat' },
  { value: 'arcas', label: 'Arcas (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-arcas.wav', description: 'Natural, Smooth, Clear, Comfortable', useCase: 'Customer service, casual chat' },
  { value: 'aries', label: 'Aries (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-aries.wav', description: 'Warm, Energetic, Caring', useCase: 'Casual chat' },
  { value: 'asteria', label: 'Asteria (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-asteria.wav', description: 'Clear, Confident, Knowledgeable, Energetic', useCase: 'Advertising' },
  { value: 'athena', label: 'Athena (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-athena.wav', description: 'Calm, Smooth, Professional', useCase: 'Storytelling' },
  { value: 'atlas', label: 'Atlas (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-atlas.wav', description: 'Enthusiastic, Confident, Approachable, Friendly', useCase: 'Advertising' },
  { value: 'aurora', label: 'Aurora (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-aurora.wav', description: 'Cheerful, Expressive, Energetic', useCase: 'Interview' },
  { value: 'callista', label: 'Callista (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-callista.wav', description: 'Clear, Energetic, Professional, Smooth', useCase: 'IVR' },
  { value: 'cora', label: 'Cora (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-cora.wav', description: 'Smooth, Melodic, Caring', useCase: 'Storytelling' },
  { value: 'cordelia', label: 'Cordelia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-cordelia.wav', description: 'Approachable, Warm, Polite', useCase: 'Storytelling' },
  { value: 'delia', label: 'Delia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-delia.wav', description: 'Casual, Friendly, Cheerful, Breathy', useCase: 'Interview' },
  { value: 'draco', label: 'Draco (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-draco.wav', description: 'Warm, Approachable, Trustworthy, Baritone', useCase: 'Storytelling' },
  { value: 'electra', label: 'Electra (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-electra.wav', description: 'Professional, Engaging, Knowledgeable', useCase: 'IVR, advertising, customer service' },
  { value: 'harmonia', label: 'Harmonia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-harmonia.wav', description: 'Empathetic, Clear, Calm, Confident', useCase: 'Customer service' },
  { value: 'helena', label: 'Helena (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-helena.wav', description: 'Caring, Natural, Positive, Friendly, Raspy', useCase: 'IVR, casual chat' },
  { value: 'hera', label: 'Hera (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-hera.wav', description: 'Smooth, Warm, Professional', useCase: 'Informative' },
  { value: 'hermes', label: 'Hermes (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-hermes.wav', description: 'Expressive, Engaging, Professional', useCase: 'Informative' },
  { value: 'hyperion', label: 'Hyperion (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-hyperion.wav', description: 'Caring, Warm, Empathetic', useCase: 'Interview' },
  { value: 'iris', label: 'Iris (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-iris.wav', description: 'Cheerful, Positive, Approachable', useCase: 'IVR, advertising, customer service' },
  { value: 'janus', label: 'Janus (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-janus.wav', description: 'Southern, Smooth, Trustworthy', useCase: 'Storytelling' },
  { value: 'juno', label: 'Juno (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-juno.wav', description: 'Natural, Engaging, Melodic, Breathy', useCase: 'Interview' },
  { value: 'jupiter', label: 'Jupiter (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-jupiter.wav', description: 'Expressive, Knowledgeable, Baritone', useCase: 'Informative' },
  { value: 'luna', label: 'Luna (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-luna.wav', description: 'Friendly, Natural, Engaging', useCase: 'IVR' },
  { value: 'mars', label: 'Mars (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-mars.wav', description: 'Smooth, Patient, Trustworthy, Baritone', useCase: 'Customer service' },
  { value: 'minerva', label: 'Minerva (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-minerva.wav', description: 'Positive, Friendly, Natural', useCase: 'Storytelling' },
  { value: 'neptune', label: 'Neptune (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-neptune.wav', description: 'Professional, Patient, Polite', useCase: 'Customer service' },
  { value: 'odysseus', label: 'Odysseus (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-odysseus.wav', description: 'Calm, Smooth, Comfortable, Professional', useCase: 'Advertising' },
  { value: 'ophelia', label: 'Ophelia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-ophelia.wav', description: 'Expressive, Enthusiastic, Cheerful', useCase: 'Interview' },
  { value: 'orion', label: 'Orion (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-orion.wav', description: 'Approachable, Comfortable, Calm, Polite', useCase: 'Informative' },
  { value: 'orpheus', label: 'Orpheus (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-orpheus.wav', description: 'Professional, Clear, Confident, Trustworthy', useCase: 'Customer service, storytelling' },
  { value: 'pandora', label: 'Pandora (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-pandora.wav', description: 'Smooth, Calm, Melodic, Breathy', useCase: 'IVR, informative' },
  { value: 'phoebe', label: 'Phoebe (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-phoebe.wav', description: 'Energetic, Warm, Casual', useCase: 'Customer service' },
  { value: 'pluto', label: 'Pluto (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-pluto.wav', description: 'Smooth, Calm, Empathetic, Baritone', useCase: 'Interview, storytelling' },
  { value: 'saturn', label: 'Saturn (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-saturn.wav', description: 'Knowledgeable, Confident, Baritone', useCase: 'Customer service' },
  { value: 'selene', label: 'Selene (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-selene.wav', description: 'Expressive, Engaging, Energetic', useCase: 'Informative' },
  { value: 'thalia', label: 'Thalia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-thalia.wav', description: 'Clear, Confident, Energetic, Enthusiastic', useCase: 'Casual chat, customer service, IVR' },
  { value: 'theia', label: 'Theia (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-theia.wav', description: 'Expressive, Polite, Sincere', useCase: 'Informative' },
  { value: 'vesta', label: 'Vesta (Deepgram)', provider: 'deepgram', gender: 'feminine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-vesta.wav', description: 'Natural, Expressive, Patient, Empathetic', useCase: 'Customer service, interview, storytelling' },
  { value: 'zeus', label: 'Zeus (Deepgram)', provider: 'deepgram', gender: 'masculine', audioUrl: 'https://static.deepgram.com/examples/Aura-2-zeus.wav', description: 'Deep, Trustworthy, Smooth', useCase: 'IVR' },
]

// Combine all voices
const allVoices = [...vapiVoices, ...deepgramVoices]

const VoiceAgentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'ops'].includes(adminProfile?.role)

  const [agent, setAgent] = useState(null)
  const [recentCalls, setRecentCalls] = useState([])
  const [analytics, setAnalytics] = useState([])
  const [inboundNumbers, setInboundNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const data = await voiceAgentsAPI.getById(id)
        setAgent(data.agent)
        setRecentCalls(data.recentCalls || [])
        setAnalytics(data.analytics || [])
        setInboundNumbers(data.inboundNumbers || [])
      } catch (err) {
        setAlert({ color: 'danger', message: err.message })
      } finally {
        setLoading(false)
      }
    }
    fetchAgent()
  }, [id])

  const openEditModal = () => {
    setEditForm({
      name: agent.name || '',
      company_name: agent.company_name || '',
      goal: agent.goal || '',
      background: agent.background || '',
      welcome_message: agent.welcome_message || '',
      voice: agent.voice || '',
      tone: agent.tone || '',
      model: agent.model || '',
      language: agent.language || '',
      agent_type: agent.agent_type || '',
      status: agent.status || 'active',
      phone_number: agent.phone_number || '',
      phone_label: agent.phone_label || '',
      execution_mode: agent.execution_mode || 'production',
    })
    setEditModal(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      await voiceAgentsAPI.update(id, editForm)
      setAlert({ color: 'success', message: 'Agent updated successfully!' })
      setEditModal(false)
      // Re-fetch
      const data = await voiceAgentsAPI.getById(id)
      setAgent(data.agent)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-5"><CSpinner color="primary" /></div>
  }

  if (!agent) {
    return <CAlert color="danger">Agent not found</CAlert>
  }

  const statusColor = { active: 'success', inactive: 'secondary', archived: 'danger', testing: 'info' }

  return (
    <>
      <CButton color="link" className="mb-3 p-0" onClick={() => navigate(`/${rolePrefix}/voice-agents`)}>
        <CIcon icon={cilArrowLeft} className="me-1" /> Back to Voice Agents
      </CButton>

      {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div>
            <CIcon icon={cilMicrophone} className="me-2" />
            <strong>{agent.name}</strong>
            <CBadge color={statusColor[agent.status] || 'secondary'} className="ms-2">{agent.status}</CBadge>
            {agent.agent_type && <CBadge color="info" className="ms-1">{agent.agent_type}</CBadge>}
          </div>
          {canEdit && (
            <CButton color="primary" size="sm" onClick={openEditModal}>
              <CIcon icon={cilPencil} size="sm" className="me-1" /> Edit
            </CButton>
          )}
        </CCardHeader>
        <CCardBody>
          <CNav variant="tabs" className="mb-3">
            <CNavItem>
              <CNavLink active={activeTab === 'details'} onClick={() => setActiveTab('details')} style={{ cursor: 'pointer' }}>
                Details
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'calls'} onClick={() => setActiveTab('calls')} style={{ cursor: 'pointer' }}>
                <CIcon icon={cilPhone} size="sm" className="me-1" /> Recent Calls ({recentCalls.length})
              </CNavLink>
            </CNavItem>
            <CNavItem>
              <CNavLink active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} style={{ cursor: 'pointer' }}>
                <CIcon icon={cilChartLine} size="sm" className="me-1" /> Analytics
              </CNavLink>
            </CNavItem>
          </CNav>

          <CTabContent>
            {/* Details Tab */}
            <CTabPane visible={activeTab === 'details'}>
              <CRow>
                <CCol md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Owner</td><td>{agent.owner_email || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Company</td><td>{agent.company_name || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Phone</td><td>{agent.phone_number}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Phone Label</td><td>{agent.phone_label || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Voice</td><td>{agent.voice}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Tone</td><td>{agent.tone}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Model</td><td><CBadge color="dark">{agent.model}</CBadge></td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Language</td><td>{agent.language}</td></tr>
                    </tbody>
                  </table>
                </CCol>
                <CCol md={6}>
                  <table className="table table-borderless table-sm">
                    <tbody>
                      <tr><td className="text-body-secondary fw-semibold" style={{ width: '40%' }}>Provider</td><td>{agent.phone_provider || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Voice Provider</td><td>{agent.voice_provider || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Execution Mode</td><td>{agent.execution_mode}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">SMS Enabled</td><td>{agent.sms_enabled ? 'Yes' : 'No'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Timezone</td><td>{agent.timezone || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Tool</td><td>{agent.tool || '-'}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Created</td><td>{new Date(agent.created_at).toLocaleString()}</td></tr>
                      <tr><td className="text-body-secondary fw-semibold">Updated</td><td>{new Date(agent.updated_at).toLocaleString()}</td></tr>
                    </tbody>
                  </table>
                </CCol>
              </CRow>

              {agent.goal && (
                <div className="mt-3">
                  <h6 className="text-body-secondary">Goal</h6>
                  <p className="bg-body-tertiary p-3 rounded">{agent.goal}</p>
                </div>
              )}
              {agent.welcome_message && (
                <div className="mt-3">
                  <h6 className="text-body-secondary">Welcome Message</h6>
                  <p className="bg-body-tertiary p-3 rounded">{agent.welcome_message}</p>
                </div>
              )}

              {inboundNumbers.length > 0 && (
                <div className="mt-3">
                  <h6 className="text-body-secondary">Assigned Inbound Numbers</h6>
                  <CTable hover responsive small>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Number</CTableHeaderCell>
                        <CTableHeaderCell>Label</CTableHeaderCell>
                        <CTableHeaderCell>Provider</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {inboundNumbers.map((n) => (
                        <CTableRow key={n.id}>
                          <CTableDataCell>{n.phone_number}</CTableDataCell>
                          <CTableDataCell>{n.phone_label || '-'}</CTableDataCell>
                          <CTableDataCell>{n.provider}</CTableDataCell>
                          <CTableDataCell><CBadge color={n.status === 'active' ? 'success' : 'secondary'}>{n.status}</CBadge></CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </div>
              )}
            </CTabPane>

            {/* Calls Tab */}
            <CTabPane visible={activeTab === 'calls'}>
              {recentCalls.length === 0 ? (
                <p className="text-body-secondary text-center py-4">No recent calls</p>
              ) : (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Direction</CTableHeaderCell>
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
                        <CTableDataCell>
                          <CBadge color={call.direction === 'inbound' ? 'info' : 'primary'}>{call.direction}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small">{call.caller_number || '-'}</CTableDataCell>
                        <CTableDataCell className="small">{call.called_number || '-'}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={call.status === 'completed' ? 'success' : call.status === 'failed' ? 'danger' : 'secondary'}>
                            {call.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>{call.duration ? `${call.duration}s` : '-'}</CTableDataCell>
                        <CTableDataCell className="small">{call.created_at ? new Date(call.created_at).toLocaleString() : '-'}</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CTabPane>

            {/* Analytics Tab */}
            <CTabPane visible={activeTab === 'analytics'}>
              {analytics.length === 0 ? (
                <p className="text-body-secondary text-center py-4">No analytics data</p>
              ) : (
                <CTable hover responsive small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>Total Calls</CTableHeaderCell>
                      <CTableHeaderCell>Answered</CTableHeaderCell>
                      <CTableHeaderCell>Missed</CTableHeaderCell>
                      <CTableHeaderCell>Avg Duration</CTableHeaderCell>
                      <CTableHeaderCell>Conversions</CTableHeaderCell>
                      <CTableHeaderCell>Conv. Rate</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {analytics.map((a) => (
                      <CTableRow key={a.id}>
                        <CTableDataCell>{a.date}</CTableDataCell>
                        <CTableDataCell>{a.total_calls}</CTableDataCell>
                        <CTableDataCell>{a.answered_calls}</CTableDataCell>
                        <CTableDataCell>{a.missed_calls}</CTableDataCell>
                        <CTableDataCell>{Number(a.average_duration).toFixed(0)}s</CTableDataCell>
                        <CTableDataCell>{a.conversions}</CTableDataCell>
                        <CTableDataCell>{Number(a.conversion_rate).toFixed(1)}%</CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CTabPane>
          </CTabContent>
        </CCardBody>
      </CCard>

      {/* Edit Modal */}
      <CModal size="lg" visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader><CModalTitle><CIcon icon={cilPencil} className="me-2" />Edit Voice Agent</CModalTitle></CModalHeader>
        <CForm onSubmit={handleUpdate}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}><CFormLabel>Name</CFormLabel><CFormInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></CCol>
              <CCol md={6}><CFormLabel>Company</CFormLabel><CFormInput value={editForm.company_name} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} /></CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={4}><CFormLabel>Type</CFormLabel>
                <CFormSelect value={editForm.agent_type} onChange={(e) => setEditForm({ ...editForm, agent_type: e.target.value })}>
                  <option value="">Select</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="booking">Booking</option>
                  <option value="general">General</option>
                </CFormSelect>
              </CCol>
              <CCol md={4}><CFormLabel>Status</CFormLabel>
                <CFormSelect value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="testing">Testing</option>
                </CFormSelect>
              </CCol>
              <CCol md={4}><CFormLabel>Model</CFormLabel>
                <CFormInput value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Voice</CFormLabel>
                <CFormSelect value={editForm.voice} onChange={(e) => setEditForm({ ...editForm, voice: e.target.value })}>
                  <option value="">Select a voice</option>
                  <optgroup label="VAPI Voices">
                    {vapiVoices.map((voice) => (
                      <option key={voice.value} value={voice.value}>{voice.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Deepgram Voices">
                    {deepgramVoices.map((voice) => (
                      <option key={voice.value} value={voice.value}>{voice.label}</option>
                    ))}
                  </optgroup>
                </CFormSelect>
              </CCol>
              <CCol md={3}><CFormLabel>Tone</CFormLabel><CFormInput value={editForm.tone} onChange={(e) => setEditForm({ ...editForm, tone: e.target.value })} /></CCol>
              <CCol md={3}><CFormLabel>Language</CFormLabel><CFormInput value={editForm.language} onChange={(e) => setEditForm({ ...editForm, language: e.target.value })} /></CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}><CFormLabel>Phone Number</CFormLabel><CFormInput value={editForm.phone_number} onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })} /></CCol>
              <CCol md={3}><CFormLabel>Phone Label</CFormLabel><CFormInput value={editForm.phone_label} onChange={(e) => setEditForm({ ...editForm, phone_label: e.target.value })} /></CCol>
              <CCol md={3}><CFormLabel>Execution Mode</CFormLabel>
                <CFormSelect value={editForm.execution_mode} onChange={(e) => setEditForm({ ...editForm, execution_mode: e.target.value })}>
                  <option value="production">Production</option>
                  <option value="testing">Testing</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}><CFormLabel>Goal</CFormLabel>
                <CFormTextarea rows={2} value={editForm.goal} onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })} />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}><CFormLabel>Welcome Message</CFormLabel>
                <CFormTextarea rows={2} value={editForm.welcome_message} onChange={(e) => setEditForm({ ...editForm, welcome_message: e.target.value })} />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? <><CSpinner size="sm" className="me-1" /> Saving...</> : 'Save Changes'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default VoiceAgentDetail
