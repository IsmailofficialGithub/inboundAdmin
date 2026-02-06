import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CSpinner,
  CAlert,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilSave } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { invoiceSettingsAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const InvoiceSettings = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: { street: '', city: '', state: '', zip: '', country: '' },
    company_phone: '',
    company_email: '',
    company_website: '',
    company_logo_url: '',
    tax_id: '',
    vat_number: '',
    default_tax_rate: 0,
    default_currency: 'USD',
    invoice_number_prefix: 'INV',
    invoice_number_sequence: 0,
    invoice_footer_text: '',
    payment_terms: '',
    bank_account_details: { account_name: '', account_number: '', bank_name: '', routing_number: '', swift: '' },
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const data = await invoiceSettingsAPI.get()
      if (data.settings) {
        setFormData({
          company_name: data.settings.company_name || '',
          company_address: typeof data.settings.company_address === 'object' ? data.settings.company_address : { street: '', city: '', state: '', zip: '', country: '' },
          company_phone: data.settings.company_phone || '',
          company_email: data.settings.company_email || '',
          company_website: data.settings.company_website || '',
          company_logo_url: data.settings.company_logo_url || '',
          tax_id: data.settings.tax_id || '',
          vat_number: data.settings.vat_number || '',
          default_tax_rate: data.settings.default_tax_rate || 0,
          default_currency: data.settings.default_currency || 'USD',
          invoice_number_prefix: data.settings.invoice_number_prefix || 'INV',
          invoice_number_sequence: data.settings.invoice_number_sequence || 0,
          invoice_footer_text: data.settings.invoice_footer_text || '',
          payment_terms: data.settings.payment_terms || '',
          bank_account_details: typeof data.settings.bank_account_details === 'object' ? data.settings.bank_account_details : { account_name: '', account_number: '', bank_name: '', routing_number: '', swift: '' },
        })
      }
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit) {
      toast.error('You do not have permission to edit invoice settings')
      return
    }

    setSaving(true)
    try {
      await invoiceSettingsAPI.update(formData)
      setAlert({ color: 'success', message: 'Invoice settings saved successfully!' })
      toast.success('Settings saved!')
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNestedChange = (parent, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }))
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
              <strong>
                <CIcon icon={cilSettings} className="me-2" />
                Invoice Template Settings
              </strong>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CForm onSubmit={handleSubmit}>
                <h5 className="mb-3">Company Information</h5>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Company Name *</CFormLabel>
                    <CFormInput
                      value={formData.company_name}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      required
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Company Email</CFormLabel>
                    <CFormInput
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => handleChange('company_email', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Company Phone</CFormLabel>
                    <CFormInput
                      value={formData.company_phone}
                      onChange={(e) => handleChange('company_phone', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Company Website</CFormLabel>
                    <CFormInput
                      value={formData.company_website}
                      onChange={(e) => handleChange('company_website', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Company Address</CFormLabel>
                    <CFormInput
                      placeholder="Street Address"
                      value={formData.company_address.street}
                      onChange={(e) => handleNestedChange('company_address', 'street', e.target.value)}
                      disabled={!canEdit}
                      className="mb-2"
                    />
                    <CRow>
                      <CCol md={4}>
                        <CFormInput
                          placeholder="City"
                          value={formData.company_address.city}
                          onChange={(e) => handleNestedChange('company_address', 'city', e.target.value)}
                          disabled={!canEdit}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormInput
                          placeholder="State/Province"
                          value={formData.company_address.state}
                          onChange={(e) => handleNestedChange('company_address', 'state', e.target.value)}
                          disabled={!canEdit}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormInput
                          placeholder="ZIP/Postal Code"
                          value={formData.company_address.zip}
                          onChange={(e) => handleNestedChange('company_address', 'zip', e.target.value)}
                          disabled={!canEdit}
                        />
                      </CCol>
                    </CRow>
                    <CFormInput
                      placeholder="Country"
                      value={formData.company_address.country}
                      onChange={(e) => handleNestedChange('company_address', 'country', e.target.value)}
                      disabled={!canEdit}
                      className="mt-2"
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Tax ID</CFormLabel>
                    <CFormInput
                      value={formData.tax_id}
                      onChange={(e) => handleChange('tax_id', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>VAT Number</CFormLabel>
                    <CFormInput
                      value={formData.vat_number}
                      onChange={(e) => handleChange('vat_number', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <hr className="my-4" />

                <h5 className="mb-3">Invoice Numbering</h5>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Invoice Number Prefix</CFormLabel>
                    <CFormInput
                      value={formData.invoice_number_prefix}
                      onChange={(e) => handleChange('invoice_number_prefix', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Current Sequence Number</CFormLabel>
                    <CFormInput
                      type="number"
                      value={formData.invoice_number_sequence}
                      onChange={(e) => handleChange('invoice_number_sequence', parseInt(e.target.value) || 0)}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <hr className="my-4" />

                <h5 className="mb-3">Tax & Currency</h5>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Default Tax Rate (%)</CFormLabel>
                    <CInputGroup>
                      <CFormInput
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.default_tax_rate * 100}
                        onChange={(e) => handleChange('default_tax_rate', parseFloat(e.target.value) / 100 || 0)}
                        disabled={!canEdit}
                      />
                      <CInputGroupText>%</CInputGroupText>
                    </CInputGroup>
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Default Currency</CFormLabel>
                    <CFormInput
                      value={formData.default_currency}
                      onChange={(e) => handleChange('default_currency', e.target.value.toUpperCase())}
                      maxLength={3}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <hr className="my-4" />

                <h5 className="mb-3">Payment Terms & Footer</h5>
                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Payment Terms</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={formData.payment_terms}
                      onChange={(e) => handleChange('payment_terms', e.target.value)}
                      placeholder="e.g., Payment is due within 30 days of invoice date."
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol>
                    <CFormLabel>Invoice Footer Text</CFormLabel>
                    <CFormTextarea
                      rows={3}
                      value={formData.invoice_footer_text}
                      onChange={(e) => handleChange('invoice_footer_text', e.target.value)}
                      placeholder="e.g., Thank you for your business!"
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <hr className="my-4" />

                <h5 className="mb-3">Bank Account Details (Optional)</h5>
                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Account Name</CFormLabel>
                    <CFormInput
                      value={formData.bank_account_details.account_name}
                      onChange={(e) => handleNestedChange('bank_account_details', 'account_name', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Account Number</CFormLabel>
                    <CFormInput
                      value={formData.bank_account_details.account_number}
                      onChange={(e) => handleNestedChange('bank_account_details', 'account_number', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-3">
                  <CCol md={6}>
                    <CFormLabel>Bank Name</CFormLabel>
                    <CFormInput
                      value={formData.bank_account_details.bank_name}
                      onChange={(e) => handleNestedChange('bank_account_details', 'bank_name', e.target.value)}
                      disabled={!canEdit}
                    />
                  </CCol>
                  <CCol md={6}>
                    <CFormLabel>Routing Number / SWIFT</CFormLabel>
                    <CFormInput
                      value={formData.bank_account_details.routing_number || formData.bank_account_details.swift}
                      onChange={(e) => {
                        const field = formData.bank_account_details.swift ? 'swift' : 'routing_number'
                        handleNestedChange('bank_account_details', field, e.target.value)
                      }}
                      disabled={!canEdit}
                    />
                  </CCol>
                </CRow>

                {canEdit && (
                  <div className="d-flex justify-content-end mt-4">
                    <CButton type="submit" color="primary" disabled={saving}>
                      {saving ? (
                        <>
                          <CSpinner size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CIcon icon={cilSave} className="me-2" />
                          Save Settings
                        </>
                      )}
                    </CButton>
                  </div>
                )}
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default InvoiceSettings
