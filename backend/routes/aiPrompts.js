const express = require('express')
const router = express.Router()
const {
  getAIPrompts,
  getAIPrompt,
  createAIPrompt,
  updateAIPrompt,
  deleteAIPrompt,
} = require('../controllers/aiPromptsController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getAIPrompts)
router.get('/:id', authorize('super_admin', 'support', 'ops'), getAIPrompt)
router.post('/', authorize('super_admin', 'ops'), createAIPrompt)
router.put('/:id', authorize('super_admin', 'ops'), updateAIPrompt)
router.delete('/:id', authorize('super_admin', 'ops'), deleteAIPrompt)

module.exports = router
