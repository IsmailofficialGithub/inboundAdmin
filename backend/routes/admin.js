const express = require('express')
const router = express.Router()
const {
  getDashboardStats,
  getActivityLog,
  getSecurityEvents,
  createAdmin,
  getAdmins,
  resetAdminPassword,
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

// Admin management — Super Admin only
router.get('/admins', authorize('super_admin'), getAdmins)
router.post('/create-admin', authorize('super_admin'), createAdmin)
router.patch('/reset-password/:adminId', authorize('super_admin'), resetAdminPassword)

module.exports = router
