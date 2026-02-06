import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton, CCard, CCardBody, CCardHeader, CCol, CRow,
  CTable, CTableBody, CTableDataCell, CTableHead, CTableHeaderCell, CTableRow,
  CFormSelect, CSpinner, CBadge, CAlert,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormLabel, CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCreditCard, cilPencil } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { subscriptionsAPI } from '../../../utils/api'

const SubscriptionsList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile, rolePrefix } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)

  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', status: '', auto_renew: true, cancel_at_period_end: false })

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter !== 'all') params.status = statusFilter
      const data = await subscriptionsAPI.list(params)
      setSubscriptions(data.subscriptions || [])
      setTotalCount(data.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  const updateURL = useCallback((newPage, newStatus) => {
    const params = new URLSearchParams()
    if (newPage > 1) params.set('page', newPage.toString())
    if (newStatus && newStatus !== 'all') params.set('status', newStatus)
    setSearchParams(params, { replace: true })
  }, [setSearchParams])

  useEffect(() => { fetchSubscriptions() }, [fetchSubscriptions])

  const openEditModal = (sub) => {
    setEditForm({
      id: sub.id,
      status: sub.status,
      auto_renew: sub.auto_renew,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
    setEditModal(true)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      const { id, ...data } = editForm
      await subscriptionsAPI.update(id, data)
      setAlert({ color: 'success', message: 'Subscription updated successfully!' })
      setEditModal(false)
      fetchSubscriptions()
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setEditLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const map = { active: 'success', canceled: 'danger', expired: 'secondary', suspended: 'warning', pending: 'info' }
    return <CBadge color={map[status] || 'secondary'}>{status}</CBadge>
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong><CIcon icon={cilCreditCard} className="me-2" />Subscriptions</strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small">{totalCount} subscriptions</span>
                <CButton color="secondary" size="sm" onClick={() => navigate(`/${rolePrefix}/packages`)}>
                  Manage Packages
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {alert && <CAlert color={alert.color} dismissible onClose={() => setAlert(null)}>{alert.message}</CAlert>}

              <CRow className="mb-3">
                <CCol md={3}>
                  <CFormSelect value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); updateURL(1, e.target.value) }}>
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="canceled">Canceled</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </CFormSelect>
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
                        <CTableHeaderCell>Package</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        <CTableHeaderCell>Billing</CTableHeaderCell>
                        <CTableHeaderCell>Auto Renew</CTableHeaderCell>
                        <CTableHeaderCell>Period</CTableHeaderCell>
                        <CTableHeaderCell>Next Billing</CTableHeaderCell>
                        {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {subscriptions.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canEdit ? 8 : 7} className="text-center text-body-secondary py-4">
                            No subscriptions found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        subscriptions.map((sub) => (
                          <CTableRow key={sub.id}>
                            <CTableDataCell><span className="text-body-secondary small">{sub.email || '-'}</span></CTableDataCell>
                            <CTableDataCell>
                              <div className="fw-semibold">{sub.subscription_packages?.package_name || '-'}</div>
                              <div className="text-body-secondary small">
                                ${sub.subscription_packages?.monthly_price || '0'}/mo
                              </div>
                            </CTableDataCell>
                            <CTableDataCell>{getStatusBadge(sub.status)}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color="dark">{sub.billing_cycle}</CBadge>
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={sub.auto_renew ? 'success' : 'secondary'}>
                                {sub.auto_renew ? 'Yes' : 'No'}
                              </CBadge>
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : '-'}
                              {' - '}
                              {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '-'}
                            </CTableDataCell>
                            <CTableDataCell className="small">
                              {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : '-'}
                            </CTableDataCell>
                            {canEdit && (
                              <CTableDataCell>
                                <CButton color="info" size="sm" variant="ghost" onClick={() => openEditModal(sub)}>
                                  <CIcon icon={cilPencil} size="sm" />
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
                          disabled={page === 0} onClick={() => updateURL(page, statusFilter)}>Previous</CButton>
                        <CButton color="primary" variant="outline" size="sm"
                          disabled={page >= totalPages - 1} onClick={() => updateURL(page + 2, statusFilter)}>Next</CButton>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Edit Subscription Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)} backdrop="static">
        <CModalHeader><CModalTitle>Update Subscription</CModalTitle></CModalHeader>
        <CForm onSubmit={handleUpdate}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Status</CFormLabel>
              <CFormSelect value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="canceled">Canceled</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </CFormSelect>
            </div>
            <div className="mb-3">
              <CFormCheck id="autoRenew" label="Auto Renew" checked={editForm.auto_renew}
                onChange={(e) => setEditForm({ ...editForm, auto_renew: e.target.checked })} />
            </div>
            <div className="mb-3">
              <CFormCheck id="cancelAtEnd" label="Cancel at Period End" checked={editForm.cancel_at_period_end}
                onChange={(e) => setEditForm({ ...editForm, cancel_at_period_end: e.target.checked })} />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>Cancel</CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? <><CSpinner size="sm" className="me-1" /> Saving...</> : 'Save Changes'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default SubscriptionsList
