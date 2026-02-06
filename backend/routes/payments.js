const express = require('express')
const router = express.Router()
const { listPayments, getPayment, createPayment, updatePayment } = require('../controllers/paymentHistoryController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Payment history
router.get('/', authorize('super_admin', 'finance', 'support'), listPayments)
router.get('/:id', authorize('super_admin', 'finance', 'support'), getPayment)
router.post('/', authorize('super_admin', 'finance'), createPayment)
router.put('/:id', authorize('super_admin', 'finance'), updatePayment)

module.exports = router
