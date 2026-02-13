const express = require('express')
const router = express.Router()
const {
  getHolidays,
  getHoliday,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} = require('../controllers/holidaysController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support', 'ops'), getHolidays)
router.get('/:id', authorize('super_admin', 'support', 'ops'), getHoliday)
router.post('/', authorize('super_admin', 'ops'), createHoliday)
router.put('/:id', authorize('super_admin', 'ops'), updateHoliday)
router.delete('/:id', authorize('super_admin', 'ops'), deleteHoliday)

module.exports = router
