const express = require('express')
const router = express.Router()
const { getSettings, updateSettings } = require('../controllers/invoiceSettingsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Invoice settings (only super_admin and finance can manage)
router.get('/', authorize('super_admin', 'finance', 'support'), getSettings)
router.put('/', authorize('super_admin', 'finance'), updateSettings)

module.exports = router
