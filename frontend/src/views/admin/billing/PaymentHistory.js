import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  CFormSelect,
  CSpinner,
  CBadge,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCreditCard, cilDollar } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { paymentsAPI } from '../../../utils/api'

const PaymentHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await paymentsAPI.list(params)
      setPayments(data.payments || [])
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const getStatusBadge = (status) => {
    const map = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'danger',
      cancelled: 'secondary',
      refunded: 'secondary',
    }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>
              <CIcon icon={cilCreditCard} className="me-2" />
              Payment History
            </strong>
            <span className="text-body-secondary small">{totalCount} payments</span>
          </CCardHeader>
          <CCardBody>
            {alert && (
              <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>
                {alert.message}
              </CAlert>
            )}

            <CRow className="mb-3">
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
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {loading ? (
              <div className="text-center py-5">
                <CSpinner color="primary" />
              </div>
            ) : (
              <>
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                      <CTableHeaderCell>User</CTableHeaderCell>
                      <CTableHeaderCell>Invoice</CTableHeaderCell>
                      <CTableHeaderCell>Method</CTableHeaderCell>
                      <CTableHeaderCell>Amount</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Provider</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {payments.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center text-body-secondary py-4">
                          No payments found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      payments.map((payment) => (
                        <CTableRow key={payment.id}>
                          <CTableDataCell>
                            {payment.payment_date
                              ? new Date(payment.payment_date).toLocaleDateString()
                              : new Date(payment.created_at).toLocaleDateString()}
                          </CTableDataCell>
                          <CTableDataCell>
                            <span className="text-body-secondary small">{payment.users?.email || '-'}</span>
                          </CTableDataCell>
                          <CTableDataCell>
                            {payment.invoices?.invoice_number || '-'}
                          </CTableDataCell>
                          <CTableDataCell>{payment.payment_method}</CTableDataCell>
                          <CTableDataCell>
                            <strong>{formatCurrency(payment.amount, payment.currency)}</strong>
                          </CTableDataCell>
                          <CTableDataCell>{getStatusBadge(payment.status)}</CTableDataCell>
                          <CTableDataCell>
                            <span className="text-body-secondary small">{payment.payment_provider || '-'}</span>
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
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default PaymentHistory
