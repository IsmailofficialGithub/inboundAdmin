const express = require('express')
const router = express.Router()
const {
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  getPackages,
  createPackage,
  updatePackage,
  deletePackage,
} = require('../controllers/subscriptionsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Packages — view by all, manage by super_admin
router.get('/packages', getPackages)
router.post('/packages', authorize('super_admin'), createPackage)
router.put('/packages/:id', authorize('super_admin'), updatePackage)
router.delete('/packages/:id', authorize('super_admin'), deletePackage)

// Subscriptions — view by all, update by super_admin, finance
router.get('/', getSubscriptions)
router.get('/:id', getSubscriptionById)
router.patch('/:id', authorize('super_admin', 'finance'), updateSubscription)

module.exports = router
