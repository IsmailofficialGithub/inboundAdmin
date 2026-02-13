const express = require('express')
const router = express.Router()
const {
  getEmailTokens,
  getPhoneTokens,
  revokeToken,
} = require('../controllers/verificationTokensController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Get email tokens - Super Admin, Support
router.get('/email', authorize('super_admin', 'support'), getEmailTokens)

// Get phone tokens - Super Admin, Support
router.get('/phone', authorize('super_admin', 'support'), getPhoneTokens)

// Revoke token - Super Admin only
router.post('/:id/revoke', authorize('super_admin'), revokeToken)

module.exports = router
