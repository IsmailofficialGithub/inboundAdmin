import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CAlert,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormCheck,
  CBadge,
} from '@coreui/react'
import { useAuth } from '../../../contexts/AuthContext'
import { systemSettingsAPI } from '../../../utils/api'

const SystemSettings = () => {
  const { adminProfile } = useAuth()
  const isSuperAdmin = adminProfile?.role === 'super_admin'
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const data = await systemSettingsAPI.list()
      const settingsMap = {}
      data.settings.forEach((s) => {
        settingsMap[s.key] = s.value
      })
      setSettings(settingsMap)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (key) => {
    setSaving(true)
    try {
      await systemSettingsAPI.update(key, { value: settings[key] })
      setAlert({ color: 'success', message: 'Settings updated successfully' })
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setSaving(false)
    }
  }

  const updateMaintenanceMode = (enabled, message) => {
    setSettings({
      ...settings,
      maintenance_mode: {
        enabled,
        message: message || settings.maintenance_mode?.message || 'System is under maintenance. Please check back soon.',
      },
    })
  }

  const updateReadOnlyMode = (enabled, message) => {
    setSettings({
      ...settings,
      read_only_mode: {
        enabled,
        message: message || settings.read_only_mode?.message || 'System is in read-only mode. Some operations are temporarily disabled.',
      },
    })
  }

  if (!isSuperAdmin) {
    return (
      <CAlert color="warning">You don't have permission to manage system settings.</CAlert>
    )
  }

  return (
    <>
      <h4 className="mb-4">System Settings</h4>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      <CRow>
        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <h5>Maintenance Mode</h5>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <CSpinner color="primary" />
              ) : (
                <CForm>
                  <CFormCheck
                    type="checkbox"
                    label="Enable Maintenance Mode"
                    checked={settings.maintenance_mode?.enabled || false}
                    onChange={(e) => updateMaintenanceMode(e.target.checked)}
                  />
                  <CFormLabel className="mt-3">Maintenance Message</CFormLabel>
                  <CFormTextarea
                    value={settings.maintenance_mode?.message || ''}
                    onChange={(e) =>
                      updateMaintenanceMode(settings.maintenance_mode?.enabled || false, e.target.value)
                    }
                    rows={3}
                    placeholder="System is under maintenance. Please check back soon."
                  />
                  <CButton
                    color="primary"
                    className="mt-3"
                    onClick={() => handleSave('maintenance_mode')}
                    disabled={saving}
                  >
                    {saving ? <CSpinner size="sm" /> : 'Save Settings'}
                  </CButton>
                  {settings.maintenance_mode?.enabled && (
                    <CBadge color="warning" className="ms-2">
                      Active
                    </CBadge>
                  )}
                </CForm>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <h5>Read-Only Mode</h5>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <CSpinner color="primary" />
              ) : (
                <CForm>
                  <CFormCheck
                    type="checkbox"
                    label="Enable Read-Only Mode"
                    checked={settings.read_only_mode?.enabled || false}
                    onChange={(e) => updateReadOnlyMode(e.target.checked)}
                  />
                  <CFormLabel className="mt-3">Read-Only Message</CFormLabel>
                  <CFormTextarea
                    value={settings.read_only_mode?.message || ''}
                    onChange={(e) =>
                      updateReadOnlyMode(settings.read_only_mode?.enabled || false, e.target.value)
                    }
                    rows={3}
                    placeholder="System is in read-only mode. Some operations are temporarily disabled."
                  />
                  <CButton
                    color="primary"
                    className="mt-3"
                    onClick={() => handleSave('read_only_mode')}
                    disabled={saving}
                  >
                    {saving ? <CSpinner size="sm" /> : 'Save Settings'}
                  </CButton>
                  {settings.read_only_mode?.enabled && (
                    <CBadge color="info" className="ms-2">
                      Active
                    </CBadge>
                  )}
                </CForm>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default SystemSettings
