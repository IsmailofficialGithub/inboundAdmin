import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CFormTextarea,
  CFormLabel,
  CFormCheck,
  CSpinner,
  CBadge,
  CAlert,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CListGroup,
  CListGroupItem,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash, cilSettings, cilInfo, cilTag } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { packagesAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const PackagesManagement = () => {
  const navigate = useNavigate()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)

  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // Package form modal
  const [packageModal, setPackageModal] = useState(false)
  const [packageLoading, setPackageLoading] = useState(false)
  const [packageForm, setPackageForm] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    tier: 'free',
    price_monthly: '',
    price_yearly: '',
    currency: 'USD',
    credits_included: 0,
    is_active: true,
    is_featured: false,
    sort_order: 0,
  })

  // Package detail modal (for managing features and variables)
  const [detailModal, setDetailModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [activeTab, setActiveTab] = useState('features')

  // Feature form
  const [featureModal, setFeatureModal] = useState(false)
  const [featureForm, setFeatureForm] = useState({
    feature_key: '',
    feature_label: '',
    feature_template: '',
    display_order: 0,
    is_highlighted: false,
  })

  // Variable form
  const [variableModal, setVariableModal] = useState(false)
  const [variableForm, setVariableForm] = useState({
    variable_key: '',
    variable_value: '',
    variable_type: 'text',
  })

  useEffect(() => {
    fetchPackages()
  }, [])

  const fetchPackages = async () => {
    setLoading(true)
    try {
      const data = await packagesAPI.list({ include_inactive: true })
      setPackages(data.packages || [])
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const openPackageModal = (pkg = null) => {
    if (pkg) {
      setPackageForm({
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description || '',
        tier: pkg.tier,
        price_monthly: pkg.price_monthly || '',
        price_yearly: pkg.price_yearly || '',
        currency: pkg.currency || 'USD',
        credits_included: pkg.credits_included || 0,
        is_active: pkg.is_active,
        is_featured: pkg.is_featured || false,
        sort_order: pkg.sort_order || 0,
      })
    } else {
      setPackageForm({
        id: '',
        name: '',
        slug: '',
        description: '',
        tier: 'free',
        price_monthly: '',
        price_yearly: '',
        currency: 'USD',
        credits_included: 0,
        is_active: true,
        is_featured: false,
        sort_order: 0,
      })
    }
    setPackageModal(true)
  }

  const handlePackageSubmit = async (e) => {
    e.preventDefault()
    setPackageLoading(true)
    try {
      if (packageForm.id) {
        await packagesAPI.update(packageForm.id, packageForm)
        toast.success('Package updated!')
      } else {
        await packagesAPI.create(packageForm)
        toast.success('Package created!')
      }
      setPackageModal(false)
      fetchPackages()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPackageLoading(false)
    }
  }

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this package?')) return
    try {
      await packagesAPI.delete(id)
      toast.success('Package deactivated!')
      fetchPackages()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const openDetailModal = async (pkg) => {
    try {
      const data = await packagesAPI.getById(pkg.id)
      // Handle both response formats: { package: {...} } or direct package object
      const packageData = data.package || data
      if (!packageData) {
        toast.error('Package data not found')
        return
      }
      // Ensure features and variables are arrays
      const packageWithDefaults = {
        ...packageData,
        features: packageData.features || [],
        variables: packageData.variables || [],
      }
      console.log('Setting selected package:', packageWithDefaults)
      setSelectedPackage(packageWithDefaults)
      setDetailModal(true)
      setActiveTab('features')
    } catch (err) {
      console.error('Error fetching package details:', err)
      toast.error(err.message)
    }
  }

  const handleFeatureSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPackage) return
    try {
      await packagesAPI.upsertFeature(selectedPackage.id, featureForm)
      toast.success('Feature saved!')
      setFeatureModal(false)
      setFeatureForm({
        feature_key: '',
        feature_label: '',
        feature_template: '',
        display_order: 0,
        is_highlighted: false,
      })
      // Refresh package details
      const data = await packagesAPI.getById(selectedPackage.id)
      setSelectedPackage(data.package)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleVariableSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPackage) return
    try {
      await packagesAPI.upsertVariable(selectedPackage.id, variableForm)
      toast.success('Variable saved!')
      setVariableModal(false)
      setVariableForm({
        variable_key: '',
        variable_value: '',
        variable_type: 'text',
      })
      // Refresh package details
      const data = await packagesAPI.getById(selectedPackage.id)
      setSelectedPackage(data.package)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteFeature = async (featureKey) => {
    if (!window.confirm('Delete this feature?')) return
    if (!selectedPackage) return
    try {
      await packagesAPI.deleteFeature(selectedPackage.id, featureKey)
      toast.success('Feature deleted!')
      const data = await packagesAPI.getById(selectedPackage.id)
      setSelectedPackage(data.package)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteVariable = async (variableKey) => {
    if (!window.confirm('Delete this variable?')) return
    if (!selectedPackage) return
    try {
      await packagesAPI.deleteVariable(selectedPackage.id, variableKey)
      toast.success('Variable deleted!')
      const data = await packagesAPI.getById(selectedPackage.id)
      setSelectedPackage(data.package)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilSettings} className="me-2" />
                Package Management
              </strong>
              {canEdit && (
                <CButton color="primary" size="sm" onClick={() => openPackageModal()}>
                  <CIcon icon={cilPlus} className="me-2" />
                  Create Package
                </CButton>
              )}
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Name</CTableHeaderCell>
                      <CTableHeaderCell>Tier</CTableHeaderCell>
                      <CTableHeaderCell>Price (Monthly)</CTableHeaderCell>
                      <CTableHeaderCell>Credits</CTableHeaderCell>
                      <CTableHeaderCell>Features</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {packages.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={canEdit ? 7 : 6} className="text-center text-body-secondary py-4">
                          No packages found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      packages.map((pkg) => (
                        <CTableRow key={pkg.id}>
                          <CTableDataCell>
                            <strong>{pkg.name}</strong>
                            {pkg.is_featured && (
                              <CBadge color="warning" className="ms-2">Featured</CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color="secondary">{pkg.tier}</CBadge>
                          </CTableDataCell>
                          <CTableDataCell>
                            {formatCurrency(pkg.price_monthly || 0, pkg.currency)}
                          </CTableDataCell>
                          <CTableDataCell>{pkg.credits_included || 0}</CTableDataCell>
                          <CTableDataCell>
                            <span className="text-body-secondary small">
                              {pkg.features?.length || 0} features
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>
                            <CBadge color={pkg.is_active ? 'success' : 'secondary'}>
                              {pkg.is_active ? 'Active' : 'Inactive'}
                            </CBadge>
                          </CTableDataCell>
                          {canEdit && (
                            <CTableDataCell>
                              <CButton
                                color="info"
                                size="sm"
                                variant="outline"
                                className="me-2"
                                onClick={() => openDetailModal(pkg)}
                              >
                                <CIcon icon={cilInfo} className="me-1" />
                                Manage
                              </CButton>
                              <CButton
                                color="primary"
                                size="sm"
                                variant="outline"
                                className="me-2"
                                onClick={() => openPackageModal(pkg)}
                              >
                                <CIcon icon={cilPencil} />
                              </CButton>
                              <CButton
                                color="danger"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeletePackage(pkg.id)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
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

      {/* Package Form Modal */}
      <CModal visible={packageModal} onClose={() => setPackageModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{packageForm.id ? 'Edit' : 'Create'} Package</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handlePackageSubmit}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Package Name *</CFormLabel>
                <CFormInput
                  value={packageForm.name}
                  onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Slug *</CFormLabel>
                <CFormInput
                  value={packageForm.slug}
                  onChange={(e) => setPackageForm({ ...packageForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                  disabled={!!packageForm.id}
                  placeholder="e.g. pro, premium"
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Description</CFormLabel>
                <CFormTextarea
                  rows={2}
                  value={packageForm.description}
                  onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel>Tier *</CFormLabel>
                <CFormSelect
                  value={packageForm.tier}
                  onChange={(e) => setPackageForm({ ...packageForm, tier: e.target.value })}
                  required
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Price (Monthly)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={packageForm.price_monthly}
                  onChange={(e) => setPackageForm({ ...packageForm, price_monthly: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Price (Yearly)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={packageForm.price_yearly}
                  onChange={(e) => setPackageForm({ ...packageForm, price_yearly: e.target.value })}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={4}>
                <CFormLabel>Currency</CFormLabel>
                <CFormInput
                  value={packageForm.currency}
                  onChange={(e) => setPackageForm({ ...packageForm, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Credits Included</CFormLabel>
                <CFormInput
                  type="number"
                  value={packageForm.credits_included}
                  onChange={(e) => setPackageForm({ ...packageForm, credits_included: parseInt(e.target.value) || 0 })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Sort Order</CFormLabel>
                <CFormInput
                  type="number"
                  value={packageForm.sort_order}
                  onChange={(e) => setPackageForm({ ...packageForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormCheck
                  id="pkgActive"
                  label="Active"
                  checked={packageForm.is_active}
                  onChange={(e) => setPackageForm({ ...packageForm, is_active: e.target.checked })}
                />
              </CCol>
              <CCol md={6}>
                <CFormCheck
                  id="pkgFeatured"
                  label="Featured"
                  checked={packageForm.is_featured}
                  onChange={(e) => setPackageForm({ ...packageForm, is_featured: e.target.checked })}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setPackageModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" disabled={packageLoading}>
              {packageLoading ? <CSpinner size="sm" className="me-2" /> : null}
              {packageForm.id ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Package Detail Modal (Features & Variables) */}
      <CModal visible={detailModal} onClose={() => setDetailModal(false)} size="xl">
        <CModalHeader>
          <CModalTitle>
            Manage Package: {selectedPackage?.name}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedPackage ? (
            <>
              <CNav variant="tabs" className="mb-3">
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'features'}
                    onClick={() => setActiveTab('features')}
                    href="#"
                  >
                    Features
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'variables'}
                    onClick={() => setActiveTab('variables')}
                    href="#"
                  >
                    Variables
                  </CNavLink>
                </CNavItem>
                <CNavItem>
                  <CNavLink
                    active={activeTab === 'preview'}
                    onClick={() => setActiveTab('preview')}
                    href="#"
                  >
                    Preview
                  </CNavLink>
                </CNavItem>
              </CNav>
              <CTabContent>
                <CTabPane visible={activeTab === 'features'}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Package Features</h6>
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => {
                          setFeatureForm({
                            feature_key: '',
                            feature_label: '',
                            feature_template: '',
                            display_order: selectedPackage.features?.length || 0,
                            is_highlighted: false,
                          })
                          setFeatureModal(true)
                        }}
                      >
                        <CIcon icon={cilPlus} className="me-2" />
                        Add Feature
                      </CButton>
                    </div>
                    <CListGroup>
                      {selectedPackage.features?.length > 0 ? (
                        selectedPackage.features.map((feature) => (
                          <CListGroupItem key={feature.id} className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="fw-bold">
                                {feature.feature_label}
                                {feature.is_highlighted && (
                                  <CBadge color="warning" className="ms-2">Highlighted</CBadge>
                                )}
                              </div>
                              <div className="text-body-secondary small mt-1">
                                Template: <code>{feature.feature_template}</code>
                              </div>
                              <div className="text-success mt-1">
                                Rendered: <strong>{feature.rendered_text}</strong>
                              </div>
                            </div>
                            <div>
                              <CButton
                                color="danger"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteFeature(feature.feature_key)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </div>
                          </CListGroupItem>
                        ))
                      ) : (
                        <CListGroupItem className="text-center text-body-secondary">
                          No features added yet
                        </CListGroupItem>
                      )}
                    </CListGroup>
                </CTabPane>
                <CTabPane visible={activeTab === 'variables'}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6>Package Variables</h6>
                      <CButton
                        color="primary"
                        size="sm"
                        onClick={() => {
                          setVariableForm({
                            variable_key: '',
                            variable_value: '',
                            variable_type: 'text',
                          })
                          setVariableModal(true)
                        }}
                      >
                        <CIcon icon={cilPlus} className="me-2" />
                        Add Variable
                      </CButton>
                    </div>
                    <CListGroup>
                      {selectedPackage.variables?.length > 0 ? (
                        selectedPackage.variables.map((variable) => (
                          <CListGroupItem key={variable.id} className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="fw-bold">
                                {variable.variable_key}
                                <CBadge color="secondary" className="ms-2">{variable.variable_type}</CBadge>
                              </div>
                              <div className="text-body-secondary mt-1">
                                Value: <code>{variable.variable_value}</code>
                              </div>
                            </div>
                            <div>
                              <CButton
                                color="danger"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteVariable(variable.variable_key)}
                              >
                                <CIcon icon={cilTrash} />
                              </CButton>
                            </div>
                          </CListGroupItem>
                        ))
                      ) : (
                        <CListGroupItem className="text-center text-body-secondary">
                          No variables added yet
                        </CListGroupItem>
                      )}
                    </CListGroup>
                </CTabPane>
                <CTabPane visible={activeTab === 'preview'}>
                    <h6>Package Preview</h6>
                    <CCard>
                      <CCardBody>
                        <h4>{selectedPackage.name}</h4>
                        <p className="text-body-secondary">{selectedPackage.description}</p>
                        <div className="mb-3">
                          <strong>Price:</strong> {formatCurrency(selectedPackage.price_monthly || 0, selectedPackage.currency)}/month
                        </div>
                        <div className="mb-3">
                          <strong>Credits:</strong> {selectedPackage.credits_included || 0}
                        </div>
                        <hr />
                        <h6>Features:</h6>
                        <ul>
                          {selectedPackage.features?.map((feature, idx) => (
                            <li key={idx}>
                              {feature.rendered_text}
                              {feature.is_highlighted && <CBadge color="warning" className="ms-2">Featured</CBadge>}
                            </li>
                          ))}
                        </ul>
                      </CCardBody>
                    </CCard>
                </CTabPane>
              </CTabContent>
            </>
          ) : (
            <div className="text-center py-4">
              <CSpinner color="primary" />
              <div className="mt-2 text-body-secondary">Loading package details...</div>
            </div>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Feature Form Modal */}
      <CModal visible={featureModal} onClose={() => setFeatureModal(false)}>
        <CModalHeader>
          <CModalTitle>Add/Edit Feature</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleFeatureSubmit}>
          <CModalBody>
            <CFormLabel>Feature Key *</CFormLabel>
            <CFormInput
              value={featureForm.feature_key}
              onChange={(e) => setFeatureForm({ ...featureForm, feature_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              required
              placeholder="e.g. credits, voice_agents"
            />
            <div className="small text-body-secondary mt-1">
              Use lowercase with underscores (e.g., max_voice_agents)
            </div>

            <CFormLabel className="mt-3">Feature Label *</CFormLabel>
            <CFormInput
              value={featureForm.feature_label}
              onChange={(e) => setFeatureForm({ ...featureForm, feature_label: e.target.value })}
              required
              placeholder="e.g. Credits Included"
            />

            <CFormLabel className="mt-3">Feature Template *</CFormLabel>
            <CFormTextarea
              rows={3}
              value={featureForm.feature_template}
              onChange={(e) => setFeatureForm({ ...featureForm, feature_template: e.target.value })}
              required
              placeholder="e.g. {{credits}} credits per month"
            />
            <div className="small text-body-secondary mt-1">
              Use {'{{variable}}'} placeholders. Built-in: {'{{credits}}'}, {'{{price_monthly}}'}, {'{{currency}}'}
            </div>

            <CRow className="mt-3">
              <CCol md={6}>
                <CFormLabel>Display Order</CFormLabel>
                <CFormInput
                  type="number"
                  value={featureForm.display_order}
                  onChange={(e) => setFeatureForm({ ...featureForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </CCol>
              <CCol md={6} className="d-flex align-items-end">
                <CFormCheck
                  id="featureHighlighted"
                  label="Highlighted"
                  checked={featureForm.is_highlighted}
                  onChange={(e) => setFeatureForm({ ...featureForm, is_highlighted: e.target.checked })}
                />
              </CCol>
            </CRow>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setFeatureModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary">
              Save Feature
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Variable Form Modal */}
      <CModal visible={variableModal} onClose={() => setVariableModal(false)}>
        <CModalHeader>
          <CModalTitle>Add/Edit Variable</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleVariableSubmit}>
          <CModalBody>
            <CFormLabel>Variable Key *</CFormLabel>
            <CFormInput
              value={variableForm.variable_key}
              onChange={(e) => setVariableForm({ ...variableForm, variable_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              required
              placeholder="e.g. max_voice_agents"
            />
            <div className="small text-body-secondary mt-1">
              Use this key in feature templates as {'{{key}}'}
            </div>

            <CFormLabel className="mt-3">Variable Value *</CFormLabel>
            <CFormInput
              value={variableForm.variable_value}
              onChange={(e) => setVariableForm({ ...variableForm, variable_value: e.target.value })}
              required
              placeholder="e.g. 5 or Unlimited"
            />

            <CFormLabel className="mt-3">Variable Type</CFormLabel>
            <CFormSelect
              value={variableForm.variable_type}
              onChange={(e) => setVariableForm({ ...variableForm, variable_type: e.target.value })}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="currency">Currency</option>
            </CFormSelect>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setVariableModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary">
              Save Variable
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default PackagesManagement
