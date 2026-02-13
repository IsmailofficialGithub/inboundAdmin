const express = require('express')
const router = express.Router()
const { getEmailLogs, getEmailLog } = require('../controllers/emailLogsController')
const { authenticate, authorize } = require('../middleware/auth')

router.use(authenticate)

router.get('/', authorize('super_admin', 'support'), getEmailLogs)
router.get('/:id', authorize('super_admin', 'support'), getEmailLog)

module.exports = router
