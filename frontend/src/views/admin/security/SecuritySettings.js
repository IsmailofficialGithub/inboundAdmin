import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTabs,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CFormInput,
  CFormSelect,
  CFormLabel,
  CFormCheck,
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
import {
  cilShieldAlt,
  cilLockLocked,
  cilStorage,
  cilCloudDownload,
  cilWarning,
  cilTrash,
  cilPlus,
  cilPencil,
  cilCheck,
  cilX,
} from '@coreui/icons'
import { getAuthToken } from '../../../utils/cookies'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

const SecuritySettings = () => {
  const [activeTab, setActiveTab] = useState('webhooks')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Webhook settings
  const [webhookSettings, setWebhookSettings] = useState([])
  const [showWebhookModal, setShowWebhookModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState(null)
  const [webhookForm, setWebhookForm] = useState({
    provider_name: '',
    webhook_endpoint: '',
    secret_key: '',
    signature_algorithm: 'hmac_sha256',
    is_enabled: true,
    require_signature: true,
    rate_limit_per_minute: 60,
  })

  // IP Allowlist
  const [ipAllowlist, setIpAllowlist] = useState({ admin_specific: [], global: [] })
  const [showIPModal, setShowIPModal] = useState(false)
  const [ipForm, setIpForm] = useState({
    admin_id: '',
    ip_address: '',
    description: '',
    is_global: false,
  })

  // Data Retention
  const [retentionConfigs, setRetentionConfigs] = useState([])
  const [showRetentionModal, setShowRetentionModal] = useState(false)
  const [editingRetention, setEditingRetention] = useState(null)

  // Backup Status
  const [backups, setBackups] = useState([])
  const [backupPage, setBackupPage] = useState(0)

  // Abuse Alerts
  const [abuseAlerts, setAbuseAlerts] = useState([])
  const [alertPage, setAlertPage] = useState(0)
  const [alertFilter, setAlertFilter] = useState('open')

  // Failed Logins
  const [failedLogins, setFailedLogins] = useState([])
  const [loginPage, setLoginPage] = useState(0)

  useEffect(() => {
    fetchWebhookSettings()
    fetchIPAllowlist()
    fetchRetentionConfigs()
    fetchBackupStatus()
    fetchAbuseAlerts()
    fetchFailedLogins()
  }, [activeTab, backupPage, alertPage, alertFilter, loginPage])

  const fetchWebhookSettings = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/webhook-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setWebhookSettings(data.settings || [])
      }
    } catch (err) {
      console.error('Error fetching webhook settings:', err)
    }
  }

  const fetchIPAllowlist = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/ip-allowlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setIpAllowlist(data)
      }
    } catch (err) {
      console.error('Error fetching IP allowlist:', err)
    }
  }

  const fetchRetentionConfigs = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/data-retention`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setRetentionConfigs(data.configs || [])
      }
    } catch (err) {
      console.error('Error fetching retention configs:', err)
    }
  }

  const fetchBackupStatus = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/backup-status?page=${backupPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setBackups(data.backups || [])
      }
    } catch (err) {
      console.error('Error fetching backup status:', err)
    }
  }

  const fetchAbuseAlerts = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(
        `${API_BASE_URL}/security/abuse-alerts?status=${alertFilter}&page=${alertPage}&limit=20`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await response.json()
      if (response.ok) {
        setAbuseAlerts(data.alerts || [])
      }
    } catch (err) {
      console.error('Error fetching abuse alerts:', err)
    }
  }

  const fetchFailedLogins = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/failed-logins?page=${loginPage}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok) {
        setFailedLogins(data.attempts || [])
      }
    } catch (err) {
      console.error('Error fetching failed logins:', err)
    }
  }

  const handleSaveWebhook = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const url = editingWebhook
        ? `${API_BASE_URL}/security/webhook-settings/${editingWebhook}`
        : `${API_BASE_URL}/security/webhook-settings`
      const method = editingWebhook ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(webhookForm),
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Webhook setting saved successfully')
        setShowWebhookModal(false)
        setEditingWebhook(null)
        setWebhookForm({
          provider_name: '',
          webhook_endpoint: '',
          secret_key: '',
          signature_algorithm: 'hmac_sha256',
          is_enabled: true,
          require_signature: true,
          rate_limit_per_minute: 60,
        })
        fetchWebhookSettings()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to save webhook setting')
      }
    } catch (err) {
      setError('Failed to save webhook setting')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this webhook setting?')) return

    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/webhook-settings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setSuccess('Webhook setting deleted successfully')
        fetchWebhookSettings()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete webhook setting')
      }
    } catch (err) {
      setError('Failed to delete webhook setting')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveIP = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/ip-allowlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ipForm),
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('IP address added to allowlist')
        setShowIPModal(false)
        setIpForm({
          admin_id: '',
          ip_address: '',
          description: '',
          is_global: false,
        })
        fetchIPAllowlist()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to add IP to allowlist')
      }
    } catch (err) {
      setError('Failed to add IP to allowlist')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIP = async (id, type) => {
    if (!window.confirm('Are you sure you want to remove this IP from the allowlist?')) return

    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/ip-allowlist/${id}?type=${type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setSuccess('IP address removed from allowlist')
        fetchIPAllowlist()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove IP from allowlist')
      }
    } catch (err) {
      setError('Failed to remove IP from allowlist')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRetention = async (id, updates) => {
    setLoading(true)
    setError(null)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/data-retention/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (response.ok) {
        setSuccess('Data retention configuration updated')
        setShowRetentionModal(false)
        setEditingRetention(null)
        fetchRetentionConfigs()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to update retention configuration')
      }
    } catch (err) {
      setError('Failed to update retention configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveAlert = async (id, status, notes) => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE_URL}/security/abuse-alerts/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, resolution_notes: notes }),
      })

      if (response.ok) {
        setSuccess('Alert resolved successfully')
        fetchAbuseAlerts()
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to resolve alert')
      }
    } catch (err) {
      setError('Failed to resolve alert')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'danger'
      case 'high':
        return 'warning'
      case 'medium':
        return 'info'
      default:
        return 'secondary'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'danger'
      case 'in_progress':
        return 'info'
      default:
        return 'secondary'
    }
  }

  return (
    <div>
      <CRow>
        <CCol>
          <h2>Security & Monitoring Settings</h2>
          <p className="text-body-secondary">Manage security configurations, audit logs, and abuse detection</p>
        </CCol>
      </CRow>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError(null)}>
          {error}
        </CAlert>
      )}

      {success && (
        <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </CAlert>
      )}

      <CTabs activeTab={activeTab} onActiveTabChange={setActiveTab}>
        <CNav variant="tabs">
          <CNavItem>
            <CNavLink data-tab="webhooks">
              <CIcon icon={cilLockLocked} className="me-2" />
              Webhook Security
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink data-tab="ip-allowlist">
              <CIcon icon={cilShieldAlt} className="me-2" />
              IP Allowlist
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink data-tab="retention">
              <CIcon icon={cilStorage} className="me-2" />
              Data Retention
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink data-tab="backups">
              <CIcon icon={cilCloudDownload} className="me-2" />
              Backup Status
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink data-tab="abuse">
              <CIcon icon={cilWarning} className="me-2" />
              Abuse Detection
            </CNavLink>
          </CNavItem>
        </CNav>

        <CTabContent>
          {/* Webhook Security Tab */}
          <CTabPane visible={activeTab === 'webhooks'}>
            <CCard>
              <CCardHeader className="d-flex justify-content-between align-items-center">
                <span>Webhook Security Settings</span>
                <CButton color="primary" size="sm" onClick={() => setShowWebhookModal(true)}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Add Webhook Setting
                </CButton>
              </CCardHeader>
              <CCardBody>
                <CTable>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Provider</CTableHeaderCell>
                      <CTableHeaderCell>Endpoint</CTableHeaderCell>
                      <CTableHeaderCell>Algorithm</CTableHeaderCell>
                      <CTableHeaderCell>Rate Limit</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {webhookSettings.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">
                          No webhook settings configured
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      webhookSettings.map((setting) => (
                        <CTableRow key={setting.id}>
                          <CTableDataCell>{setting.provider_name}</CTableDataCell>
                          <CTableDataCell>
                            <code className="small">{setting.webhook_endpoint}</code>
                          </CTableDataCell>
                          <CTableDataCell>{setting.signature_algorithm}</CTableDataCell>
                          <CTableDataCell>{setting.rate_limit_per_minute}/min</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={setting.is_enabled ? 'success' : 'secondary'}>
                              {setting.is_enabled ? 'Enabled' : 'Disabled'}
                            </CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CButton
                              color="danger"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteWebhook(setting.id)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CTabPane>

          {/* IP Allowlist Tab */}
          <CTabPane visible={activeTab === 'ip-allowlist'}>
            <CRow>
              <CCol md={6}>
                <CCard>
                  <CCardHeader className="d-flex justify-content-between align-items-center">
                    <span>Global IP Allowlist</span>
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => {
                        setIpForm({ ...ipForm, is_global: true })
                        setShowIPModal(true)
                      }}
                    >
                      <CIcon icon={cilPlus} className="me-2" />
                      Add IP
                    </CButton>
                  </CCardHeader>
                  <CCardBody>
                    <CTable>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>IP Address</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Actions</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {ipAllowlist.global?.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell colSpan={3} className="text-center text-body-secondary py-3">
                              No global IPs configured
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          ipAllowlist.global?.map((entry) => (
                            <CTableRow key={entry.id}>
                              <CTableDataCell>
                                <code>{entry.ip_address}</code>
                              </CTableDataCell>
                              <CTableDataCell>{entry.description || '-'}</CTableDataCell>
                              <CTableDataCell>
                                <CButton
                                  color="danger"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteIP(entry.id, 'global')}
                                >
                                  <CIcon icon={cilTrash} />
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
              <CCol md={6}>
                <CCard>
                  <CCardHeader>
                    <span>Admin-Specific IP Allowlist</span>
                  </CCardHeader>
                  <CCardBody>
                    <CTable>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Admin ID</CTableHeaderCell>
                          <CTableHeaderCell>IP Address</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Actions</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {ipAllowlist.admin_specific?.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell colSpan={4} className="text-center text-body-secondary py-3">
                              No admin-specific IPs configured
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          ipAllowlist.admin_specific?.map((entry) => (
                            <CTableRow key={entry.id}>
                              <CTableDataCell>
                                <code className="small">{entry.admin_id}</code>
                              </CTableDataCell>
                              <CTableDataCell>
                                <code>{entry.ip_address}</code>
                              </CTableDataCell>
                              <CTableDataCell>{entry.description || '-'}</CTableDataCell>
                              <CTableDataCell>
                                <CButton
                                  color="danger"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteIP(entry.id, 'admin')}
                                >
                                  <CIcon icon={cilTrash} />
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
          </CTabPane>

          {/* Data Retention Tab */}
          <CTabPane visible={activeTab === 'retention'}>
            <CCard>
              <CCardHeader>Data Retention Configuration</CCardHeader>
              <CCardBody>
                <CTable>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Data Type</CTableHeaderCell>
                      <CTableHeaderCell>Retention (Days)</CTableHeaderCell>
                      <CTableHeaderCell>Auto Delete</CTableHeaderCell>
                      <CTableHeaderCell>Archive Before Delete</CTableHeaderCell>
                      <CTableHeaderCell>Last Cleanup</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {retentionConfigs.map((config) => (
                      <CTableRow key={config.id}>
                        <CTableDataCell>
                          <strong>{config.data_type.replace(/_/g, ' ')}</strong>
                        </CTableDataCell>
                        <CTableDataCell>{config.retention_days === 0 ? 'Forever' : config.retention_days}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={config.auto_delete_enabled ? 'success' : 'secondary'}>
                            {config.auto_delete_enabled ? 'Yes' : 'No'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={config.archive_before_delete ? 'info' : 'secondary'}>
                            {config.archive_before_delete ? 'Yes' : 'No'}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {config.last_cleanup_run
                            ? new Date(config.last_cleanup_run).toLocaleString()
                            : 'Never'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="primary"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRetention(config)
                              setShowRetentionModal(true)
                            }}
                          >
                            <CIcon icon={cilPencil} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CTabPane>

          {/* Backup Status Tab */}
          <CTabPane visible={activeTab === 'backups'}>
            <CCard>
              <CCardHeader>Backup Status Monitoring</CCardHeader>
              <CCardBody>
                <CTable>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Location</CTableHeaderCell>
                      <CTableHeaderCell>Size</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Started</CTableHeaderCell>
                      <CTableHeaderCell>Completed</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {backups.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={6} className="text-center text-body-secondary py-4">
                          No backup records found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      backups.map((backup) => (
                        <CTableRow key={backup.id}>
                          <CTableDataCell>{backup.backup_type}</CTableDataCell>
                          <CTableDataCell>
                            <code className="small">{backup.backup_location}</code>
                          </CTableDataCell>
                          <CTableDataCell>
                            {backup.backup_size_bytes
                              ? `${(backup.backup_size_bytes / 1024 / 1024).toFixed(2)} MB`
                              : '-'}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={getStatusColor(backup.status)}>{backup.status}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>{new Date(backup.started_at).toLocaleString()}</CTableDataCell>
                          <CTableDataCell>
                            {backup.completed_at ? new Date(backup.completed_at).toLocaleString() : '-'}
                          </CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CTabPane>

          {/* Abuse Detection Tab */}
          <CTabPane visible={activeTab === 'abuse'}>
            <CRow>
              <CCol>
                <CCard>
                  <CCardHeader className="d-flex justify-content-between align-items-center">
                    <span>Abuse Detection Alerts</span>
                    <CFormSelect
                      style={{ width: 'auto' }}
                      value={alertFilter}
                      onChange={(e) => {
                        setAlertFilter(e.target.value)
                        setAlertPage(0)
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="resolved">Resolved</option>
                      <option value="false_positive">False Positive</option>
                    </CFormSelect>
                  </CCardHeader>
                  <CCardBody>
                    <CTable>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Type</CTableHeaderCell>
                          <CTableHeaderCell>Severity</CTableHeaderCell>
                          <CTableHeaderCell>Entity</CTableHeaderCell>
                          <CTableHeaderCell>Description</CTableHeaderCell>
                          <CTableHeaderCell>Threshold</CTableHeaderCell>
                          <CTableHeaderCell>Actual</CTableHeaderCell>
                          <CTableHeaderCell>Created</CTableHeaderCell>
                          <CTableHeaderCell>Actions</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {abuseAlerts.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell colSpan={8} className="text-center text-body-secondary py-4">
                              No abuse alerts found
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          abuseAlerts.map((alert) => (
                            <CTableRow key={alert.id}>
                              <CTableDataCell>{alert.alert_type.replace(/_/g, ' ')}</CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={getSeverityColor(alert.severity)}>{alert.severity}</CBadge>
                              </CTableDataCell>
                              <CTableDataCell>
                                <code className="small">{alert.entity_id}</code>
                              </CTableDataCell>
                              <CTableDataCell>{alert.description}</CTableDataCell>
                              <CTableDataCell>{alert.threshold_value}</CTableDataCell>
                              <CTableDataCell>{alert.actual_value}</CTableDataCell>
                              <CTableDataCell>{new Date(alert.created_at).toLocaleString()}</CTableDataCell>
                              <CTableDataCell>
                                {alert.status === 'open' && (
                                  <CButton
                                    color="success"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResolveAlert(alert.id, 'resolved', 'Resolved by admin')}
                                  >
                                    <CIcon icon={cilCheck} />
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

            <CRow className="mt-4">
              <CCol>
                <CCard>
                  <CCardHeader>Failed Login Attempts</CCardHeader>
                  <CCardBody>
                    <CTable>
                      <CTableHead>
                        <CTableRow>
                          <CTableHeaderCell>Email</CTableHeaderCell>
                          <CTableHeaderCell>IP Address</CTableHeaderCell>
                          <CTableHeaderCell>Is Admin</CTableHeaderCell>
                          <CTableHeaderCell>Failure Reason</CTableHeaderCell>
                          <CTableHeaderCell>Time</CTableHeaderCell>
                        </CTableRow>
                      </CTableHead>
                      <CTableBody>
                        {failedLogins.length === 0 ? (
                          <CTableRow>
                            <CTableDataCell colSpan={5} className="text-center text-body-secondary py-4">
                              No failed login attempts found
                            </CTableDataCell>
                          </CTableRow>
                        ) : (
                          failedLogins.map((attempt) => (
                            <CTableRow key={attempt.id}>
                              <CTableDataCell>{attempt.email || '-'}</CTableDataCell>
                              <CTableDataCell>
                                <code>{attempt.ip_address}</code>
                              </CTableDataCell>
                              <CTableDataCell>
                                <CBadge color={attempt.is_admin ? 'warning' : 'secondary'}>
                                  {attempt.is_admin ? 'Yes' : 'No'}
                                </CBadge>
                              </CTableDataCell>
                              <CTableDataCell>{attempt.failure_reason || '-'}</CTableDataCell>
                              <CTableDataCell>{new Date(attempt.created_at).toLocaleString()}</CTableDataCell>
                            </CTableRow>
                          ))
                        )}
                      </CTableBody>
                    </CTable>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CTabPane>
        </CTabContent>
      </CTabs>

      {/* Webhook Modal */}
      <CModal visible={showWebhookModal} onClose={() => setShowWebhookModal(false)}>
        <CModalHeader>
          <CModalTitle>{editingWebhook ? 'Edit' : 'Add'} Webhook Security Setting</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormLabel>Provider Name</CFormLabel>
          <CFormInput
            value={webhookForm.provider_name}
            onChange={(e) => setWebhookForm({ ...webhookForm, provider_name: e.target.value })}
            placeholder="e.g., twilio, vonage"
          />
          <CFormLabel className="mt-3">Webhook Endpoint</CFormLabel>
          <CFormInput
            value={webhookForm.webhook_endpoint}
            onChange={(e) => setWebhookForm({ ...webhookForm, webhook_endpoint: e.target.value })}
            placeholder="/api/webhooks/twilio"
          />
          <CFormLabel className="mt-3">Secret Key</CFormLabel>
          <CFormInput
            type="password"
            value={webhookForm.secret_key}
            onChange={(e) => setWebhookForm({ ...webhookForm, secret_key: e.target.value })}
            placeholder="Enter webhook secret"
          />
          <CFormLabel className="mt-3">Signature Algorithm</CFormLabel>
          <CFormSelect
            value={webhookForm.signature_algorithm}
            onChange={(e) => setWebhookForm({ ...webhookForm, signature_algorithm: e.target.value })}
          >
            <option value="hmac_sha256">HMAC-SHA256</option>
            <option value="hmac_sha1">HMAC-SHA1</option>
            <option value="twilio">Twilio</option>
          </CFormSelect>
          <CFormLabel className="mt-3">Rate Limit (per minute)</CFormLabel>
          <CFormInput
            type="number"
            value={webhookForm.rate_limit_per_minute}
            onChange={(e) => setWebhookForm({ ...webhookForm, rate_limit_per_minute: parseInt(e.target.value) })}
          />
          <CFormCheck
            className="mt-3"
            label="Enabled"
            checked={webhookForm.is_enabled}
            onChange={(e) => setWebhookForm({ ...webhookForm, is_enabled: e.target.checked })}
          />
          <CFormCheck
            className="mt-2"
            label="Require Signature"
            checked={webhookForm.require_signature}
            onChange={(e) => setWebhookForm({ ...webhookForm, require_signature: e.target.checked })}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowWebhookModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveWebhook} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : 'Save'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* IP Allowlist Modal */}
      <CModal visible={showIPModal} onClose={() => setShowIPModal(false)}>
        <CModalHeader>
          <CModalTitle>Add IP to Allowlist</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CFormCheck
            className="mb-3"
            label="Global (applies to all admins)"
            checked={ipForm.is_global}
            onChange={(e) => setIpForm({ ...ipForm, is_global: e.target.checked, admin_id: '' })}
          />
          {!ipForm.is_global && (
            <>
              <CFormLabel>Admin ID</CFormLabel>
              <CFormInput
                value={ipForm.admin_id}
                onChange={(e) => setIpForm({ ...ipForm, admin_id: e.target.value })}
                placeholder="UUID of admin"
              />
            </>
          )}
          <CFormLabel className="mt-3">IP Address (CIDR supported)</CFormLabel>
          <CFormInput
            value={ipForm.ip_address}
            onChange={(e) => setIpForm({ ...ipForm, ip_address: e.target.value })}
            placeholder="192.168.1.1 or 192.168.1.0/24"
          />
          <CFormLabel className="mt-3">Description</CFormLabel>
          <CFormInput
            value={ipForm.description}
            onChange={(e) => setIpForm({ ...ipForm, description: e.target.value })}
            placeholder="Optional description"
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowIPModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleSaveIP} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : 'Add'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Retention Config Modal */}
      <CModal visible={showRetentionModal} onClose={() => setShowRetentionModal(false)}>
        <CModalHeader>
          <CModalTitle>Update Data Retention Configuration</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {editingRetention && (
            <>
              <CFormLabel>Retention Days (0 = keep forever)</CFormLabel>
              <CFormInput
                type="number"
                value={editingRetention.retention_days}
                onChange={(e) =>
                  setEditingRetention({ ...editingRetention, retention_days: parseInt(e.target.value) })
                }
              />
              <CFormCheck
                className="mt-3"
                label="Auto Delete Enabled"
                checked={editingRetention.auto_delete_enabled}
                onChange={(e) =>
                  setEditingRetention({ ...editingRetention, auto_delete_enabled: e.target.checked })
                }
              />
              <CFormCheck
                className="mt-2"
                label="Archive Before Delete"
                checked={editingRetention.archive_before_delete}
                onChange={(e) =>
                  setEditingRetention({ ...editingRetention, archive_before_delete: e.target.checked })
                }
              />
              {editingRetention.archive_before_delete && (
                <>
                  <CFormLabel className="mt-3">Archive Location</CFormLabel>
                  <CFormInput
                    value={editingRetention.archive_location || ''}
                    onChange={(e) =>
                      setEditingRetention({ ...editingRetention, archive_location: e.target.value })
                    }
                    placeholder="S3 bucket path, etc."
                  />
                </>
              )}
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowRetentionModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={() => {
              handleUpdateRetention(editingRetention.id, {
                retention_days: editingRetention.retention_days,
                auto_delete_enabled: editingRetention.auto_delete_enabled,
                archive_before_delete: editingRetention.archive_before_delete,
                archive_location: editingRetention.archive_location,
              })
            }}
            disabled={loading}
          >
            {loading ? <CSpinner size="sm" /> : 'Update'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default SecuritySettings
