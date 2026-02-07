require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler')
const { checkMaintenanceMode, checkReadOnlyMode } = require('./middleware/systemMode')

// Route imports
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const adminRoutes = require('./routes/admin')
const voiceAgentsRoutes = require('./routes/voiceAgents')
const callsRoutes = require('./routes/calls')
const creditsRoutes = require('./routes/credits')
const subscriptionsRoutes = require('./routes/subscriptions')
const inboundNumbersRoutes = require('./routes/inboundNumbers')
const invoicesRoutes = require('./routes/invoices')
const supportRoutes = require('./routes/support')
const featureFlagsRoutes = require('./routes/featureFlags')
const systemSettingsRoutes = require('./routes/systemSettings')
const kycRoutes = require('./routes/kyc')
const reportsRoutes = require('./routes/reports')
const securityRoutes = require('./routes/security')

const app = express()
const PORT = process.env.PORT || 3011

// ======================
// MIDDLEWARE
// ======================

// Security headers
app.use(helmet())

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3010',
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

// System mode checks (maintenance and read-only)
app.use(checkMaintenanceMode)
app.use(checkReadOnlyMode)

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

// Voice agents management
app.use('/api/voice-agents', apiLimiter, voiceAgentsRoutes)

// Calls & recordings
app.use('/api/calls', apiLimiter, callsRoutes)

// Credits & transactions
app.use('/api/credits', apiLimiter, creditsRoutes)

// Subscriptions & packages
app.use('/api/subscriptions', apiLimiter, subscriptionsRoutes)
app.use('/api/packages', apiLimiter, require('./routes/packages'))

// Inbound numbers
app.use('/api/inbound-numbers', apiLimiter, inboundNumbersRoutes)

// Invoices & billing
app.use('/api/invoices', apiLimiter, invoicesRoutes)
app.use('/api/invoice-settings', apiLimiter, require('./routes/invoiceSettings'))
app.use('/api/payments', apiLimiter, require('./routes/payments'))
app.use('/api/refunds-disputes', apiLimiter, require('./routes/refundsDisputes'))
app.use('/api/coupons', apiLimiter, require('./routes/coupons'))
app.use('/api/invoice-email-logs', apiLimiter, require('./routes/invoiceEmailLogs'))

// Support & Operations
app.use('/api/support', apiLimiter, supportRoutes)
app.use('/api', apiLimiter, featureFlagsRoutes)
app.use('/api', apiLimiter, systemSettingsRoutes)
app.use('/api', apiLimiter, kycRoutes)

// Reports & Exports
app.use('/api/reports', apiLimiter, reportsRoutes)

// Security & Monitoring
app.use('/api/security', apiLimiter, securityRoutes)

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
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3010'}`)
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
  console.log(`  GET    /api/admin/admins`)
  console.log(`  PATCH  /api/admin/reset-password/:adminId`)
  console.log(`  GET    /api/voice-agents`)
  console.log(`  GET    /api/voice-agents/:id`)
  console.log(`  PUT    /api/voice-agents/:id`)
  console.log(`  DELETE /api/voice-agents/:id`)
  console.log(`  GET    /api/calls`)
  console.log(`  GET    /api/calls/:id`)
  console.log(`  GET    /api/credits`)
  console.log(`  GET    /api/credits/transactions`)
  console.log(`  POST   /api/credits/adjust`)
  console.log(`  GET    /api/subscriptions`)
  console.log(`  GET    /api/subscriptions/packages`)
  console.log(`  POST   /api/subscriptions/packages`)
  console.log(`  GET    /api/inbound-numbers`)
  console.log(`  GET    /api/inbound-numbers/:id`)
  console.log(`  POST   /api/invoices/process-emails`)
  console.log(`  POST   /api/invoices/:id/send-email`)
  console.log(`  GET    /api/support/tickets`)
  console.log(`  POST   /api/support/tickets`)
  console.log(`  GET    /api/feature-flags`)
  console.log(`  POST   /api/feature-flags`)
  console.log(`  GET    /api/system-settings`)
  console.log(`  PUT    /api/system-settings/:key`)
  console.log(`  GET    /api/kyc/pending`)
  console.log(`  POST   /api/kyc/users/:id/approve`)
  console.log(`  GET    /api/health\n`)
})

module.exports = app
