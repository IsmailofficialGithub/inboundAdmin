const express = require('express')
const router = express.Router()
const { getPasswordHistory } = require('../controllers/passwordSecurityController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Get password history - Super Admin only
router.get('/:user_id', authorize('super_admin'), getPasswordHistory)

module.exports = router
