const express = require('express')
const router = express.Router()
const {
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

// Update / assign — super_admin, ops
router.put('/:id', authorize('super_admin', 'ops'), updateInboundNumber)
router.patch('/:id/assign', authorize('super_admin', 'ops'), assignToAgent)

module.exports = router
