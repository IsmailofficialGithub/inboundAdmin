const express = require('express')
const router = express.Router()
const {
  getPendingKYC,
  getUserKYCDetails,
  approveKYC,
  rejectKYC,
  requestKYCInfo,
  updateUserKYCInfo,
  getUserKYCDocuments,
} = require('../controllers/kycModerationController')
const { authenticate, authorize } = require('../middleware/auth')

// All KYC routes require authentication
router.use(authenticate)

// Support and ops can view, super_admin can manage
router.get('/kyc/pending', authorize('super_admin', 'support', 'ops'), getPendingKYC)
router.get('/kyc/users/:id', authorize('super_admin', 'support', 'ops'), getUserKYCDetails)
router.get('/kyc/users/:id/documents', authorize('super_admin', 'support', 'ops'), getUserKYCDocuments)
router.post('/kyc/users/:id/approve', authorize('super_admin', 'support'), approveKYC)
router.post('/kyc/users/:id/reject', authorize('super_admin', 'support'), rejectKYC)
router.post('/kyc/users/:id/request-info', authorize('super_admin', 'support'), requestKYCInfo)
router.put('/kyc/users/:id', authorize('super_admin', 'support'), updateUserKYCInfo)

module.exports = router
