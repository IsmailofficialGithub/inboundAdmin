const express = require('express')
const router = express.Router()
const { getUserEmails, verifyEmail } = require('../controllers/userEmailsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Get all user emails - Super Admin, Support
router.get('/', authorize('super_admin', 'support'), getUserEmails)

// Verify email - Super Admin only
router.post('/:id/verify', authorize('super_admin'), verifyEmail)

module.exports = router
