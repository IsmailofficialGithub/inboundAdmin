import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudDownload, cilEnvelopeOpen, cilDollar } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { invoicesAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const InvoiceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { rolePrefix } = useAuth()
  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  useEffect(() => {
    fetchInvoice()
  }, [id])

  const fetchInvoice = async () => {
    setLoading(true)
    try {
      const data = await invoicesAPI.getById(id)
      setInvoice(data.invoice)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      await invoicesAPI.download(id)
      toast.success('Invoice downloaded!')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSendEmail = async () => {
    try {
      await invoicesAPI.sendEmail(id)
      toast.success('Invoice email sent!')
      fetchInvoice()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      draft: 'secondary',
      sent: 'info',
      paid: 'success',
      overdue: 'warning',
      cancelled: 'danger',
    }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <CAlert color="danger">
        Invoice not found. <CButton onClick={() => navigate(`/${rolePrefix}/billing/invoices`)}>Go Back</CButton>
      </CAlert>
    )
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <div>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="me-2"
                  onClick={() => navigate(`/${rolePrefix}/billing/invoices`)}
                >
                  <CIcon icon={cilArrowLeft} className="me-2" />
                  Back to Invoices
                </CButton>
                <strong>
                  <CIcon icon={cilDollar} className="me-2" />
                  Invoice {invoice.invoice_number}
                </strong>
              </div>
              <div>
                <CButton color="primary" variant="outline" size="sm" className="me-2" onClick={handleDownload}>
                  <CIcon icon={cilCloudDownload} className="me-2" />
                  Download
                </CButton>
                <CButton color="info" variant="outline" size="sm" onClick={handleSendEmail}>
                  <CIcon icon={cilEnvelopeOpen} className="me-2" />
                  Send Email
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CRow className="mb-4">
                <CCol md={6}>
                  <h6>Invoice Information</h6>
                  <p>
                    <strong>Invoice Number:</strong> {invoice.invoice_number}
                  </p>
                  {invoice.packages && (
                    <p>
                      <strong>Package:</strong>{' '}
                      <CBadge color="info">
                        {invoice.packages.name} ({invoice.packages.tier})
                      </CBadge>
                    </p>
                  )}
                  <p>
                    <strong>Status:</strong> {getStatusBadge(invoice.status)}
                  </p>
                  <p>
                    <strong>Invoice Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}
                  </p>
                  {invoice.due_date && (
                    <p>
                      <strong>Due Date:</strong> {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  )}
                  {invoice.paid_at && (
                    <p>
                      <strong>Paid At:</strong> {new Date(invoice.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </CCol>
                <CCol md={6}>
                  <h6>Customer Information</h6>
                  <p>
                    <strong>Email:</strong> {invoice.users?.email || '-'}
                  </p>
                  <p>
                    <strong>Name:</strong>{' '}
                    {invoice.users?.first_name || invoice.users?.last_name
                      ? `${invoice.users?.first_name || ''} ${invoice.users?.last_name || ''}`.trim()
                      : '-'}
                  </p>
                </CCol>
              </CRow>

              <h6 className="mb-3">Invoice Items</h6>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Description</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Quantity</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Unit Price</CTableHeaderCell>
                    <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(invoice.items || []).map((item, idx) => (
                    <CTableRow key={idx}>
                      <CTableDataCell>{item.description || item.name || 'Item'}</CTableDataCell>
                      <CTableDataCell className="text-end">{item.quantity || 1}</CTableDataCell>
                      <CTableDataCell className="text-end">
                        {formatCurrency(item.unit_price || item.price || 0, invoice.currency)}
                      </CTableDataCell>
                      <CTableDataCell className="text-end">
                        {formatCurrency(item.total || item.quantity * (item.unit_price || item.price || 0), invoice.currency)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              <CRow className="mt-4">
                <CCol md={6}></CCol>
                <CCol md={6}>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal:</span>
                    <strong>{formatCurrency(invoice.subtotal, invoice.currency)}</strong>
                  </div>
                  {invoice.discount_amount > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Discount:</span>
                      <strong>-{formatCurrency(invoice.discount_amount, invoice.currency)}</strong>
                    </div>
                  )}
                  {invoice.tax_amount > 0 && (
                    <div className="d-flex justify-content-between mb-2">
                      <span>Tax ({(invoice.tax_rate * 100).toFixed(2)}%):</span>
                      <strong>{formatCurrency(invoice.tax_amount, invoice.currency)}</strong>
                    </div>
                  )}
                  <hr />
                  <div className="d-flex justify-content-between">
                    <strong>Total:</strong>
                    <strong className="fs-5">{formatCurrency(invoice.total_amount, invoice.currency)}</strong>
                  </div>
                </CCol>
              </CRow>

              {invoice.notes && (
                <CRow className="mt-4">
                  <CCol>
                    <h6>Notes</h6>
                    <p>{invoice.notes}</p>
                  </CCol>
                </CRow>
              )}

              {invoice.email_sent && (
                <CRow className="mt-3">
                  <CCol>
                    <CBadge color="success">Email sent on {new Date(invoice.email_sent_at).toLocaleString()}</CBadge>
                  </CCol>
                </CRow>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default InvoiceDetail
