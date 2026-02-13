const express = require('express')
const router = express.Router()
const {
  getKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  addDocument,
  deleteDocument,
  addFAQ,
  updateFAQ,
  deleteFAQ,
} = require('../controllers/knowledgeBaseController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getKnowledgeBases)
router.get('/:id', authorize('super_admin', 'support', 'ops'), getKnowledgeBase)
router.post('/', authorize('super_admin', 'ops'), createKnowledgeBase)
router.put('/:id', authorize('super_admin', 'ops'), updateKnowledgeBase)
router.delete('/:id', authorize('super_admin', 'ops'), deleteKnowledgeBase)

// Documents
router.post('/:id/documents', authorize('super_admin', 'ops'), addDocument)
router.delete('/documents/:id', authorize('super_admin', 'ops'), deleteDocument)

// FAQs
router.post('/:id/faqs', authorize('super_admin', 'ops'), addFAQ)
router.put('/faqs/:id', authorize('super_admin', 'ops'), updateFAQ)
router.delete('/faqs/:id', authorize('super_admin', 'ops'), deleteFAQ)

module.exports = router
