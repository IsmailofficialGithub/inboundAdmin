const express = require('express')
const router = express.Router()
const {
  getUserCredits,
  getCreditTransactions,
  getTransactionById,
  adjustCredits,
} = require('../controllers/creditsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// View — all admins
router.get('/', getUserCredits)
router.get('/transactions', getCreditTransactions)
router.get('/transactions/:id', getTransactionById)

// Adjust — finance, super_admin only
router.post('/adjust', authorize('super_admin', 'finance'), adjustCredits)

module.exports = router
