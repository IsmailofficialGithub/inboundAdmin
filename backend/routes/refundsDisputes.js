const express = require('express')
const router = express.Router()
const {
  listRefundsDisputes,
  getRefundDispute,
  createRefundDispute,
  updateRefundDispute,
} = require('../controllers/refundDisputeController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Refunds and disputes
router.get('/', authorize('super_admin', 'finance', 'support'), listRefundsDisputes)
router.get('/:id', authorize('super_admin', 'finance', 'support'), getRefundDispute)
router.post('/', authorize('super_admin', 'finance', 'support'), createRefundDispute)
router.put('/:id', authorize('super_admin', 'finance'), updateRefundDispute)

module.exports = router
