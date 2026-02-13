const express = require('express')
const router = express.Router()
const {
  getTaxConfigurations,
  getTaxConfiguration,
  createTaxConfiguration,
  updateTaxConfiguration,
  deleteTaxConfiguration,
} = require('../controllers/taxConfigurationController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'finance'), getTaxConfigurations)
router.get('/:id', authorize('super_admin', 'finance'), getTaxConfiguration)
router.post('/', authorize('super_admin', 'finance'), createTaxConfiguration)
router.put('/:id', authorize('super_admin', 'finance'), updateTaxConfiguration)
router.delete('/:id', authorize('super_admin', 'finance'), deleteTaxConfiguration)

module.exports = router
