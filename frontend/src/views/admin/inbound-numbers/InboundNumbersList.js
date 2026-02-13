import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CSpinner, CBadge, CAlert,
  CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilPhone, cilInfo, cilPencil, cilLink, cilPlus, cilCheckCircle } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { inboundNumbersAPI, voiceAgentsAPI, usersAPI } from '../../../utils/api'

const InboundNumbersList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'ops'].includes(adminProfile?.role)

  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [providerFilter, setProviderFilter] = useState(searchParams.get('provider') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Assign modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignNumber, setAssignNumber] = useState(null)
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [availableAgents, setAvailableAgents] = useState([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', phone_label: '', status: '', call_forwarding_number: '', notes: '' })

  // Create modal
  const [createModal, setCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState(null)
  const [verifyingUser, setVerifyingUser] = useState(false)
  const [userVerified, setUserVerified] = useState(false)
  const [createForm, setCreateForm] = useState({
    user_id: '',
    phone_number: '',
    country_code: '+1',
    phone_label: '',
    call_forwarding_number: '',
    provider: 'twilio',
    provider_account_id: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_sid: '',
    sms_enabled: false,
    vonage_api_key: '',
    vonage_api_secret: '',
    vonage_application_id: '',
    callhippo_api_key: '',
    callhippo_account_id: '',
    provider_api_key: '',
    provider_api_secret: '',
    provider_webhook_url: '',
    webhook_url: '',
    notes: '',
  })
  
  // User search
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Credential management
  const [testedCredentials, setTestedCredentials] = useState([])
  const [selectedCredentialId, setSelectedCredentialId] = useState(null)
  const [credentialForm, setCredentialForm] = useState({
    provider: 'twilio',
    provider_account_id: '',
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_sid: '',
    vonage_api_key: '',
    vonage_api_secret: '',
    vonage_application_id: '',
    callhippo_api_key: '',
    callhippo_account_id: '',
    provider_api_key: '',
    provider_api_secret: '',
    provider_webhook_url: '',
  })
  const [credentialsChanged, setCredentialsChanged] = useState(false)

  const fetchNumbers = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (providerFilter !== 'all') params.provider = providerFilter
      if (searchTerm) params.search = searchTerm
      const data = await inboundNumbersAPI.list(params)
      setNumbers(data.numbers || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, providerFilter, searchTerm, pageSize])

  const updateURL = useCallback((newPage, newStatus, newProvider, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    if (newProvider && newProvider !== 'all') params.set('provider', newProvider)
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchNumbers() }, [fetchNumbers])

  const openAssignModal = async (num) => {
    setAssignNumber(num)
    setSelectedAgentId(num.assigned_to_agent_id || '')
    setAssignModal(true)
    setAgentsLoading(true)
    try {
      const data = await voiceAgentsAPI.list({ limit: 200 })
      setAvailableAgents(data.agents || [])
    } catch (err) {
      console.error('Failed to load agents:', err)
    } finally {
      setAgentsLoading(false)
    }
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    setAssignLoading(true)
    try {
      await inboundNumbersAPI.assign(assignNumber.id, selectedAgentId || null)
      setAlert({ color: 'success', message: selectedAgentId ? 'Number assigned to agent!' : 'Number unassigned!' })
      setAssignModal(false)
      fetchNumbers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setAssignLoading(false)
    }
  }

  const openEditModal = (num) => {
    setEditForm({
      id: num.id,
      phone_label: num.phone_label || '',
      status: num.status,
      call_forwarding_number: num.call_forwarding_number || '',
      notes: num.notes || '',
    })
    setEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const { id, ...data } = editForm
      await inboundNumbersAPI.update(id, data)
      setAlert({ color: 'success', message: 'Number updated successfully!' })
      setEditModal(false)
      fetchNumbers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = { active: 'success', inactive: 'secondary', suspended: 'warning', error: 'danger', pending: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  const getHealthBadge = (status) => {
    const map = { healthy: 'success', unhealthy: 'danger', unknown: 'secondary', testing: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  // Debounced user search
  useEffect(() => {
    if (userSearchTerm.length < 2) {
      setUserSearchResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setUserSearchLoading(true)
      try {
        const data = await usersAPI.list({ search: userSearchTerm, limit: 10, status: 'active' })
        setUserSearchResults(data.users || [])
      } catch (err) {
        console.error('Failed to search users:', err)
        setUserSearchResults([])
      } finally {
        setUserSearchLoading(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [userSearchTerm])

  // Reset verification when credentials change (but not on initial load)
  const prevCredentialFormRef = useRef(credentialForm)
  useEffect(() => {
    // Only reset if credentials actually changed (not initial render)
    if (prevCredentialFormRef.current && JSON.stringify(prevCredentialFormRef.current) !== JSON.stringify(credentialForm)) {
      if (selectedCredentialId) {
        setVerificationResult(null)
        setSelectedCredentialId(null)
      }
    }
    prevCredentialFormRef.current = credentialForm
  }, [credentialForm, selectedCredentialId])

  const openCreateModal = () => {
    const initialProvider = 'twilio'
    setCreateForm({
      user_id: '',
      phone_number: '',
      country_code: '+1',
      phone_label: '',
      call_forwarding_number: '',
      provider: initialProvider,
      provider_account_id: '',
      twilio_account_sid: '',
      twilio_auth_token: '',
      twilio_sid: '',
      sms_enabled: false,
      vonage_api_key: '',
      vonage_api_secret: '',
      vonage_application_id: '',
      callhippo_api_key: '',
      callhippo_account_id: '',
      provider_api_key: '',
      provider_api_secret: '',
      provider_webhook_url: '',
      webhook_url: '',
      notes: '',
    })
    setCredentialForm({
      provider: initialProvider,
      provider_account_id: '',
      twilio_account_sid: '',
      twilio_auth_token: '',
      twilio_sid: '',
      vonage_api_key: '',
      vonage_api_secret: '',
      vonage_application_id: '',
      callhippo_api_key: '',
      callhippo_account_id: '',
      provider_api_key: '',
      provider_api_secret: '',
      provider_webhook_url: '',
    })
    setUserSearchTerm('')
    setUserSearchResults([])
    setSelectedUser(null)
    setUserVerified(false)
    setTestedCredentials([])
    setSelectedCredentialId(null)
    setVerificationResult(null)
    setCredentialsChanged(false)
    setCreateModal(true)
  }

  const handleUserSelect = async (user) => {
    setSelectedUser(user)
    setUserVerified(false)
    setUserSearchTerm(`${user.email} ${user.first_name || ''} ${user.last_name || ''}`.trim())
    setUserSearchResults([])
    
    // Verify user exists
    setVerifyingUser(true)
    try {
      // Verify user exists by fetching user details
      const data = await usersAPI.list({ search: user.email, limit: 1, status: 'active' })
      const foundUser = data.users?.find(u => u.id === user.id)
      
      if (foundUser) {
        setUserVerified(true)
        setCreateForm({ ...createForm, user_id: user.id })
        setAlert({ color: 'success', message: `User verified: ${user.email}` })
      } else {
        setUserVerified(false)
        setSelectedUser(null)
        setCreateForm({ ...createForm, user_id: '' })
        setAlert({ color: 'danger', message: 'User not found or inactive. Please select a valid user.' })
      }
    } catch (err) {
      setUserVerified(false)
      setSelectedUser(null)
      setCreateForm({ ...createForm, user_id: '' })
      setAlert({ color: 'danger', message: 'Failed to verify user. Please try again.' })
    } finally {
      setVerifyingUser(false)
    }
  }

  const handleTestConnection = async () => {
    setVerifying(true)
    setVerificationResult(null)
    try {
      const credentials = {
        provider: credentialForm.provider || createForm.provider,
        ...credentialForm,
      }
      
      const result = await inboundNumbersAPI.verifyConnection(credentials)
      
      if (result.success) {
        // Store tested credential
        const credentialId = Date.now().toString()
        const newCredential = {
          id: credentialId,
          provider: credentials.provider,
          ...credentials,
          verifiedAt: new Date().toISOString(),
          account: result.account,
        }
        setTestedCredentials([...testedCredentials, newCredential])
        setSelectedCredentialId(credentialId)
        setVerificationResult({ success: true, message: 'Connection verified successfully!' })
      }
    } catch (err) {
      setVerificationResult({ success: false, error: err.message })
    } finally {
      setVerifying(false)
    }
  }

  const handleCredentialChange = (field, value) => {
    setCredentialForm({ ...credentialForm, [field]: value })
    setCredentialsChanged(true)
  }

  const handleProviderChange = (value) => {
    setCreateForm({ ...createForm, provider: value })
    setCredentialForm({ ...credentialForm, provider: value })
    setCredentialsChanged(true)
    setSelectedCredentialId(null) // Reset selected credential when provider changes
  }

  const handleSelectCredential = (credentialId) => {
    setSelectedCredentialId(credentialId)
    const credential = testedCredentials.find(c => c.id === credentialId)
    if (credential) {
      // Update createForm provider to match selected credential
      setCreateForm({ ...createForm, provider: credential.provider })
      // Update credential form with selected credential
      setCredentialForm({
        provider: credential.provider,
        provider_account_id: credential.provider_account_id || '',
        twilio_account_sid: credential.twilio_account_sid || '',
        twilio_auth_token: credential.twilio_auth_token || '',
        twilio_sid: credential.twilio_sid || '',
        vonage_api_key: credential.vonage_api_key || '',
        vonage_api_secret: credential.vonage_api_secret || '',
        vonage_application_id: credential.vonage_application_id || '',
        callhippo_api_key: credential.callhippo_api_key || '',
        callhippo_account_id: credential.callhippo_account_id || '',
        provider_api_key: credential.provider_api_key || '',
        provider_api_secret: credential.provider_api_secret || '',
        provider_webhook_url: credential.provider_webhook_url || '',
      })
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    
    // Verify user is selected and verified
    if (!selectedUser || !userVerified) {
      setAlert({ color: 'warning', message: 'Please select and verify a user first' })
      return
    }
    
    if (!selectedCredentialId) {
      setAlert({ color: 'warning', message: 'Please test and select a verified credential first' })
      return
    }

    setCreateLoading(true)
    try {
      // Get selected credential
      const selectedCredential = testedCredentials.find(c => c.id === selectedCredentialId)
      if (!selectedCredential) {
        throw new Error('Selected credential not found')
      }

      // Merge credential data with form data
      const numberData = {
        ...createForm,
        provider: selectedCredential.provider,
        provider_account_id: selectedCredential.provider_account_id || '',
        twilio_account_sid: selectedCredential.twilio_account_sid || '',
        twilio_auth_token: selectedCredential.twilio_auth_token || '',
        twilio_sid: selectedCredential.twilio_sid || '',
        vonage_api_key: selectedCredential.vonage_api_key || '',
        vonage_api_secret: selectedCredential.vonage_api_secret || '',
        vonage_application_id: selectedCredential.vonage_application_id || '',
        callhippo_api_key: selectedCredential.callhippo_api_key || '',
        callhippo_account_id: selectedCredential.callhippo_account_id || '',
        provider_api_key: selectedCredential.provider_api_key || '',
        provider_api_secret: selectedCredential.provider_api_secret || '',
        provider_webhook_url: selectedCredential.provider_webhook_url || '',
      }

      const result = await inboundNumbersAPI.create(numberData)
      setAlert({ color: 'success', message: 'Number created successfully!' })
      setCreateModal(false)
      fetchNumbers()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setCreateLoading(false)
    }
  }

  const getProviderFields = (isCredentialForm = false) => {
    const provider = isCredentialForm ? credentialForm.provider : createForm.provider
    const form = isCredentialForm ? credentialForm : createForm
    const onChange = isCredentialForm ? handleCredentialChange : (field, value) => setCreateForm({ ...createForm, [field]: value })
    switch (provider) {
      case 'twilio':
        return (
          <>
            <div className="mb-3">
              <CFormLabel>Twilio Account SID *</CFormLabel>
              <CFormInput
                value={form.twilio_account_sid || ''}
                onChange={(e) => onChange('twilio_account_sid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required={isCredentialForm}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Twilio Auth Token *</CFormLabel>
              <CFormInput
                type="password"
                value={form.twilio_auth_token || ''}
                onChange={(e) => onChange('twilio_auth_token', e.target.value)}
                placeholder="Your Twilio Auth Token"
                required={isCredentialForm}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Twilio SID (Phone Number SID)</CFormLabel>
              <CFormInput
                value={form.twilio_sid || ''}
                onChange={(e) => onChange('twilio_sid', e.target.value)}
                placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
          </>
        )
      case 'vonage':
        return (
          <>
            <div className="mb-3">
              <CFormLabel>Vonage API Key *</CFormLabel>
              <CFormInput
                value={form.vonage_api_key || ''}
                onChange={(e) => onChange('vonage_api_key', e.target.value)}
                placeholder="Your Vonage API Key"
                required={isCredentialForm}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Vonage API Secret *</CFormLabel>
              <CFormInput
                type="password"
                value={form.vonage_api_secret || ''}
                onChange={(e) => onChange('vonage_api_secret', e.target.value)}
                placeholder="Your Vonage API Secret"
                required={isCredentialForm}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Vonage Application ID</CFormLabel>
              <CFormInput
                value={form.vonage_application_id || ''}
                onChange={(e) => onChange('vonage_application_id', e.target.value)}
                placeholder="Your Vonage Application ID"
              />
            </div>
          </>
        )
      case 'telnyx':
        return (
          <>
            <div className="mb-3">
              <CFormLabel>Telnyx API Key *</CFormLabel>
              <CFormInput
                type="password"
                value={form.provider_api_key || ''}
                onChange={(e) => onChange('provider_api_key', e.target.value)}
                placeholder="Your Telnyx API Key"
                required={isCredentialForm}
              />
            </div>
          </>
        )
      case 'callhippo':
        return (
          <>
            <div className="mb-3">
              <CFormLabel>CallHippo API Key *</CFormLabel>
              <CFormInput
                type="password"
                value={form.callhippo_api_key || ''}
                onChange={(e) => onChange('callhippo_api_key', e.target.value)}
                placeholder="Your CallHippo API Key"
                required={isCredentialForm}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>CallHippo Account ID *</CFormLabel>
              <CFormInput
                value={form.callhippo_account_id || ''}
                onChange={(e) => onChange('callhippo_account_id', e.target.value)}
                placeholder="Your CallHippo Account ID"
                required={isCredentialForm}
              />
            </div>
          </>
        )
      case 'other':
        return (
          <>
            <div className="mb-3">
              <CFormLabel>Provider API Key</CFormLabel>
              <CFormInput
                type="password"
                value={form.provider_api_key || ''}
                onChange={(e) => onChange('provider_api_key', e.target.value)}
                placeholder="Provider API Key"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Provider API Secret</CFormLabel>
              <CFormInput
                type="password"
                value={form.provider_api_secret || ''}
                onChange={(e) => onChange('provider_api_secret', e.target.value)}
                placeholder="Provider API Secret"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Provider Account ID</CFormLabel>
              <CFormInput
                value={form.provider_account_id || ''}
                onChange={(e) => onChange('provider_account_id', e.target.value)}
                placeholder="Provider Account ID"
              />
            </div>
          </>
        )
      default:
        return null
    }
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong><CIcon icon={cilPhone} className="me-2" />Inbound Numbers</strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small">{totalCount} numbers</span>
                {canEdit && (
                  <CButton color="primary" size="sm" onClick={openCreateModal}>
                    <CIcon icon={cilPlus} className="me-1" />Add Number
                  </CButton>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

              <CRow className="mb-3">
                <CCol md={3}>
                  <CInputGroup>
                    <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                    <CFormInput placeholder="Search phone numbers..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); updateURL(1, statusFilter, providerFilter, e.target.value) }} />
                  </CInputGroup>
                </CCol>
                <CCol md={2}>
                  <CFormSelect value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); updateURL(1, e.target.value, providerFilter, searchTerm) }}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="error">Error</option>
                    <option value="pending">Pending</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormSelect value={providerFilter}
                    onChange={(e) => { setProviderFilter(e.target.value); updateURL(1, statusFilter, e.target.value, searchTerm) }}>
                    <option value="all">All Providers</option>
                    <option value="twilio">Twilio</option>
                    <option value="vonage">Vonage</option>
                    <option value="telnyx">Telnyx</option>
                    <option value="callhippo">CallHippo</option>
                    <option value="other">Other</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {loading ? (
                <div className="text-center py-5"><CSpinner color="primary" /></div>
              ) : (
                <>
                  <CTable hover responsive align="middle">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Number</CTableHeaderCell>
                        <CTableHeaderCell>Label</CTableHeaderCell>
                        <CTableHeaderCell>Owner</CTableHeaderCell>
                        <CTableHeaderCell>Provider</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Health</CTableHeaderCell>
                        <CTableHeaderCell>Assigned Agent</CTableHeaderCell>
                        <CTableHeaderCell>Created</CTableHeaderCell>
                        {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {numbers.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canEdit ? 9 : 8} className="text-center text-body-secondary py-4">
                            No inbound numbers found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        numbers.map((num) => (
                          <CTableRow key={num.id}>
                            <CTableDataCell className="fw-semibold">
                              {num.phone_number || '-'}
                            </CTableDataCell>
                            <CTableDataCell className="small">{num.phone_label || '-'}</CTableDataCell>
                            <CTableDataCell><span className="text-body-secondary small">{num.owner_email || '-'}</span></CTableDataCell>
                            <CTableDataCell><CBadge color="dark">{num.provider}</CBadge></CTableDataCell>
                            <CTableDataCell>{getStatusBadge(num.status)}</CTableDataCell>
                            <CTableDataCell>{getHealthBadge(num.health_status)}</CTableDataCell>
                            <CTableDataCell className="small">{num.agent_name || <span className="text-body-secondary">Unassigned</span>}</CTableDataCell>
                            <CTableDataCell className="small">{new Date(num.created_at).toLocaleDateString()}</CTableDataCell>
                            {canEdit && (
                              <CTableDataCell>
                                <div className="d-flex gap-1">
                                  <CButton color="info" size="sm" variant="ghost"
                                    onClick={() => navigate(`/${rolePrefix}/inbound-numbers/${num.id}`)}>
                                    <CIcon icon={cilInfo} size="sm" />
                                  </CButton>
                                  <CButton color="primary" size="sm" variant="ghost" onClick={() => openEditModal(num)}>
                                    <CIcon icon={cilPencil} size="sm" />
                                  </CButton>
                                  <CButton color="warning" size="sm" variant="ghost" onClick={() => openAssignModal(num)}>
                                    <CIcon icon={cilLink} size="sm" />
                                  </CButton>
                                </div>
                              </CTableDataCell>
                            )}
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
                          disabled={page === 0} onClick={() => updateURL(page, statusFilter, providerFilter, searchTerm)}>Previous</CButton>
                        <CButton color="primary" variant="outline" size="sm"
                          disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, statusFilter, providerFilter, searchTerm)}>Next</CButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Assign to Agent Modal */}
      <CModal visible={assignModal} onClose={() => setAssignModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Assign Number to Agent</CModalTitle></CModalHeader>
        <CForm onSubmit={handleAssign}>
          <CModalBody>
            <p>Number: <strong>{assignNumber?.phone_number || '-'}</strong></p>
            <div className="mb-3">
              <CFormLabel>Select Agent</CFormLabel>
              {agentsLoading ? (
                <div className="text-center py-2"><CSpinner size="sm" /></div>
              ) : (
                <CFormSelect value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)}>
                  <option value="">-- Unassign --</option>
                  {availableAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
                  ))}
                </CFormSelect>
              )}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setAssignModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={assignLoading}>
              {assignLoading ? <><CSpinner size="sm" className="me-1" /> Assigning...</> : 'Save Assignment'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Edit Number Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Edit Inbound Number</CModalTitle></CModalHeader>
        <CForm onSubmit={handleEdit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Label</CFormLabel>
              <CFormInput value={editForm.phone_label} onChange={(e) => setEditForm({ ...editForm, phone_label: e.target.value })} />
            </div>
            <div className="mb-3">
              <CFormLabel>Status</CFormLabel>
              <CFormSelect value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Call Forwarding Number</CFormLabel>
              <CFormInput value={editForm.call_forwarding_number}
                onChange={(e) => setEditForm({ ...editForm, call_forwarding_number: e.target.value })} />
            </div>
            <div className="mb-3">
              <CFormLabel>Notes</CFormLabel>
              <CFormInput value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? <><CSpinner size="sm" className="me-1" /> Saving...</> : 'Save Changes'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Create Number Modal */}
      <CModal visible={createModal} onClose={() => setCreateModal(false)} backdrop="static" size="lg">
        <CModalHeader><CModalTitle>Add New Inbound Number</CModalTitle></CModalHeader>
        <CForm onSubmit={handleCreate}>
          <CModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* User Search */}
            <div className="mb-3">
              <CFormLabel>User *</CFormLabel>
              <div className="position-relative">
                <CFormInput
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value)
                    if (e.target.value.length < 2) {
                      setSelectedUser(null)
                      setCreateForm({ ...createForm, user_id: '' })
                    }
                  }}
                  placeholder="Search by email, name (min 2 characters)..."
                  required
                />
                {userSearchLoading && (
                  <div className="position-absolute" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                    <CSpinner size="sm" />
                  </div>
                )}
                {userSearchResults.length > 0 && (
                  <div className="position-absolute w-100 bg-white border rounded-bottom" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleUserSelect(user)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        <div className="fw-semibold">{user.email}</div>
                        {(user.first_name || user.last_name) && (
                          <div className="text-body-secondary small">
                            {user.first_name} {user.last_name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {verifyingUser && (
                <div className="mt-2">
                  <CSpinner size="sm" className="me-2" />
                  <span className="text-body-secondary">Verifying user...</span>
                </div>
              )}
              {selectedUser && userVerified && (
                <div className="mt-2">
                  <CBadge color="success">
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    Verified: {selectedUser.email}
                  </CBadge>
                </div>
              )}
              {selectedUser && !userVerified && !verifyingUser && (
                <div className="mt-2">
                  <CBadge color="danger">User verification failed</CBadge>
                </div>
              )}
            </div>

            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel>Country Code *</CFormLabel>
                <CFormSelect
                  value={createForm.country_code}
                  onChange={(e) => setCreateForm({ ...createForm, country_code: e.target.value })}
                  required
                >
                  <option value="+1">+1 (US/CA)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+92">+92 (PK)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+49">+49 (DE)</option>
                  <option value="+33">+33 (FR)</option>
                  <option value="+81">+81 (JP)</option>
                  <option value="+86">+86 (CN)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+966">+966 (SA)</option>
                </CFormSelect>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Phone Number *</CFormLabel>
                <CFormInput
                  value={createForm.phone_number}
                  onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                  placeholder="1234567890"
                  required
                />
              </CCol>
            </CRow>

            <div className="mb-3">
              <CFormLabel>Phone Label</CFormLabel>
              <CFormInput
                value={createForm.phone_label}
                onChange={(e) => setCreateForm({ ...createForm, phone_label: e.target.value })}
                placeholder="e.g., Main Business Line"
              />
            </div>

            <div className="mb-3">
              <CFormLabel>Call Forwarding Number</CFormLabel>
              <CFormInput
                value={createForm.call_forwarding_number}
                onChange={(e) => setCreateForm({ ...createForm, call_forwarding_number: e.target.value })}
                placeholder="+1234567890"
              />
            </div>

            <hr className="my-4" />
            <h6 className="mb-3">Provider Credentials</h6>

            {/* Select from tested credentials */}
            {testedCredentials.length > 0 && (
              <div className="mb-3">
                <CFormLabel>Use Verified Credential</CFormLabel>
                <CFormSelect
                  value={selectedCredentialId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleSelectCredential(e.target.value)
                    } else {
                      setSelectedCredentialId(null)
                    }
                  }}
                >
                  <option value="">-- Add New Credential --</option>
                  {testedCredentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {cred.provider} - Verified {new Date(cred.verifiedAt).toLocaleString()}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            )}

            {/* Credential Form */}
            <div className="mb-3">
              <CFormLabel>Provider *</CFormLabel>
              <CFormSelect
                value={credentialForm.provider || createForm.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                required
              >
                <option value="twilio">Twilio</option>
                <option value="vonage">Vonage</option>
                <option value="telnyx">Telnyx</option>
                <option value="callhippo">CallHippo</option>
                <option value="other">Other</option>
              </CFormSelect>
            </div>

            {getProviderFields(true)}

            {/* Test Connection Button */}
            <div className="mb-3">
              <CButton
                type="button"
                color="info"
                onClick={handleTestConnection}
                disabled={verifying || !selectedUser}
              >
                {verifying ? (
                  <>
                    <CSpinner size="sm" className="me-1" /> Testing Connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </CButton>
              {verificationResult && verificationResult.success && (
                <CBadge color="success" className="ms-2">
                  ✓ Connection Verified
                </CBadge>
              )}
              {verificationResult && !verificationResult.success && (
                <CAlert color="danger" className="mt-2 mb-0">
                  {verificationResult.error}
                </CAlert>
              )}
            </div>

            <hr className="my-4" />
            <h6 className="mb-3">Number Details</h6>

            <div className="mb-3">
              <CFormLabel>Webhook URL</CFormLabel>
              <CFormInput
                value={createForm.webhook_url}
                onChange={(e) => setCreateForm({ ...createForm, webhook_url: e.target.value })}
                placeholder="https://your-domain.com/webhook"
              />
            </div>

            {createForm.provider === 'twilio' && (
              <div className="mb-3">
                <div className="form-check">
                  <CFormInput
                    type="checkbox"
                    id="sms_enabled"
                    checked={createForm.sms_enabled}
                    onChange={(e) => setCreateForm({ ...createForm, sms_enabled: e.target.checked })}
                    className="form-check-input"
                  />
                  <CFormLabel htmlFor="sms_enabled" className="form-check-label">
                    SMS Enabled
                  </CFormLabel>
                </div>
              </div>
            )}

            <div className="mb-3">
              <CFormLabel>Notes</CFormLabel>
              <CFormInput
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setCreateModal(false)}>Cancel</CButton>
            <CButton 
              type="submit" 
              color="primary" 
              disabled={createLoading || !selectedUser || !userVerified || !selectedCredentialId}
            >
              {createLoading ? (
                <>
                  <CSpinner size="sm" className="me-1" /> Creating...
                </>
              ) : (
                'Create Number'
              )}
            </CButton>
          </CModalFooter>
          {(!selectedUser || !userVerified || !selectedCredentialId) && (
            <div className="px-3 pb-3">
              <CAlert color="warning" className="mb-0">
                {!selectedUser && 'Please select a user. '}
                {selectedUser && !userVerified && 'Please wait for user verification to complete. '}
                {!selectedCredentialId && 'Please test and select a verified credential.'}
              </CAlert>
            </div>
          )}
        </CForm>
      </CModal>
    </>
  )
}

export default InboundNumbersList
