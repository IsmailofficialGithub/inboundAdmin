const express = require('express')
const router = express.Router()
const { login, logout, getMe, refreshToken } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

// Public routes
router.post('/login', login)
router.post('/refresh', refreshToken)

// Protected routes
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)

module.exports = router
