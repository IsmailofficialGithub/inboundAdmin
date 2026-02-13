const express = require('express')
const router = express.Router()
const {
  getWebhookSettings,
  createWebhookSetting,
  updateWebhookSetting,
  deleteWebhookSetting,
  getWebhookLogs,
  getIPAllowlist,
  addIPToAllowlist,
  removeIPFromAllowlist,
  getDataRetentionConfig,
  updateDataRetentionConfig,
  getBackupStatus,
  createBackupStatus,
  getAbuseAlerts,
  resolveAbuseAlert,
  getFailedLogins,
} = require('../controllers/securityController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Webhook security settings
router.get('/webhook-settings', authorize('super_admin', 'ops'), getWebhookSettings)
router.post('/webhook-settings', authorize('super_admin', 'ops'), createWebhookSetting)
router.put('/webhook-settings/:id', authorize('super_admin', 'ops'), updateWebhookSetting)
router.delete('/webhook-settings/:id', authorize('super_admin', 'ops'), deleteWebhookSetting)
router.get('/webhook-logs', authorize('super_admin', 'ops'), getWebhookLogs)

// IP Allowlist
router.get('/ip-allowlist', authorize('super_admin', 'ops'), getIPAllowlist)
router.post('/ip-allowlist', authorize('super_admin', 'ops'), addIPToAllowlist)
router.delete('/ip-allowlist/:id', authorize('super_admin', 'ops'), removeIPFromAllowlist)

// Data Retention
router.get('/data-retention', authorize('super_admin', 'ops'), getDataRetentionConfig)
router.put('/data-retention/:id', authorize('super_admin', 'ops'), updateDataRetentionConfig)

// Backup Status
router.get('/backup-status', authorize('super_admin', 'ops'), getBackupStatus)
router.post('/backup-status', authorize('super_admin', 'ops'), createBackupStatus)

// Abuse Detection
router.get('/abuse-alerts', authorize('super_admin', 'ops'), getAbuseAlerts)
router.put('/abuse-alerts/:id/resolve', authorize('super_admin', 'ops'), resolveAbuseAlert)
router.get('/failed-logins', authorize('super_admin', 'ops'), getFailedLogins)

module.exports = router
