const express = require('express')
const router = express.Router()
const {
  getRevenueReport,
  getUsageReport,
  getAgentPerformanceReport,
  getProviderPerformanceReport,
  exportUsers,
  exportSubscriptions,
  exportInvoices,
  exportCallLogs,
} = require('../controllers/reportsController')
const { authenticate } = require('../middleware/auth')

// All reports routes require authentication
router.use(authenticate)

// Reports
router.get('/revenue', getRevenueReport)
router.get('/usage', getUsageReport)
router.get('/agent-performance', getAgentPerformanceReport)
router.get('/provider-performance', getProviderPerformanceReport)

// Exports
router.get('/export/users', exportUsers)
router.get('/export/subscriptions', exportSubscriptions)
router.get('/export/invoices', exportInvoices)
router.get('/export/call-logs', exportCallLogs)

module.exports = router
