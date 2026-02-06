import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CSpinner, CBadge, CAlert,
  CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormSelect, CFormTextarea,
  CListGroup, CListGroupItem,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilDollar, cilPlus } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { creditsAPI, usersAPI } from '../../../utils/api'

const CreditsList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canAdjust = ['super_admin', 'finance'].includes(adminProfile?.role)

  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState(false)
  const [adjustLoading, setAdjustLoading] = useState(false)
  const [adjustForm, setAdjustForm] = useState({
    user_id: '', user_email: '', amount: '', transaction_type: 'adjustment', description: '',
  })
  
  // User search for modal
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState([])
  const [userSearchLoading, setUserSearchLoading] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const searchTimeoutRef = useRef(null)

  const fetchCredits = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (searchTerm) params.search = searchTerm
      const data = await creditsAPI.list(params)
      setCredits(data.credits || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, searchTerm, pageSize])

  const updateURL = useCallback((newPage, newSearch) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newSearch) params.set('search', newSearch)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchCredits() }, [fetchCredits])

  // Debounced user search
  const searchUsers = useCallback(async (query) => {
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }

    setUserSearchLoading(true)
    try {
      const data = await usersAPI.list({ 
        search: query, 
        limit: 10,
        page: 0 
      })
      // Filter to only show consumers
      const consumers = (data.users || []).filter(user => user.role === 'consumer')
      setUserSearchResults(consumers)
    } catch (err) {
      console.error('User search error:', err)
      setUserSearchResults([])
    } finally {
      setUserSearchLoading(false)
    }
  }, [])

  // Handle user search input with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (userSearchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(userSearchQuery)
      }, 300) // 300ms debounce
    } else {
      setUserSearchResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [userSearchQuery, searchUsers])

  const openAdjustModal = (userId, userEmail) => {
    setAdjustForm({ 
      user_id: userId || '', 
      user_email: userEmail || '', 
      amount: '', 
      transaction_type: 'adjustment', 
      description: '' 
    })
    setUserSearchQuery('')
    setUserSearchResults([])
    setShowUserSearch(!userId) // Show search if no user_id provided
    setAdjustModal(true)
  }

  const selectUser = (user) => {
    setAdjustForm({
      ...adjustForm,
      user_id: user.id,
      user_email: user.email || '',
    })
    setUserSearchQuery('')
    setUserSearchResults([])
    setShowUserSearch(false)
  }

  const handleAdjust = async (e) => {
    e.preventDefault()
    setAdjustLoading(true)
    try {
      const result = await creditsAPI.adjust({
        user_id: adjustForm.user_id,
        amount: parseFloat(adjustForm.amount),
        transaction_type: adjustForm.transaction_type,
        description: adjustForm.description,
      })
      setAlert({ color: 'success', message: result.message })
      setAdjustModal(false)
      fetchCredits()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setAdjustLoading(false)
    }
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong><CIcon icon={cilDollar} className="me-2" />User Credits</strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small">{totalCount} records</span>
                {canAdjust && (
                  <CButton color="primary" size="sm" onClick={() => openAdjustModal('')}>
                    <CIcon icon={cilPlus} className="me-1" /> Adjust Credits
                  </CButton>
                )}
              </div>
            </CCardHeader>
            <CCardBody>
              {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

              <CRow className="mb-3">
                <CCol md={5}>
                  <CInputGroup>
                    <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                    <CFormInput
                      placeholder="Search by email or name..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); updateURL(1, e.target.value) }}
                    />
                  </CInputGroup>
                </CCol>
              </CRow>

              {loading ? (
                <div className="text-center py-5"><CSpinner color="primary" /></div>
              ) : (
                <>
                  <CTable hover responsive align="middle">
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>User</CTableHeaderCell>
                        <CTableHeaderCell>Balance</CTableHeaderCell>
                        <CTableHeaderCell>Total Purchased</CTableHeaderCell>
                        <CTableHeaderCell>Total Used</CTableHeaderCell>
                        <CTableHeaderCell>Auto Top-up</CTableHeaderCell>
                        <CTableHeaderCell>Services Paused</CTableHeaderCell>
                        <CTableHeaderCell>Last Top-up</CTableHeaderCell>
                        {canAdjust && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {credits.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canAdjust ? 8 : 7} className="text-center text-body-secondary py-4">
                            No credit records found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        credits.map((c) => (
                          <CTableRow key={c.id}>
                            <CTableDataCell>
                              <div className="small fw-semibold">{c.email || '-'}</div>
                              <div className="text-body-secondary small">{[c.first_name, c.last_name].filter(Boolean).join(' ') || ''}</div>
                            </CTableDataCell>
                            <CTableDataCell>
                              <span className={`fw-bold ${parseFloat(c.balance) <= parseFloat(c.low_credit_threshold || 10) ? 'text-danger' : 'text-success'}`}>
                                ${Number(c.balance).toFixed(2)}
                              </span>
                            </CTableDataCell>
                            <CTableDataCell>${Number(c.total_purchased).toFixed(2)}</CTableDataCell>
                            <CTableDataCell>${Number(c.total_used).toFixed(2)}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={c.auto_topup_enabled ? 'success' : 'secondary'}>
                                {c.auto_topup_enabled ? `Yes ($${c.auto_topup_amount})` : 'No'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={c.services_paused ? 'danger' : 'success'}>
                                {c.services_paused ? 'Paused' : 'Active'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {c.last_topup_at ? new Date(c.last_topup_at).toLocaleDateString() : '-'}
                            </CTableDataCell>
                            {canAdjust && (
                              <CTableDataCell>
                                <CButton color="primary" size="sm" variant="ghost"
                                  onClick={() => openAdjustModal(c.user_id, c.email)}>
                                  Adjust
                                </CButton>
                                <CButton color="info" size="sm" variant="ghost"
                                  onClick={() => navigate(`/${rolePrefix}/transactions?user_id=${c.user_id}`)}>
                                  History
                                </CButton>
                              </CTableDataCell>
                            )}
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
                          disabled={page === 0} onClick={() => updateURL(page, searchTerm)}>Previous</CButton>
                        <CButton color="primary" variant="outline" size="sm"
                          disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, searchTerm)}>Next</CButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Adjust Credits Modal */}
      <CModal visible={adjustModal} onClose={() => setAdjustModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Adjust Credits</CModalTitle></CModalHeader>
        <CForm onSubmit={handleAdjust}>
          <CModalBody>
            {showUserSearch && !adjustForm.user_id && (
              <div className="mb-3">
                <CFormLabel>Search User <span className="text-danger">*</span></CFormLabel>
                <CInputGroup>
                  <CInputGroupText><CIcon icon={cilSearch} /></CInputGroupText>
                  <CFormInput
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by email, name, or phone (min 2 characters)..."
                    autoFocus
                  />
                </CInputGroup>
                {userSearchQuery.length > 0 && userSearchQuery.length < 2 && (
                  <div className="form-text text-warning">
                    Please enter at least 2 characters to search.
                  </div>
                )}
                {userSearchLoading && (
                  <div className="mt-2">
                    <CSpinner size="sm" className="me-2" />
                    <span className="text-body-secondary small">Searching...</span>
                  </div>
                )}
                {userSearchResults.length > 0 && (
                  <div className="mt-2">
                    <CListGroup>
                      {userSearchResults.map((user) => (
                        <CListGroupItem
                          key={user.id}
                          action
                          onClick={() => selectUser(user)}
                          style={{ cursor: 'pointer' }}
                          className="d-flex justify-content-between align-items-start"
                        >
                          <div className="ms-2 me-auto">
                            <div className="fw-bold">{user.email || 'No email'}</div>
                            <div className="text-body-secondary small">
                              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'No name'}
                              {user.phone && ` • ${user.phone}`}
                            </div>
                          </div>
                        </CListGroupItem>
                      ))}
                    </CListGroup>
                  </div>
                )}
                {userSearchQuery.length >= 2 && !userSearchLoading && userSearchResults.length === 0 && (
                  <div className="form-text text-body-secondary mt-2">
                    No consumers found matching your search.
                  </div>
                )}
              </div>
            )}
            <div className="mb-3">
              <CFormLabel>User ID <span className="text-danger">*</span></CFormLabel>
              <CFormInput 
                value={adjustForm.user_id}
                disabled
                readOnly
                placeholder="UUID of the user" 
                required 
              />
              {!adjustForm.user_id && !showUserSearch && (
                <div className="form-text text-warning">
                  Please search and select a user above.
                </div>
              )}
            </div>
            <div className="mb-3">
              <CFormLabel>Email</CFormLabel>
              <CFormInput 
                type="email"
                value={adjustForm.user_email || ''}
                disabled
                readOnly
                placeholder="User email" 
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Amount <span className="text-danger">*</span></CFormLabel>
              <CFormInput type="number" step="0.01" value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                placeholder="Positive to add, negative to subtract" required />
              <div className="form-text">Use positive values to add credits, negative to deduct.</div>
            </div>
            <div className="mb-3">
              <CFormLabel>Type</CFormLabel>
              <CFormSelect value={adjustForm.transaction_type}
                onChange={(e) => setAdjustForm({ ...adjustForm, transaction_type: e.target.value })}>
                <option value="adjustment">Adjustment</option>
                <option value="bonus">Bonus</option>
                <option value="refund">Refund</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormLabel>Description</CFormLabel>
              <CFormTextarea rows={2} value={adjustForm.description}
                onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                placeholder="Reason for adjustment..." />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => {
              setAdjustModal(false)
              setUserSearchQuery('')
              setUserSearchResults([])
              setShowUserSearch(false)
            }}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={adjustLoading || !adjustForm.user_id}>
              {adjustLoading ? <><CSpinner size="sm" className="me-1" /> Processing...</> : 'Apply Adjustment'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default CreditsList
