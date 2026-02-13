import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CForm,
  CFormLabel,
  CFormTextarea,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import {
  cilSearch,
  cilPlus,
  cilPencil,
  cilTrash,
  cilCloudDownload,
  cilEnvelopeOpen,
  cilInfo,
  cilDollar,
} from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { invoicesAPI, packagesAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const InvoicesList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)

  // Add style for table-responsive min-height
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .invoices-table-wrapper .table-responsive {
        min-height: 60vh;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Create invoice modal
  const [createModal, setCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [invoiceType, setInvoiceType] = useState('manual') // 'manual' or 'package'
  
  // Change status modal
  const [statusChangeModal, setStatusChangeModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusChangeLoading, setStatusChangeLoading] = useState(false)
  const [createForm, setCreateForm] = useState({
    user_email: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    package_id: '',
    subtotal: '',
    discount_amount: 0,
    discount_code: '',
    tax_rate: 0,
    currency: 'USD',
    items: [{ description: '', quantity: 1, unit_price: '', total: '' }],
    notes: '',
    status: 'draft',
  })

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchTerm) params.invoice_number = searchTerm
      const data = await invoicesAPI.list(params)
      setInvoices(data.invoices || [])
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, searchTerm, pageSize])

  useEffect(() => {
    fetchInvoices()
    fetchPackages()
  }, [fetchInvoices])

  const fetchPackages = async () => {
    try {
      const data = await packagesAPI.list()
      setPackages(data.packages || [])
    } catch (err) {
      console.error('Error fetching packages:', err)
    }
  }

  const handlePackageChange = (packageId) => {
    if (!packageId) {
      setInvoiceType('manual')
      setCreateForm((prev) => ({
        ...prev,
        package_id: '',
        subtotal: '',
        currency: 'USD',
        items: [{ description: '', quantity: 1, unit_price: '', total: '' }],
      }))
      return
    }

    const selectedPackage = packages.find((pkg) => pkg.id === packageId)
    if (!selectedPackage) return

    setInvoiceType('package')
    setCreateForm((prev) => ({
      ...prev,
      package_id: packageId,
      subtotal: selectedPackage.price_monthly || 0,
      currency: selectedPackage.currency || 'USD',
      items: [
        {
          description: `${selectedPackage.name} Package`,
          quantity: 1,
          unit_price: selectedPackage.price_monthly || 0,
          total: selectedPackage.price_monthly || 0,
        },
      ],
      notes: selectedPackage.description || '',
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    setSearchParams(params, { replace: true })
    fetchInvoices()
  }

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const invoiceData = {
        ...createForm,
        package_id: invoiceType === 'package' ? createForm.package_id : null,
      }

      // If package-based, let backend handle items and totals
      if (invoiceType === 'package') {
        await invoicesAPI.create(invoiceData)
      } else {
        // Manual invoice - calculate totals
        const items = createForm.items.map((item) => ({
          ...item,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0,
          total: (parseFloat(item.quantity) || 1) * (parseFloat(item.unit_price) || 0),
        }))
        const subtotal = items.reduce((sum, item) => sum + item.total, 0)
        const taxAmount = subtotal * (parseFloat(createForm.tax_rate) || 0)
        const total = subtotal - (parseFloat(createForm.discount_amount) || 0) + taxAmount

        await invoicesAPI.create({
          ...invoiceData,
          subtotal,
          items,
          total_amount: total,
          tax_amount: taxAmount,
        })
      }

      toast.success('Invoice created successfully!')
      setCreateModal(false)
      setInvoiceType('manual')
      setCreateForm({
        user_email: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        package_id: '',
        subtotal: '',
        discount_amount: 0,
        discount_code: '',
        tax_rate: 0,
        currency: 'USD',
        items: [{ description: '', quantity: 1, unit_price: '', total: '' }],
        notes: '',
        status: 'draft',
      })
      fetchInvoices()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDownload = async (id) => {
    try {
      await invoicesAPI.download(id)
      toast.success('Invoice downloaded!')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleSendEmail = async (id) => {
    try {
      await invoicesAPI.sendEmail(id)
      toast.success('Invoice email sent!')
      fetchInvoices()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) return
    try {
      await invoicesAPI.delete(id)
      toast.success('Invoice cancelled!')
      fetchInvoices()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleStatusChange = (invoice) => {
    setSelectedInvoice(invoice)
    setNewStatus(invoice.status)
    setStatusChangeModal(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedInvoice || !newStatus) return
    if (newStatus === selectedInvoice.status) {
      setStatusChangeModal(false)
      return
    }

    setStatusChangeLoading(true)
    try {
      await invoicesAPI.update(selectedInvoice.id, { status: newStatus })
      toast.success('Invoice status updated successfully!')
      setStatusChangeModal(false)
      setSelectedInvoice(null)
      setNewStatus('')
      fetchInvoices()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStatusChangeLoading(false)
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

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilDollar} className="me-2" />
                Invoices
              </strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small">{totalCount} invoices</span>
                {canEdit && (
                  <CButton color="primary" size="sm" onClick={() => setCreateModal(true)}>
                    <CIcon icon={cilPlus} className="me-2" />
                    Create Invoice
                  </CButton>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              {alert && (
                <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                  {alert.message}
                </CAlert>
              )}

              <CRow className="mb-3">
                <CCol md={4}>
                  <CInputGroup>
                    <CFormInput
                      placeholder="Search by invoice number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                    />
                    <CInputGroupText>
                      <CIcon icon={cilSearch} />
                    </CInputGroupText>
                  </CInputGroup>
                </CCol>
                <CCol md={3}>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      const params = new URLSearchParams(searchParams)
                      params.set('status', e.target.value)
                      setSearchParams(params, { replace: true })
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CButton color="primary" onClick={handleSearch}>
                    Search
                  </CButton>
                </CCol>
              </CRow>

              {loading ? (
                <div className="text-center py-5">
                  <CSpinner color="primary" />
                </div>
              ) : (
                <div className="invoices-table-wrapper">
                  <CTable hover responsive align="middle">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Invoice #</CTableHeaderCell>
                        <CTableHeaderCell>User</CTableHeaderCell>
                        <CTableHeaderCell>Date</CTableHeaderCell>
                        <CTableHeaderCell>Due Date</CTableHeaderCell>
                        <CTableHeaderCell>Amount</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Actions</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody >
                      {invoices.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={7} className="text-center text-body-secondary py-4">
                            No invoices found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        invoices.map((invoice) => (
                          <CTableRow key={invoice.id} >
                            <CTableDataCell>
                              <strong>{invoice.invoice_number}</strong>
                              {invoice.packages && (
                                <CBadge color="info" className="ms-2">
                                  {invoice.packages.name}
                                </CBadge>
                              )}
                            </CTableDataCell>
                            <CTableDataCell>
                              <span className="text-body-secondary small">{invoice.users?.email || '-'}</span>
                            </CTableDataCell>
                            <CTableDataCell>{new Date(invoice.invoice_date).toLocaleDateString()}</CTableDataCell>
                            <CTableDataCell>
                              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                            </CTableDataCell>
                            <CTableDataCell>
                              <strong>{formatCurrency(invoice.total_amount, invoice.currency)}</strong>
                            </CTableDataCell>
                            <CTableDataCell>{getStatusBadge(invoice.status)}</CTableDataCell>
                            <CTableDataCell>
                              <CDropdown>
                                <CDropdownToggle color="secondary" size="sm">
                                  Actions
                                </CDropdownToggle>
                                <CDropdownMenu>
                                  <CDropdownItem onClick={() => navigate(`/${rolePrefix}/billing/invoices/${invoice.id}`)}>
                                    <CIcon icon={cilInfo} className="me-2" />
                                    View
                                  </CDropdownItem>
                                  <CDropdownItem onClick={() => handleDownload(invoice.id)}>
                                    <CIcon icon={cilCloudDownload} className="me-2" />
                                    Download
                                  </CDropdownItem>
                                  <CDropdownItem onClick={() => handleSendEmail(invoice.id)}>
                                    <CIcon icon={cilEnvelopeOpen} className="me-2" />
                                    Send Email
                                  </CDropdownItem>
                                  {canEdit && (
                                    <>
                                      <CDropdownItem divider />
                                      <CDropdownItem onClick={() => handleStatusChange(invoice)}>
                                        <CIcon icon={cilPencil} className="me-2" />
                                        Change Status
                                      </CDropdownItem>
                                      <CDropdownItem
                                        onClick={() => handleDelete(invoice.id)}
                                        className="text-danger"
                                      >
                                        <CIcon icon={cilTrash} className="me-2" />
                                        Cancel Invoice
                                      </CDropdownItem>
                                    </>
                                  )}
                                </CDropdownMenu>
                              </CDropdown>
                            </CTableDataCell>
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>

                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                      </div>
                      <div>
                        <CButton
                          color="secondary"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams)
                            params.set('page', (currentPage - 1).toString())
                            setSearchParams(params, { replace: true })
                          }}
                        >
                          Previous
                        </CButton>
                        <span className="mx-2">
                          Page {currentPage} of {totalPages}
                        </span>
                        <CButton
                          color="secondary"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams)
                            params.set('page', (currentPage + 1).toString())
                            setSearchParams(params, { replace: true })
                          }}
                        >
                          Next
                        </CButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Create Invoice Modal */}
      <CModal visible={createModal} onClose={() => setCreateModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Create Invoice</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreateInvoice}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>User Email *</CFormLabel>
                <CFormInput
                  type="email"
                  value={createForm.user_email}
                  onChange={(e) => setCreateForm({ ...createForm, user_email: e.target.value })}
                  required
                  placeholder="Enter user email address"
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Invoice Date *</CFormLabel>
                <CFormInput
                  type="date"
                  value={createForm.invoice_date}
                  onChange={(e) => setCreateForm({ ...createForm, invoice_date: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Due Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={createForm.due_date}
                  min={(() => {
                    // Set minimum date to 24 hours from now
                    const tomorrow = new Date()
                    tomorrow.setDate(tomorrow.getDate() + 1)
                    return tomorrow.toISOString().split('T')[0]
                  })()}
                  onChange={(e) => {
                    const selectedDate = e.target.value
                    if (selectedDate) {
                      const selected = new Date(selectedDate)
                      const minDate = new Date()
                      minDate.setDate(minDate.getDate() + 1) // 24 hours from now
                      
                      if (selected < minDate) {
                        toast.error('Due date must be at least 24 hours from now')
                        return
                      }
                    }
                    setCreateForm({ ...createForm, due_date: selectedDate })
                  }}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol>
                <CFormLabel>Invoice Type</CFormLabel>
                <CFormSelect
                  value={invoiceType}
                  onChange={(e) => {
                    setInvoiceType(e.target.value)
                    if (e.target.value === 'manual') {
                      handlePackageChange('')
                    }
                  }}
                >
                  <option value="manual">Manual Invoice</option>
                  <option value="package">Package-Based Invoice</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {invoiceType === 'package' && (
              <CRow className="mb-3">
                <CCol>
                  <CFormLabel>Select Package *</CFormLabel>
                  <CFormSelect
                    value={createForm.package_id}
                    onChange={(e) => handlePackageChange(e.target.value)}
                    required={invoiceType === 'package'}
                  >
                    <option value="">-- Select a Package --</option>
                    {packages
                      .filter((pkg) => pkg.is_active)
                      .map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} - {pkg.currency} {pkg.price_monthly}/month ({pkg.credits_included} credits)
                        </option>
                      ))}
                  </CFormSelect>
                  {createForm.package_id && (
                    <div className="mt-2 p-3 bg-body-secondary rounded border">
                      {(() => {
                        const selectedPkg = packages.find((p) => p.id === createForm.package_id)
                        return selectedPkg ? (
                          <div>
                            <strong>{selectedPkg.name}</strong>
                            <div className="small text-body-secondary mt-1">
                              {selectedPkg.description}
                            </div>
                            <div className="small mt-1">
                              <strong>Price:</strong> {selectedPkg.currency} {selectedPkg.price_monthly}/month
                            </div>
                            <div className="small">
                              <strong>Credits:</strong> {selectedPkg.credits_included}
                            </div>
                            {selectedPkg.features && selectedPkg.features.length > 0 && (
                              <div className="small mt-2">
                                <strong>Features:</strong>
                                <ul className="mb-0 mt-1">
                                  {selectedPkg.features.map((feature, idx) => (
                                    <li key={idx}>{feature.rendered_text}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </CCol>
              </CRow>
            )}

            {invoiceType === 'manual' && (
              <>
                <h6 className="mb-3">Invoice Items</h6>
                {createForm.items.map((item, idx) => (
                  <CRow key={idx} className="mb-2">
                    <CCol md={5}>
                      <CFormInput
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => {
                          const items = [...createForm.items]
                          items[idx].description = e.target.value
                          setCreateForm({ ...createForm, items })
                        }}
                        required
                      />
                    </CCol>
                    <CCol md={2}>
                      <CFormInput
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...createForm.items]
                          items[idx].quantity = e.target.value
                          items[idx].total = items[idx].quantity * (items[idx].unit_price || 0)
                          setCreateForm({ ...createForm, items })
                        }}
                        required
                      />
                    </CCol>
                    <CCol md={2}>
                      <CFormInput
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => {
                          const items = [...createForm.items]
                          items[idx].unit_price = e.target.value
                          items[idx].total = items[idx].quantity * (items[idx].unit_price || 0)
                          setCreateForm({ ...createForm, items })
                        }}
                        required
                      />
                    </CCol>
                    <CCol md={2}>
                      <CFormInput value={item.total || 0} disabled />
                    </CCol>
                    <CCol md={1}>
                      {createForm.items.length > 1 && (
                        <CButton
                          color="danger"
                          size="sm"
                          onClick={() => {
                            const items = createForm.items.filter((_, i) => i !== idx)
                            setCreateForm({ ...createForm, items })
                          }}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      )}
                    </CCol>
                  </CRow>
                ))}
                <CButton
                  color="secondary"
                  size="sm"
                  onClick={() =>
                    setCreateForm({
                      ...createForm,
                      items: [...createForm.items, { description: '', quantity: 1, unit_price: '', total: '' }],
                    })
                  }
                >
                  + Add Item
                </CButton>
              </>
            )}

            <CRow className="mt-3">
              <CCol md={4}>
                <CFormLabel>Discount Amount</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={createForm.discount_amount}
                  onChange={(e) => setCreateForm({ ...createForm, discount_amount: e.target.value })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tax Rate (%)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={createForm.tax_rate * 100}
                  onChange={(e) => setCreateForm({ ...createForm, tax_rate: parseFloat(e.target.value) / 100 || 0 })}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Currency</CFormLabel>
                <CFormInput
                  value={createForm.currency}
                  onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </CCol>
            </CRow>

            <CFormLabel className="mt-3">Notes</CFormLabel>
            <CFormTextarea
              rows={3}
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" disabled={createLoading}>
              {createLoading ? <CSpinner size="sm" className="me-2" /> : null}
              Create Invoice
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Change Status Modal */}
      <CModal visible={statusChangeModal} onClose={() => setStatusChangeModal(false)}>
        <CModalHeader>
          <CModalTitle>Change Invoice Status</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedInvoice && (
            <>
              <div className="mb-3">
                <strong>Invoice:</strong> {selectedInvoice.invoice_number}
              </div>
              <div className="mb-3">
                <strong>Current Status:</strong> {getStatusBadge(selectedInvoice.status)}
              </div>
              <CFormLabel>New Status</CFormLabel>
              <CFormSelect value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </CFormSelect>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setStatusChangeModal(false)}>
            Cancel
          </CButton>
          <CButton
            color="primary"
            onClick={handleUpdateStatus}
            disabled={statusChangeLoading || !newStatus || (selectedInvoice && newStatus === selectedInvoice.status)}
          >
            {statusChangeLoading ? <CSpinner size="sm" className="me-2" /> : null}
            Update Status
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default InvoicesList
