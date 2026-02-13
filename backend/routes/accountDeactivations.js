const express = require('express')
const router = express.Router()
const {
  getDeactivationRequests,
  getDeactivationRequest,
  approveDeactivation,
  rejectDeactivation,
} = require('../controllers/accountDeactivationController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Get all deactivation requests - Super Admin, Support
router.get('/', authorize('super_admin', 'support'), getDeactivationRequests)

// Get single request - Super Admin, Support
router.get('/:id', authorize('super_admin', 'support'), getDeactivationRequest)

// Approve deactivation - Super Admin only
router.post('/:id/approve', authorize('super_admin'), approveDeactivation)

// Reject deactivation - Super Admin only
router.post('/:id/reject', authorize('super_admin'), rejectDeactivation)

module.exports = router
