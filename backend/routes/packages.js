const express = require('express')
const router = express.Router()
const {
  listPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  upsertFeature,
  deleteFeature,
  upsertVariable,
  deleteVariable,
} = require('../controllers/packageController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// Package CRUD
router.get('/', listPackages) // Public read for active packages
router.get('/:id', getPackage) // Public read for active packages
router.post('/', authorize('super_admin', 'finance'), createPackage)
router.put('/:id', authorize('super_admin', 'finance'), updatePackage)
router.delete('/:id', authorize('super_admin', 'finance'), deletePackage)

// Package features
router.post('/:id/features', authorize('super_admin', 'finance'), upsertFeature)
router.delete('/:id/features/:featureKey', authorize('super_admin', 'finance'), deleteFeature)

// Package variables
router.post('/:id/variables', authorize('super_admin', 'finance'), upsertVariable)
router.delete('/:id/variables/:variableKey', authorize('super_admin', 'finance'), deleteVariable)

module.exports = router
