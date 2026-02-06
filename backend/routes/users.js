const express = require('express')
const router = express.Router()
const {
  createUser,
  updateUser,
  getUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  resetEmailVerification,
  resetUserPassword,
  deleteUser,
} = require('../controllers/userController')
const { authenticate, authorize } = require('../middleware/auth')

// All user routes require authentication
router.use(authenticate)

// List & view users — all admin roles can view
router.get('/', getUsers)
router.get('/:id', getUserById)

// Create & update users — Super Admin, Support
router.post('/', authorize('super_admin', 'support'), createUser)
router.put('/:id', authorize('super_admin', 'support'), updateUser)

// User actions — Super Admin, Support, Ops
router.patch('/:id/suspend', authorize('super_admin', 'support', 'ops'), suspendUser)
router.patch('/:id/unsuspend', authorize('super_admin', 'support', 'ops'), unsuspendUser)
router.patch('/:id/reset-email-verification', authorize('super_admin', 'support'), resetEmailVerification)
router.patch('/:id/reset-password', authorize('super_admin', 'support'), resetUserPassword)

// Delete user — Super Admin only
router.delete('/:id', authorize('super_admin'), deleteUser)

module.exports = router
