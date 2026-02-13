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
  CFormInput,
  CFormSelect,
  CSpinner,
  CBadge,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilDollar, cilCloudDownload } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { getAuthToken } from '../../../utils/cookies'
import toast from 'react-hot-toast'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3020/api'

const CreditTransactions = () => {
  const { adminProfile, rolePrefix } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const token = getAuthToken()
      const params = new URLSearchParams({ page: page.toString(), limit: pageSize.toString() })
      if (typeFilter !== 'all') params.append('transaction_type', typeFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)

      const response = await fetch(`${API_BASE}/credits/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (!response.ok) {
        if (response.status >= 500) {
          toast.error(data.error || 'Server error. Please try again later.')
        } else if (response.status === 401 || response.status === 403) {
          toast.error('You do not have permission to view this page.')
        }
        setTransactions([])
        setTotalCount(0)
        return
      }

      setTransactions(data.transactions || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
        toast.error('Network error. Please check your connection.')
      }
      setTransactions([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, dateFrom, dateTo, pageSize])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleExport = () => {
    // Export to CSV functionality
    const csv = [
      ['Date', 'User Email', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Description'].join(','),
      ...transactions.map((tx) =>
        [
          new Date(tx.created_at).toLocaleDateString(),
          tx.email || '',
          tx.transaction_type,
          tx.amount,
          tx.balance_before,
          tx.balance_after,
          tx.description || '',
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `credit-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getTypeBadge = (type) => {
    const badges = {
      purchase: <CBadge color="success">Purchase</CBadge>,
      usage: <CBadge color="info">Usage</CBadge>,
      refund: <CBadge color="warning">Refund</CBadge>,
      adjustment: <CBadge color="secondary">Adjustment</CBadge>,
      bonus: <CBadge color="primary">Bonus</CBadge>,
      subscription_credit: <CBadge color="info">Subscription</CBadge>,
    }
    return badges[type] || <CBadge>{type}</CBadge>
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      (tx.email && tx.email.toLowerCase().includes(search)) ||
      (tx.description && tx.description.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <CRow>
      <CCol>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Credit Transactions</strong>
            <CButton color="info" onClick={handleExport}>
              <CIcon icon={cilCloudDownload} className="me-2" />
              Export CSV
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol md={3}>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilSearch} />
                  </CInputGroupText>
                  <CFormInput
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={2}>
                <CFormSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="purchase">Purchase</option>
                  <option value="usage">Usage</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="bonus">Bonus</option>
                  <option value="subscription_credit">Subscription</option>
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="date"
                  placeholder="From Date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </CCol>
              <CCol md={2}>
                <CFormInput
                  type="date"
                  placeholder="To Date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </CCol>
            </CRow>

            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Date</CTableHeaderCell>
                  <CTableHeaderCell>User Email</CTableHeaderCell>
                  <CTableHeaderCell>Type</CTableHeaderCell>
                  <CTableHeaderCell>Amount</CTableHeaderCell>
                  <CTableHeaderCell>Balance Before</CTableHeaderCell>
                  <CTableHeaderCell>Balance After</CTableHeaderCell>
                  <CTableHeaderCell>Description</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {filteredTransactions.length === 0 ? (
                  <CTableRow>
                    <CTableDataCell colSpan={7} className="text-center">
                      No transactions found
                    </CTableDataCell>
                  </CTableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <CTableRow key={tx.id}>
                      <CTableDataCell>{new Date(tx.created_at).toLocaleString()}</CTableDataCell>
                      <CTableDataCell>{tx.email || 'N/A'}</CTableDataCell>
                      <CTableDataCell>{getTypeBadge(tx.transaction_type)}</CTableDataCell>
                      <CTableDataCell>
                        <strong className={tx.amount >= 0 ? 'text-success' : 'text-danger'}>
                          {tx.amount >= 0 ? '+' : ''}
                          {tx.amount.toFixed(2)}
                        </strong>
                      </CTableDataCell>
                      <CTableDataCell>{tx.balance_before.toFixed(2)}</CTableDataCell>
                      <CTableDataCell>
                        <strong>{tx.balance_after.toFixed(2)}</strong>
                      </CTableDataCell>
                      <CTableDataCell>{tx.description || '-'}</CTableDataCell>
                    </CTableRow>
                  ))
                )}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CreditTransactions
