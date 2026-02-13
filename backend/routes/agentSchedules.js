const express = require('express')
const router = express.Router()
const {
  getAgentSchedules,
  assignAgentToSchedule,
  removeAgentFromSchedule,
} = require('../controllers/agentSchedulesController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getAgentSchedules)
router.post('/', authorize('super_admin', 'ops'), assignAgentToSchedule)
router.delete('/:id', authorize('super_admin', 'ops'), removeAgentFromSchedule)

module.exports = router
