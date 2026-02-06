require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')

// Route imports
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')

const app = express()
const PORT = process.env.PORT || 5000

// ======================
// MIDDLEWARE
// ======================

// Security headers
app.use(helmet())

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Request logging
app.use(morgan('dev'))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
})

// ======================
// ROUTES
// ======================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// Auth routes — login/refresh have stricter rate limit, /me and /logout use general limiter
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/refresh', authLimiter)
app.use('/api/auth', apiLimiter, authRoutes)

// User management routes
app.use('/api/users', apiLimiter, userRoutes)

// Admin routes (dashboard, activity log, etc.)
app.use('/api/admin', apiLimiter, adminRoutes)

// ======================
// ERROR HANDLING
// ======================

app.use(notFoundHandler)
app.use(errorHandler)

// ======================
// START SERVER
// ======================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`)
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
  console.log(`\nAPI Endpoints:`)
  console.log(`  POST   /api/auth/login`)
  console.log(`  POST   /api/auth/logout`)
  console.log(`  GET    /api/auth/me`)
  console.log(`  POST   /api/auth/refresh`)
  console.log(`  GET    /api/users`)
  console.log(`  POST   /api/users              (create user + send email)`)
  console.log(`  GET    /api/users/:id`)
  console.log(`  PUT    /api/users/:id           (update user)`)
  console.log(`  PATCH  /api/users/:id/suspend`)
  console.log(`  PATCH  /api/users/:id/unsuspend`)
  console.log(`  PATCH  /api/users/:id/reset-email-verification`)
  console.log(`  PATCH  /api/users/:id/reset-password`)
  console.log(`  DELETE /api/users/:id`)
  console.log(`  GET    /api/admin/dashboard`)
  console.log(`  GET    /api/admin/activity-log`)
  console.log(`  GET    /api/admin/security-events`)
  console.log(`  POST   /api/admin/create-admin`)
  console.log(`  GET    /api/health\n`)
})

module.exports = app
