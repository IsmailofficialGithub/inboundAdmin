const express = require('express')
const router = express.Router()
const { getUsersWith2FA, disable2FA } = require('../controllers/twoFactorController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Get users with 2FA - Super Admin, Support
router.get('/users', authorize('super_admin', 'support'), getUsersWith2FA)

// Disable 2FA - Super Admin only
router.post('/:user_id/disable', authorize('super_admin'), disable2FA)

module.exports = router
