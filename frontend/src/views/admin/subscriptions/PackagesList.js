import React, { useState, useEffect } from 'react'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CSpinner, CBadge, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormInput, CFormLabel, CFormTextarea, CFormCheck, CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSettings } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { subscriptionsAPI } from '../../../utils/api'

const PackagesList = () => {
  const { adminProfile } = useAuth()
  const canManage = adminProfile?.role === 'super_admin'

  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // Form modal
  const [formModal, setFormModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    id: '', package_name: '', package_code: '', description: '',
    monthly_price: '', currency: 'USD',
    max_agents: 1, max_inbound_numbers: 1,
    monthly_call_minutes: 0, monthly_credits: 0,
    is_active: true, is_featured: false,
  })

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ visible: false, pkg: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchPackages = async () => {
    setLoading(true)
    try {
      const data = await subscriptionsAPI.getPackages()
      setPackages(data.packages || [])
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPackages() }, [])

  const openCreateModal = () => {
    setForm({
      id: '', package_name: '', package_code: '', description: '',
      monthly_price: '', currency: 'USD',
      max_agents: 1, max_inbound_numbers: 1,
      monthly_call_minutes: 0, monthly_credits: 0,
      is_active: true, is_featured: false,
    })
    setIsEditing(false)
    setFormModal(true)
  }

  const openEditModal = (pkg) => {
    setForm({
      id: pkg.id,
      package_name: pkg.package_name || '',
      package_code: pkg.package_code || '',
      description: pkg.description || '',
      monthly_price: pkg.monthly_price || '',
      currency: pkg.currency || 'USD',
      max_agents: pkg.max_agents || 1,
      max_inbound_numbers: pkg.max_inbound_numbers || 1,
      monthly_call_minutes: pkg.monthly_call_minutes || 0,
      monthly_credits: pkg.monthly_credits || 0,
      is_active: pkg.is_active !== false,
      is_featured: pkg.is_featured || false,
    })
    setIsEditing(true)
    setFormModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const { id, ...data } = form
      data.monthly_price = parseFloat(data.monthly_price)
      data.max_agents = parseInt(data.max_agents)
      data.max_inbound_numbers = parseInt(data.max_inbound_numbers)
      data.monthly_call_minutes = parseInt(data.monthly_call_minutes)
      data.monthly_credits = parseInt(data.monthly_credits)

      if (isEditing) {
        await subscriptionsAPI.updatePackage(id, data)
        setAlert({ color: 'success', message: 'Package updated successfully!' })
      } else {
        await subscriptionsAPI.createPackage(data)
        setAlert({ color: 'success', message: 'Package created successfully!' })
      }
      setFormModal(false)
      fetchPackages()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.pkg) return
    setDeleteLoading(true)
    try {
      await subscriptionsAPI.deletePackage(deleteModal.pkg.id)
      setAlert({ color: 'success', message: 'Package deleted successfully!' })
      setDeleteModal({ visible: false, pkg: null })
      fetchPackages()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong><CIcon icon={cilSettings} className="me-2" />Subscription Packages</strong>
              {canManage && (
                <CButton color="primary" size="sm" onClick={openCreateModal}>
                  <CIcon icon={cilPlus} className="me-1" /> New Package
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

              {loading ? (
                <div className="text-center py-5"><CSpinner color="primary" /></div>
              ) : (
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Code</CTableHeaderCell>
                      <CTableHeaderCell>Price</CTableHeaderCell>
                      <CTableHeaderCell>Agents</CTableHeaderCell>
                      <CTableHeaderCell>Numbers</CTableHeaderCell>
                      <CTableHeaderCell>Minutes/mo</CTableHeaderCell>
                      <CTableHeaderCell>Credits/mo</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Featured</CTableHeaderCell>
                      {canManage && <CTableHeaderCell>Actions</CTableHeaderCell>}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {packages.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={canManage ? 10 : 9} className="text-center text-body-secondary py-4">
                          No packages found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      packages.map((pkg) => (
                        <CTableRow key={pkg.id}>
                          <CTableDataCell className="fw-semibold">{pkg.package_name}</CTableDataCell>
                          <CTableDataCell><code>{pkg.package_code}</code></CTableDataCell>
                          <CTableDataCell className="fw-bold">${Number(pkg.monthly_price).toFixed(2)}</CTableDataCell>
                          <CTableDataCell>{pkg.max_agents}</CTableDataCell>
                          <CTableDataCell>{pkg.max_inbound_numbers}</CTableDataCell>
                          <CTableDataCell>{pkg.monthly_call_minutes}</CTableDataCell>
                          <CTableDataCell>{pkg.monthly_credits}</CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={pkg.is_active ? 'success' : 'secondary'}>{pkg.is_active ? 'Active' : 'Inactive'}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {pkg.is_featured && <CBadge color="warning">Featured</CBadge>}
                          </CTableDataCell>
                          {canManage && (
                            <CTableDataCell>
                              <div className="d-flex gap-1">
                                <CButton color="info" size="sm" variant="ghost" onClick={() => openEditModal(pkg)}>
                                  <CIcon icon={cilPencil} size="sm" />
                                </CButton>
                                <CButton color="danger" size="sm" variant="ghost"
                                  onClick={() => setDeleteModal({ visible: true, pkg })}>
                                  <CIcon icon={cilTrash} size="sm" />
                                </CButton>
                              </div>
                            </CTableDataCell>
                          )}
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Create / Edit Package Modal */}
      <CModal size="lg" visible={formModal} onClose={() => setFormModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>{isEditing ? 'Edit' : 'Create'} Package</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Package Name <span className="text-danger">*</span></CFormLabel>
                <CFormInput value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} required />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Package Code <span className="text-danger">*</span></CFormLabel>
                <CFormInput value={form.package_code} onChange={(e) => setForm({ ...form, package_code: e.target.value })}
                  required disabled={isEditing} placeholder="e.g. starter, pro, enterprise" />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel>Monthly Price <span className="text-danger">*</span></CFormLabel>
                <CFormInput type="number" step="0.01" value={form.monthly_price}
                  onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Currency</CFormLabel>
                <CFormSelect value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </CFormSelect>
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={3}>
                <CFormLabel>Max Agents</CFormLabel>
                <CFormInput type="number" value={form.max_agents} onChange={(e) => setForm({ ...form, max_agents: e.target.value })} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Max Inbound Numbers</CFormLabel>
                <CFormInput type="number" value={form.max_inbound_numbers} onChange={(e) => setForm({ ...form, max_inbound_numbers: e.target.value })} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Monthly Minutes</CFormLabel>
                <CFormInput type="number" value={form.monthly_call_minutes} onChange={(e) => setForm({ ...form, monthly_call_minutes: e.target.value })} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Monthly Credits</CFormLabel>
                <CFormInput type="number" value={form.monthly_credits} onChange={(e) => setForm({ ...form, monthly_credits: e.target.value })} />
              </CCol>
            </CRow>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormCheck id="pkgActive" label="Active" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              </CCol>
              <CCol md={6}>
                <CFormCheck id="pkgFeatured" label="Featured" checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setFormModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={formLoading}>
              {formLoading ? <><CSpinner size="sm" className="me-1" /> Saving...</> : (isEditing ? 'Update Package' : 'Create Package')}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Delete Confirmation Modal */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, pkg: null })}>
        <CModalHeader><CModalTitle>Delete Package</CModalTitle></CModalHeader>
        <CModalBody>
          Are you sure you want to delete <strong>{deleteModal.pkg?.package_name}</strong>?
          <p className="text-danger mt-2 small">
            This will deactivate the package. Active subscriptions using this package must be handled first.
          </p>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, pkg: null })}>Cancel</CButton>
          <CButton color="danger" onClick={handleDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default PackagesList
