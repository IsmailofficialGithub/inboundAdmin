import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormCheck,
  CSpinner,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const CallScheduleNew = () => {
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [formData, setFormData] = useState({
    schedule_name: '',
    timezone: 'America/New_York',
    is_active: true,
    user_id: null,
    agent_id: null,
  })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setAlert(null)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/call-schedules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status >= 500) {
          setAlert({ color: 'danger', message: data.error || 'Server error. Please try again later.' })
        } else if (response.status === 401 || response.status === 403) {
          setAlert({ color: 'danger', message: 'You do not have permission to create schedules.' })
        } else {
          setAlert({ color: 'danger', message: data.error || 'Failed to create schedule' })
        }
        return
      }

      toast.success('Schedule created successfully')
      navigate(`/${rolePrefix}/scheduling/schedules/${data.schedule?.id || data.id}`)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        setAlert({ color: 'danger', message: 'Network error. Please check your connection.' })
      } else {
        setAlert({ color: 'danger', message: err.message })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <div>
              <CButton
                color="secondary"
                size="sm"
                className="me-2"
                onClick={() => navigate(`/${rolePrefix}/scheduling/schedules`)}
              >
                <CIcon icon={cilArrowLeft} />
              </CButton>
              <strong>Create New Schedule</strong>
            </div>
          </CCardHeader>
          <CCardBody>
            {alert && (
              <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                {alert.message}
              </CAlert>
            )}

            <CForm onSubmit={handleSave}>
              <CRow className="mb-3">
                <CCol md={6}>
                  <CFormLabel>Schedule Name *</CFormLabel>
                  <CFormInput
                    value={formData.schedule_name}
                    onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                    placeholder="e.g., Business Hours"
                    required
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>Timezone *</CFormLabel>
                  <CFormSelect
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    required
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC</option>
                  </CFormSelect>
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
              <CRow>
                <CCol>
                  <CButton type="submit" color="primary" disabled={saving || !formData.schedule_name}>
                    {saving ? (
                      <>
                        <CSpinner size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CIcon icon={cilSave} className="me-2" />
                        Create Schedule
                      </>
                    )}
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    className="ms-2"
                    onClick={() => navigate(`/${rolePrefix}/scheduling/schedules`)}
                  >
                    Cancel
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CallScheduleNew
