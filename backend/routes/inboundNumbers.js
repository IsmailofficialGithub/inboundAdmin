const express = require('express')
const router = express.Router()
const {
  verifyConnection,
  createInboundNumber,
  getInboundNumbers,
  getInboundNumberById,
  updateInboundNumber,
  assignToAgent,
} = require('../controllers/inboundNumbersController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// View — all admins
router.get('/', getInboundNumbers)
router.get('/:id', getInboundNumberById)

// Verify connection — super_admin, ops
router.post('/verify-connection', authorize('super_admin', 'ops'), verifyConnection)

// Create — super_admin, ops
router.post('/', authorize('super_admin', 'ops'), createInboundNumber)

// Update / assign — super_admin, ops
router.put('/:id', authorize('super_admin', 'ops'), updateInboundNumber)
router.patch('/:id/assign', authorize('super_admin', 'ops'), assignToAgent)

module.exports = router
