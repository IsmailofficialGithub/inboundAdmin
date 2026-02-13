const express = require('express')
const router = express.Router()
const { login, logout, getMe, refreshToken, updateProfile, getSessions, forceLogout, uploadAvatar, upload } = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')

// Public routes
router.post('/login', login)
router.post('/refresh', refreshToken)

// Protected routes
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)
router.put('/profile', authenticate, updateProfile)
router.post('/profile/avatar', authenticate, upload.single('avatar'), uploadAvatar)
router.get('/sessions', authenticate, getSessions)
router.post('/force-logout/:adminId', authenticate, forceLogout)

module.exports = router
