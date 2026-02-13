const express = require('express')
const router = express.Router()
const {
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  activateAgent,
  deactivateAgent,
} = require('../controllers/voiceAgentsController')
const { authenticate, authorize } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// List / detail — all admins can view
router.get('/', getAgents)
router.get('/:id', getAgentById)

// Edit — super_admin, ops
router.put('/:id', authorize('super_admin', 'ops'), updateAgent)

// Status toggle — super_admin, ops
router.patch('/:id/activate', authorize('super_admin', 'ops'), activateAgent)
router.patch('/:id/deactivate', authorize('super_admin', 'ops'), deactivateAgent)

// Delete — super_admin only
router.delete('/:id', authorize('super_admin'), deleteAgent)

module.exports = router
