const express = require('express')
const router = express.Router()
const {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoice,
  processEmails,
  sendInvoiceEmail,
} = require('../controllers/invoiceController')
const { authenticate, authorize } = require('../middleware/auth')

// All invoice routes require authentication
router.use(authenticate)

// Invoice CRUD operations
router.get('/', authorize('super_admin', 'finance', 'support'), listInvoices)
router.get('/:id', authorize('super_admin', 'finance', 'support'), getInvoice)
router.post('/', authorize('super_admin', 'finance'), createInvoice)
router.put('/:id', authorize('super_admin', 'finance'), updateInvoice)
router.delete('/:id', authorize('super_admin', 'finance'), deleteInvoice)
router.get('/:id/download', authorize('super_admin', 'finance', 'support'), downloadInvoice)

// Email operations
router.post('/process-emails', authorize('super_admin', 'finance'), processEmails)
router.post('/:id/send-email', authorize('super_admin', 'finance', 'support'), sendInvoiceEmail)

module.exports = router
