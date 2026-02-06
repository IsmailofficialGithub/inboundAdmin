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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTag, cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import { useAuth } from '../../../contexts/AuthContext'
import { couponsAPI } from '../../../utils/api'
import toast from 'react-hot-toast'

const CouponsList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { adminProfile } = useAuth()
  const canEdit = ['super_admin', 'finance'].includes(adminProfile?.role)

  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(searchParams.get('active') || 'all')
  const [totalCount, setTotalCount] = useState(0)
  const currentPage = parseInt(searchParams.get('page') || '1')
  const page = currentPage - 1
  const pageSize = 50
  const totalPages = Math.ceil(totalCount / pageSize)
  const [alert, setAlert] = useState(null)

  // Create/Edit modal
  const [editModal, setEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    id: '',
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    minimum_purchase_amount: '',
    maximum_discount_amount: '',
    currency: 'USD',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    usage_limit: '',
    per_user_limit: 1,
    is_active: true,
    applicable_to: 'all',
  })

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: pageSize }
      if (statusFilter === 'active') params.is_active = true
      else if (statusFilter === 'inactive') params.is_active = false
      const data = await couponsAPI.list(params)
      setCoupons(data.coupons || [])
      setTotalCount(data.pagination?.total || 0)
    } catch (err) {
      setAlert({ color: 'danger', message: err.message })
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, pageSize])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const openEditModal = (coupon = null) => {
    if (coupon) {
      setEditForm({
        id: coupon.id,
        code: coupon.code,
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        minimum_purchase_amount: coupon.minimum_purchase_amount || '',
        maximum_discount_amount: coupon.maximum_discount_amount || '',
        currency: coupon.currency || 'USD',
        valid_from: coupon.valid_from ? new Date(coupon.valid_from).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : '',
        usage_limit: coupon.usage_limit || '',
        per_user_limit: coupon.per_user_limit || 1,
        is_active: coupon.is_active,
        applicable_to: coupon.applicable_to || 'all',
      })
    } else {
      setEditForm({
        id: '',
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        minimum_purchase_amount: '',
        maximum_discount_amount: '',
        currency: 'USD',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: '',
        usage_limit: '',
        per_user_limit: 1,
        is_active: true,
        applicable_to: 'all',
      })
    }
    setEditModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      if (editForm.id) {
        const { id, ...data } = editForm
        await couponsAPI.update(id, data)
        toast.success('Coupon updated!')
      } else {
        await couponsAPI.create(editForm)
        toast.success('Coupon created!')
      }
      setEditModal(false)
      fetchCoupons()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this coupon?')) return
    try {
      await couponsAPI.delete(id)
      toast.success('Coupon deactivated!')
      fetchCoupons()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const formatDiscount = (coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`
    }
    return `${coupon.currency} ${coupon.discount_value}`
  }

  return (
    <>
      <CRow>
        <CCol>
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>
                <CIcon icon={cilTag} className="me-2" />
                Coupon Codes
              </strong>
              <div className="d-flex align-items-center gap-2">
                <span className="text-body-secondary small">{totalCount} coupons</span>
                {canEdit && (
                  <CButton color="primary" size="sm" onClick={() => openEditModal()}>
                    <CIcon icon={cilPlus} className="me-2" />
                    Create Coupon
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
                <CCol md={3}>
                  <CFormSelect
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      const params = new URLSearchParams(searchParams)
                      params.set('active', e.target.value)
                      setSearchParams(params, { replace: true })
                    }}
                  >
                    <option value="all">All Coupons</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
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
                        <CTableHeaderCell>Code</CTableHeaderCell>
                        <CTableHeaderCell>Description</CTableHeaderCell>
                        <CTableHeaderCell>Discount</CTableHeaderCell>
                        <CTableHeaderCell>Usage</CTableHeaderCell>
                        <CTableHeaderCell>Valid Until</CTableHeaderCell>
                        <CTableHeaderCell>Status</CTableHeaderCell>
                        {canEdit && <CTableHeaderCell>Actions</CTableHeaderCell>}
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {coupons.length === 0 ? (
                        <CTableRow>
                          <CTableDataCell colSpan={canEdit ? 7 : 6} className="text-center text-body-secondary py-4">
                            No coupons found
                          </CTableDataCell>
                        </CTableRow>
                      ) : (
                        coupons.map((coupon) => (
                          <CTableRow key={coupon.id}>
                            <CTableDataCell>
                              <strong>{coupon.code}</strong>
                            </CTableDataCell>
                            <CTableDataCell>{coupon.description || '-'}</CTableDataCell>
                            <CTableDataCell>{formatDiscount(coupon)}</CTableDataCell>
                            <CTableDataCell>
                              {coupon.usage_count || 0} / {coupon.usage_limit || '∞'}
                            </CTableDataCell>
                            <CTableDataCell>
                              {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : 'No expiry'}
                            </CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={coupon.is_active ? 'success' : 'secondary'}>
                                {coupon.is_active ? 'Active' : 'Inactive'}
                              </CBadge>
                            </CTableDataCell>
                            {canEdit && (
                              <CTableDataCell>
                                <CButton
                                  color="primary"
                                  size="sm"
                                  variant="outline"
                                  className="me-2"
                                  onClick={() => openEditModal(coupon)}
                                >
                                  <CIcon icon={cilPencil} />
                                </CButton>
                                <CButton
                                  color="danger"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(coupon.id)}
                                >
                                  <CIcon icon={cilTrash} />
                                </CButton>
                              </CTableDataCell>
                            )}
                          </CTableRow>
                        ))
                      )}
                    </CTableBody>
                  </CTable>
                </>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Create/Edit Modal */}
      <CModal visible={editModal} onClose={() => setEditModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{editForm.id ? 'Edit Coupon' : 'Create Coupon'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Coupon Code *</CFormLabel>
                <CFormInput
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  required
                  disabled={!!editForm.id}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Discount Type *</CFormLabel>
                <CFormSelect
                  value={editForm.discount_type}
                  onChange={(e) => setEditForm({ ...editForm, discount_type: e.target.value })}
                  required
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </CFormSelect>
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Discount Value *</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={editForm.discount_value}
                  onChange={(e) => setEditForm({ ...editForm, discount_value: e.target.value })}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Currency</CFormLabel>
                <CFormInput
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Minimum Purchase Amount</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={editForm.minimum_purchase_amount}
                  onChange={(e) => setEditForm({ ...editForm, minimum_purchase_amount: e.target.value })}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Maximum Discount (for %)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  value={editForm.maximum_discount_amount}
                  onChange={(e) => setEditForm({ ...editForm, maximum_discount_amount: e.target.value })}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Valid From</CFormLabel>
                <CFormInput
                  type="date"
                  value={editForm.valid_from}
                  onChange={(e) => setEditForm({ ...editForm, valid_from: e.target.value })}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Valid Until</CFormLabel>
                <CFormInput
                  type="date"
                  value={editForm.valid_until}
                  onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormLabel>Usage Limit</CFormLabel>
                <CFormInput
                  type="number"
                  value={editForm.usage_limit}
                  onChange={(e) => setEditForm({ ...editForm, usage_limit: e.target.value })}
                  placeholder="Leave empty for unlimited"
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Per User Limit</CFormLabel>
                <CFormInput
                  type="number"
                  value={editForm.per_user_limit}
                  onChange={(e) => setEditForm({ ...editForm, per_user_limit: parseInt(e.target.value) || 1 })}
                />
              </CCol>
            </CRow>

            <CFormLabel>Description</CFormLabel>
            <CFormTextarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setEditModal(false)}>
              Cancel
            </CButton>
            <CButton type="submit" color="primary" disabled={editLoading}>
              {editLoading ? <CSpinner size="sm" className="me-2" /> : null}
              {editForm.id ? 'Update' : 'Create'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </>
  )
}

export default CouponsList
