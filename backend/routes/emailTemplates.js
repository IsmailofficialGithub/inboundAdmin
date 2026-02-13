const express = require('express')
const router = express.Router()
const {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} = require('../controllers/emailTemplatesController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getEmailTemplates)
router.get('/:id', authorize('super_admin', 'support', 'ops'), getEmailTemplate)
router.post('/', authorize('super_admin', 'ops'), createEmailTemplate)
router.put('/:id', authorize('super_admin', 'ops'), updateEmailTemplate)
router.delete('/:id', authorize('super_admin', 'ops'), deleteEmailTemplate)

module.exports = router
