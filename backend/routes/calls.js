const express = require('express')
const router = express.Router()
const {
  getCalls,
  getCallById,
  getCallRecordings,
} = require('../controllers/callsController')
const { authenticate } = require('../middleware/auth')

// All routes require authentication
router.use(authenticate)

// List / detail — all admins can view
router.get('/', getCalls)
router.get('/:id', getCallById)
router.get('/:id/recordings', getCallRecordings)

module.exports = router
