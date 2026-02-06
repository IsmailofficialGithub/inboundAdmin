import React, { useState, useEffect } from 'react'
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
  CSpinner,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormCheck,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilToggleOn, cilToggleOff } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { featureFlagsAPI } from '../../../utils/api'

const FeatureFlags = () => {
  const { adminProfile } = useAuth()
  const isSuperAdmin = adminProfile?.role === 'super_admin'
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [selectedFlag, setSelectedFlag] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: false,
    enabled_for_roles: [],
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    fetchFlags()
  }, [])

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const data = await featureFlagsAPI.list()
      setFlags(data.featureFlags || [])
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setFormLoading(true)
    try {
      await featureFlagsAPI.create(formData)
      setAlert({ color: 'success', message: 'Feature flag created successfully' })
      setCreateModal(false)
      setFormData({ name: '', description: '', enabled: false, enabled_for_roles: [] })
      fetchFlags()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdate = async () => {
    setFormLoading(true)
    try {
      await featureFlagsAPI.update(selectedFlag.id, formData)
      setAlert({ color: 'success', message: 'Feature flag updated successfully' })
      setEditModal(false)
      setSelectedFlag(null)
      fetchFlags()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggle = async (flag) => {
    try {
      await featureFlagsAPI.update(flag.id, { enabled: !flag.enabled })
      fetchFlags()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    }
  }

  const handleDelete = async () => {
    setFormLoading(true)
    try {
      await featureFlagsAPI.delete(selectedFlag.id)
      setAlert({ color: 'success', message: 'Feature flag deleted successfully' })
      setDeleteModal(false)
      setSelectedFlag(null)
      fetchFlags()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setFormLoading(false)
    }
  }

  const openEditModal = (flag) => {
    setSelectedFlag(flag)
    setFormData({
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      enabled_for_roles: flag.enabled_for_roles || [],
    })
    setEditModal(true)
  }

  if (!isSuperAdmin) {
    return (
      <CAlert color="warning">You don't have permission to manage feature flags.</CAlert>
    )
  }

  return (
    <>
      <h4 className="mb-4">Feature Flags</h4>

      {alert && (
        <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </CAlert>
      )}

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <h5>Feature Toggles</h5>
          <CButton color="primary" onClick={() => setCreateModal(true)}>
            <CIcon icon={cilPlus} className="me-2" />
            New Feature Flag
          </CButton>
        </CCardHeader>
        <CCardBody>
          {loading ? (
            <div className="text-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Name</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                  <CTableHeaderCell>Status</CTableHeaderCell>
                  <CTableHeaderCell>Actions</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {flags.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan="4" className="text-center">
                      No feature flags found
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  flags.map((flag) => (
                    <CTableRow key={flag.id}>
                      <CTableDataCell>
                        <strong>{flag.name}</strong>
                      </CTableDataCell>
                      <CTableDataCell>{flag.description || 'N/A'}</CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color={flag.enabled ? 'success' : 'secondary'}
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggle(flag)}
                        >
                          <CIcon icon={flag.enabled ? cilToggleOn : cilToggleOff} />
                          {flag.enabled ? ' Enabled' : ' Disabled'}
                        </CButton>
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton
                          color="primary"
                          variant="outline"
                          size="sm"
                          className="me-2"
                          onClick={() => openEditModal(flag)}
                        >
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton
                          color="danger"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFlag(flag)
                            setDeleteModal(true)
                          }}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          )}
        </CCardBody>
      </CCard>

      {/* Create Modal */}
      <CModal visible={createModal} onClose={() => setCreateModal(false)}>
        <CModalHeader>
          <CModalTitle>Create Feature Flag</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormLabel>Name *</CFormLabel>
            <CFormInput
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="feature_name"
            />
            <CFormLabel className="mt-3">Description</CFormLabel>
            <CFormTextarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <CFormCheck
              className="mt-3"
              type="checkbox"
              label="Enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setCreateModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleCreate} disabled={formLoading || !formData.name}>
            {formLoading ? <CSpinner size="sm" /> : 'Create'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)}>
        <CModalHeader>
          <CModalTitle>Edit Feature Flag</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormLabel>Name *</CFormLabel>
            <CFormInput
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <CFormLabel className="mt-3">Description</CFormLabel>
            <CFormTextarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <CFormCheck
              className="mt-3"
              type="checkbox"
              label="Enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setEditModal(false)}>
            Cancel
          </CButton>
          <CButton color="primary" onClick={handleUpdate} disabled={formLoading}>
            {formLoading ? <CSpinner size="sm" /> : 'Update'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Delete Modal */}
      <CModal visible={deleteModal} onClose={() => setDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Delete Feature Flag</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete "{selectedFlag?.name}"? This action cannot be undone.
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal(false)}>
            Cancel
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={formLoading}>
            {formLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FeatureFlags
