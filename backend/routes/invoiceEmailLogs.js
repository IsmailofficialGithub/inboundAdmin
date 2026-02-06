const express = require('express')
const router = express.Router()
const { listEmailLogs, getEmailLog } = require('../controllers/invoiceEmailLogsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Email logs (read-only for support, full access for finance and super_admin)
router.get('/', authorize('super_admin', 'finance', 'support'), listEmailLogs)
router.get('/:id', authorize('super_admin', 'finance', 'support'), getEmailLog)

module.exports = router
