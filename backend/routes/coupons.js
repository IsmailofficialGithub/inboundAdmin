const express = require('express')
const router = express.Router()
const {
  listCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
} = require('../controllers/couponController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Coupon codes
router.get('/', authorize('super_admin', 'finance', 'support'), listCoupons)
router.get('/:id', authorize('super_admin', 'finance', 'support'), getCoupon)
router.get('/:id/usage', authorize('super_admin', 'finance', 'support'), getCouponUsage)
router.post('/', authorize('super_admin', 'finance'), createCoupon)
router.put('/:id', authorize('super_admin', 'finance'), updateCoupon)
router.delete('/:id', authorize('super_admin', 'finance'), deleteCoupon)

module.exports = router
