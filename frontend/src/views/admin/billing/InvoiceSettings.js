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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSettings, cilSave, cilDescription } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { invoiceSettingsAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const InvoiceSettings = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alert, setAlert] = useState(null)
  const [previewModal, setPreviewModal] = useState(false)
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

  const generatePreviewHTML = () => {
    const companyName = formData.company_name || 'Your Company Name'
    const companyAddress = formData.company_address || {}
    const addressLines = [
      companyAddress.street,
      `${companyAddress.city || ''}${companyAddress.state ? `, ${companyAddress.state}` : ''} ${companyAddress.zip || ''}`.trim(),
      companyAddress.country,
    ]
      .filter(Boolean)
      .join('<br>')

    const invoiceNumber = `${formData.invoice_number_prefix || 'INV'}-${String(formData.invoice_number_sequence || 0).padStart(4, '0')}`
    const currency = formData.default_currency || 'USD'
    const taxRate = (formData.default_tax_rate || 0) * 100
    const subtotal = 1000.00
    const taxAmount = subtotal * (formData.default_tax_rate || 0)
    const total = subtotal + taxAmount

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice Preview</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; background: #fff; }
    .header { margin-bottom: 30px; }
    .company-info { float: left; }
    .invoice-info { float: right; text-align: right; }
    .clear { clear: both; }
    .section { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
    .text-right { text-align: right; }
    .total-row { font-weight: bold; font-size: 1.1em; background-color: #f8f9fa; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    .logo { max-width: 150px; max-height: 80px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${formData.company_logo_url ? `<img src="${formData.company_logo_url}" alt="Logo" class="logo" />` : ''}
      <h1>${companyName}</h1>
      ${addressLines ? `<div>${addressLines}</div>` : ''}
      ${formData.company_phone ? `<div>Phone: ${formData.company_phone}</div>` : ''}
      ${formData.company_email ? `<div>Email: ${formData.company_email}</div>` : ''}
      ${formData.company_website ? `<div>Website: ${formData.company_website}</div>` : ''}
      ${formData.tax_id ? `<div>Tax ID: ${formData.tax_id}</div>` : ''}
      ${formData.vat_number ? `<div>VAT: ${formData.vat_number}</div>` : ''}
    </div>
    <div class="invoice-info">
      <h2>INVOICE</h2>
      <div><strong>Invoice #:</strong> ${invoiceNumber}</div>
      <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div><strong>Due Date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
      <div><strong>Status:</strong> DRAFT</div>
    </div>
    <div class="clear"></div>
  </div>

  <div class="section">
    <h3>Bill To:</h3>
    <div>
      John Doe<br>
      john.doe@example.com<br>
      123 Customer Street<br>
      New York, NY 10001<br>
      United States
    </div>
  </div>

  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sample Service Item</td>
          <td class="text-right">2</td>
          <td class="text-right">${currency} ${(500.00).toFixed(2)}</td>
          <td class="text-right">${currency} ${(1000.00).toFixed(2)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="text-right"><strong>Subtotal:</strong></td>
          <td class="text-right">${currency} ${subtotal.toFixed(2)}</td>
        </tr>
        ${taxRate > 0 ? `
        <tr>
          <td colspan="3" class="text-right"><strong>Tax (${taxRate.toFixed(2)}%):</strong></td>
          <td class="text-right">${currency} ${taxAmount.toFixed(2)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="3" class="text-right"><strong>Total:</strong></td>
          <td class="text-right">${currency} ${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  ${formData.payment_terms ? `
  <div class="section">
    <h3>Payment Terms:</h3>
    <p>${formData.payment_terms}</p>
  </div>
  ` : ''}

  ${formData.bank_account_details?.account_name || formData.bank_account_details?.account_number ? `
  <div class="section">
    <h3>Bank Account Details:</h3>
    <p>
      ${formData.bank_account_details.account_name ? `Account Name: ${formData.bank_account_details.account_name}<br>` : ''}
      ${formData.bank_account_details.account_number ? `Account Number: ${formData.bank_account_details.account_number}<br>` : ''}
      ${formData.bank_account_details.bank_name ? `Bank: ${formData.bank_account_details.bank_name}<br>` : ''}
      ${formData.bank_account_details.routing_number ? `Routing Number: ${formData.bank_account_details.routing_number}<br>` : ''}
      ${formData.bank_account_details.swift ? `SWIFT: ${formData.bank_account_details.swift}` : ''}
    </p>
  </div>
  ` : ''}

  ${formData.invoice_footer_text ? `
  <div class="footer">
    ${formData.invoice_footer_text}
  </div>
  ` : ''}
</body>
</html>
    `
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
              <CButton
                color="info"
                variant="outline"
                size="sm"
                onClick={() => setPreviewModal(true)}
              >
                <CIcon icon={cilDescription} className="me-2" />
                Preview Invoice
              </CButton>
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

      {/* Preview Modal */}
      <CModal
        size="xl"
        visible={previewModal}
        onClose={() => setPreviewModal(false)}
        scrollable
      >
        <CModalHeader>
          <CModalTitle>
            <CIcon icon={cilDescription} className="me-2" />
            Invoice Preview
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          <div style={{ border: '1px solid #ddd', padding: '20px', backgroundColor: '#fff' }}>
            <iframe
              title="Invoice Preview"
              srcDoc={generatePreviewHTML()}
              style={{
                width: '100%',
                height: '800px',
                border: 'none',
                overflow: 'auto',
              }}
            />
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setPreviewModal(false)}>
            Close
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default InvoiceSettings
