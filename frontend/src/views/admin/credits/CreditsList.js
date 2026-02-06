import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormInput, CSpinner, CBadge, CAlert,
  CInputGroup, CInputGroupText,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormSelect, CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilDollar, cilPlus } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { creditsAPI } from '../../../utils/api'

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
    user_id: '', amount: '', transaction_type: 'adjustment', description: '',
  })

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

  const openAdjustModal = (userId) => {
    setAdjustForm({ user_id: userId || '', amount: '', transaction_type: 'adjustment', description: '' })
    setAdjustModal(true)
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
                                  onClick={() => openAdjustModal(c.user_id)}>
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
            <div className="mb-3">
              <CFormLabel>User ID <span className="text-danger">*</span></CFormLabel>
              <CFormInput value={adjustForm.user_id}
                onChange={(e) => setAdjustForm({ ...adjustForm, user_id: e.target.value })}
                placeholder="UUID of the user" required />
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
            <CButton color="secondary" onClick={() => setAdjustModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={adjustLoading}>
              {adjustLoading ? <><CSpinner size="sm" className="me-1" /> Processing...</> : 'Apply Adjustment'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default CreditsList
