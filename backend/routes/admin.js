const express = require('express')
const router = express.Router()
const {
  getDashboardStats,
  getActivityLog,
  getSecurityEvents,
  createAdmin,
} = require('../controllers/adminController')
const { authenticate, authorize } = require('../middleware/auth')

// All admin routes require authentication
router.use(authenticate)

// Dashboard
router.get('/dashboard', getDashboardStats)

// Activity log — all admins can view
router.get('/activity-log', getActivityLog)

// Security events — Super Admin, Support
router.get('/security-events', authorize('super_admin', 'support'), getSecurityEvents)

// Create new admin — Super Admin only
router.post('/create-admin', authorize('super_admin'), createAdmin)

module.exports = router
