const express = require('express')
const router = express.Router()
const {
  getCallSchedules,
  getCallSchedule,
  createCallSchedule,
  updateCallSchedule,
  deleteCallSchedule,
} = require('../controllers/callSchedulesController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getCallSchedules)
router.get('/:id', authorize('super_admin', 'support', 'ops'), getCallSchedule)
router.post('/', authorize('super_admin', 'ops'), createCallSchedule)
router.put('/:id', authorize('super_admin', 'ops'), updateCallSchedule)
router.delete('/:id', authorize('super_admin', 'ops'), deleteCallSchedule)

module.exports = router
