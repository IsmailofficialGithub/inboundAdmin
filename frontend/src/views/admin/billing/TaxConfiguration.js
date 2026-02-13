import React, { useState, useEffect, useCallback } from 'react'
import {
  CButton,
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
  CFormInput,
  CFormSelect,
  CSpinner,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormCheck,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilCheckCircle } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const TaxConfiguration = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)
  const [taxConfigs, setTaxConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // Create/Edit modal
  const [editModal, setEditModal] = useState({ visible: false, config: null })
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    country_code: '',
    state_code: '',
    tax_name: '',
    tax_rate: 0,
    is_default: false,
    is_active: true,
  })

  const fetchTaxConfigs = useCallback(async () => {
    setLoading(true)
    setAlert(null)
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/tax-configuration`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status >= 500) {
          setAlert({ color: 'danger', message: data.error || 'Server error. Please try again later.' })
        } else if (response.status === 401 || response.status === 403) {
          setAlert({ color: 'danger', message: 'You do not have permission to view this page.' })
        }
        setTaxConfigs([])
        return
      }

      setTaxConfigs(data.tax_configs || [])
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        setAlert({ color: 'danger', message: 'Network error. Please check your connection.' })
      }
      setTaxConfigs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTaxConfigs()
  }, [fetchTaxConfigs])

  const handleOpenEdit = (config = null) => {
    if (config) {
      setFormData({
        country_code: config.country_code,
        state_code: config.state_code || '',
        tax_name: config.tax_name,
        tax_rate: config.tax_rate,
        is_default: config.is_default,
        is_active: config.is_active,
      })
      setEditModal({ visible: true, config })
    } else {
      setFormData({
        country_code: '',
        state_code: '',
        tax_name: '',
        tax_rate: 0,
        is_default: false,
        is_active: true,
      })
      setEditModal({ visible: true, config: null })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = getAuthToken()
      const url = editModal.config
        ? `${API_BASE}/tax-configuration/${editModal.config.id}`
        : `${API_BASE}/tax-configuration`
      const method = editModal.config ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save tax configuration')

      toast.success(`Tax configuration ${editModal.config ? 'updated' : 'created'} successfully`)
      setEditModal({ visible: false, config: null })
      fetchTaxConfigs()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this tax configuration?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_BASE}/tax-configuration/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete tax configuration')

      toast.success('Tax configuration deleted successfully')
      fetchTaxConfigs()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>Tax Configuration</strong>
              {canEdit && (
                <CButton color="primary" onClick={() => handleOpenEdit()}>
                  <CIcon icon={cilPlus} className="me-2" />
                  New Tax Rate
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Country</CTableHeaderCell>
                    <CTableHeaderCell>State</CTableHeaderCell>
                    <CTableHeaderCell>Tax Name</CTableHeaderCell>
                    <CTableHeaderCell>Tax Rate</CTableHeaderCell>
                    <CTableHeaderCell>Default</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Actions</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {taxConfigs.length === 0 ? (
                    <CTableRow>
                      <CTableDataCell colSpan={7} className="text-center">
                        No tax configurations found
                      </CTableDataCell>
                    </CTableRow>
                  ) : (
                    taxConfigs.map((config) => (
                      <CTableRow key={config.id}>
                        <CTableDataCell>{config.country_code}</CTableDataCell>
                        <CTableDataCell>{config.state_code || '-'}</CTableDataCell>
                        <CTableDataCell>{config.tax_name}</CTableDataCell>
                        <CTableDataCell>{(config.tax_rate * 100).toFixed(2)}%</CTableDataCell>
                        <CTableDataCell>
                          {config.is_default ? (
                            <CBadge color="primary">
                              <CIcon icon={cilCheckCircle} className="me-1" />
                              Default
                            </CBadge>
                          ) : (
                            '-'
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {config.is_active ? (
                            <CBadge color="success">Active</CBadge>
                          ) : (
                            <CBadge color="secondary">Inactive</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          {canEdit && (
                            <>
                              <CButton
                                color="info"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEdit(config)}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton color="danger" size="sm" onClick={() => handleDelete(config.id)}>
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </>
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

      {/* Edit Modal */}
      <CModal
        visible={editModal.visible}
        onClose={() => setEditModal({ visible: false, config: null })}
      >
        <CModalHeader>
          <CModalTitle>{editModal.config ? 'Edit' : 'Create'} Tax Configuration</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Country Code *</CFormLabel>
                <CFormInput
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                  placeholder="US"
                  required
                  disabled={!canEdit}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>State Code (optional)</CFormLabel>
                <CFormInput
                  value={formData.state_code}
                  onChange={(e) => setFormData({ ...formData, state_code: e.target.value.toUpperCase() })}
                  placeholder="CA"
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Tax Name *</CFormLabel>
                <CFormInput
                  value={formData.tax_name}
                  onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
                  placeholder="Sales Tax"
                  required
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Tax Rate (%) *</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate * 100}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) / 100 || 0 })
                  }
                  required
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormCheck
                  label="Set as default for this country/state"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol>
                <CFormCheck
                  label="Active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  disabled={!canEdit}
                />
              </CCol>
            </CRow>
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal({ visible: false, config: null })}>
            Cancel
          </CButton>
          {canEdit && (
            <CButton color="primary" onClick={handleSave} disabled={saving}>
              {saving ? <CSpinner size="sm" /> : 'Save'}
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </>
  )
}

export default TaxConfiguration
