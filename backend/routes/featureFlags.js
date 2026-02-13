const express = require('express')
const router = express.Router()
const {
  getFeatureFlags,
  getFeatureFlagById,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
} = require('../controllers/featureFlagsController')
const { authenticate, authorize } = require('../middleware/auth')

// All feature flag routes require authentication
router.use(authenticate)

// Only super_admin can manage feature flags
router.get('/feature-flags', getFeatureFlags)
router.get('/feature-flags/:id', getFeatureFlagById)
router.post('/feature-flags', authorize('super_admin'), createFeatureFlag)
router.put('/feature-flags/:id', authorize('super_admin'), updateFeatureFlag)
router.delete('/feature-flags/:id', authorize('super_admin'), deleteFeatureFlag)

module.exports = router
