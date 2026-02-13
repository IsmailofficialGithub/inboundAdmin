import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CBadge,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const CallScheduleDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const [schedule, setSchedule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true)
      try {
        const token = getAuthToken()
        const response = await fetch(`${API_BASE}/call-schedules/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()
        
        if (!response.ok) {
          if (response.status >= 500) {
            setAlert({ color: 'danger', message: data.error || 'Server error. Please try again later.' })
          } else if (response.status === 404) {
            setAlert({ color: 'warning', message: 'Schedule not found.' })
          } else if (response.status === 401 || response.status === 403) {
            setAlert({ color: 'danger', message: 'You do not have permission to view this schedule.' })
          }
          return
        }

        setSchedule(data.schedule || data)
      } catch (err) {
        if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          setAlert({ color: 'danger', message: 'Network error. Please check your connection.' })
        }
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchSchedule()
    }
  }, [id])

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!schedule) {
    return (
      <CRow>
        <CCol>
          <CCard>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}
              <CButton color="secondary" onClick={() => navigate(`/${rolePrefix}/scheduling/schedules`)}>
                <CIcon icon={cilArrowLeft} className="me-2" />
                Back to Schedules
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
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
              <strong>Schedule: {schedule.schedule_name}</strong>
            </div>
            {schedule.is_active ? (
              <CBadge color="success">Active</CBadge>
            ) : (
              <CBadge color="secondary">Inactive</CBadge>
            )}
          </CCardHeader>
          <CCardBody>
            {alert && (
              <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                {alert.message}
              </CAlert>
            )}

            <CRow>
              <CCol md={6}>
                <p>
                  <strong>Schedule Name:</strong> {schedule.schedule_name}
                </p>
                <p>
                  <strong>Timezone:</strong> {schedule.timezone}
                </p>
                <p>
                  <strong>User:</strong> {schedule.user_email || 'N/A'}
                </p>
                <p>
                  <strong>Agent:</strong> {schedule.agent_name || '-'}
                </p>
                <p>
                  <strong>Created:</strong> {new Date(schedule.created_at).toLocaleString()}
                </p>
                <p>
                  <strong>Updated:</strong> {new Date(schedule.updated_at).toLocaleString()}
                </p>
              </CCol>
            </CRow>

            <p className="text-muted mt-3">
              Schedule detail view. Availability and overrides can be managed here.
            </p>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CallScheduleDetail
