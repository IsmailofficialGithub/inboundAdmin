import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CFormSelect, CSpinner, CBadge, CAlert, CButton,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHistory } from '@coreui/icons'
import { creditsAPI } from '../../../utils/api'

const TransactionsList = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [userId] = useState(searchParams.get('user_id') || '')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (typeFilter !== 'all') params.transaction_type = typeFilter
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (userId) params.user_id = userId

      const data = await creditsAPI.getTransactions(params)
      setTransactions(data.transactions || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, dateFrom, dateTo, userId, pageSize])

  const updateURL = useCallback((newPage, newType, newFrom, newTo) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newType && newType !== 'all') params.set('type', newType)
    if (newFrom) params.set('from', newFrom)
    if (newTo) params.set('to', newTo)
    if (userId) params.set('user_id', userId)
    setSearchParams(params, { replace: true })
  }, [setSearchParams, userId])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const getTypeBadge = (type) => {
    const map = {
      purchase: 'primary', usage: 'warning', refund: 'info',
      adjustment: 'secondary', bonus: 'success', subscription_credit: 'dark',
    }
    return <CBadge color={map[type] || 'secondary'}>{type}</CBadge>
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong><CIcon icon={cilHistory} className="me-2" />Credit Transactions</strong>
            <span className="text-body-secondary small">{totalCount} total transactions</span>
          </CCardHeader>
          <CCardBody>
            {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

            <CRow className="mb-3">
              <CCol md={3}>
                <CFormSelect value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); updateURL(1, e.target.value, dateFrom, dateTo) }}>
                  <option value="all">All Types</option>
                  <option value="purchase">Purchase</option>
                  <option value="usage">Usage</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="bonus">Bonus</option>
                  <option value="subscription_credit">Subscription Credit</option>
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormInput type="date" value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); updateURL(1, typeFilter, e.target.value, dateTo) }} />
              </CCol>
              <CCol md={2}>
                <CFormInput type="date" value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); updateURL(1, typeFilter, dateFrom, e.target.value) }} />
              </CCol>
              {userId && (
                <CCol md={3}>
                  <CBadge color="info" className="p-2">Filtering by user: {userId.substring(0, 8)}...</CBadge>
                </CCol>
              )}
            </CRow>

            {loading ? (
              <div className="text-center py-5"><CSpinner color="primary" /></div>
            ) : (
              <>
                <CTable hover responsive align="middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>User</CTableHeaderCell>
                      <CTableHeaderCell>Type</CTableHeaderCell>
                      <CTableHeaderCell>Amount</CTableHeaderCell>
                      <CTableHeaderCell>Before</CTableHeaderCell>
                      <CTableHeaderCell>After</CTableHeaderCell>
                      <CTableHeaderCell>Description</CTableHeaderCell>
                      <CTableHeaderCell>Date</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {transactions.length === 0 ? (
                      <CTableRow>
                        <CTableDataCell colSpan={7} className="text-center text-body-secondary py-4">
                          No transactions found
                        </CTableDataCell>
                      </CTableRow>
                    ) : (
                      transactions.map((tx) => (
                        <CTableRow key={tx.id}>
                          <CTableDataCell><span className="text-body-secondary small">{tx.email || tx.user_id.substring(0, 8) + '...'}</span></CTableDataCell>
                          <CTableDataCell>{getTypeBadge(tx.transaction_type)}</CTableDataCell>
                          <CTableDataCell>
                            <span className={parseFloat(tx.amount) >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                              {parseFloat(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                            </span>
                          </CTableDataCell>
                          <CTableDataCell>${Number(tx.balance_before).toFixed(2)}</CTableDataCell>
                          <CTableDataCell>${Number(tx.balance_after).toFixed(2)}</CTableDataCell>
                          <CTableDataCell className="small">{tx.description || '-'}</CTableDataCell>
                          <CTableDataCell className="small">{new Date(tx.created_at).toLocaleString()}</CTableDataCell>
                        </CTableRow>
                      ))
                    )}
                  </CTableBody>
                </CTable>

                {totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="text-body-secondary small">Page {page + 1} of {totalPages}</span>
                    <div>
                      <CButton color="primary" variant="outline" size="sm" className="me-2"
                        disabled={page === 0} onClick={() => updateURL(page, typeFilter, dateFrom, dateTo)}>Previous</CButton>
                      <CButton color="primary" variant="outline" size="sm"
                        disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, typeFilter, dateFrom, dateTo)}>Next</CButton>
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

export default TransactionsList
