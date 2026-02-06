const express = require('express')
const router = express.Router()
const {
  getSystemSettings,
  getSystemSetting,
  updateSystemSetting,
  getMaintenanceStatus,
  getReadOnlyStatus,
} = require('../controllers/systemSettingsController')
const { authenticate, authorize } = require('../middleware/auth')

// Public status endpoints (for frontend checks - no auth required)
router.get('/system-settings/maintenance/status', getMaintenanceStatus)
router.get('/system-settings/read-only/status', getReadOnlyStatus)

// Settings management routes require authentication
router.use(authenticate)

// Settings management (super_admin only)
router.get('/system-settings', authorize('super_admin'), getSystemSettings)
router.get('/system-settings/:key', authorize('super_admin'), getSystemSetting)
router.put('/system-settings/:key', authorize('super_admin'), updateSystemSetting)

module.exports = router
