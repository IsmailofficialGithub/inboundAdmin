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
const accountDeactivationsRoutes = require('./routes/accountDeactivations')
const verificationTokensRoutes = require('./routes/verificationTokens')
const passwordSecurityRoutes = require('./routes/passwordSecurity')
const twoFactorRoutes = require('./routes/twoFactor')
const userEmailsRoutes = require('./routes/userEmails')

const app = express()
const PORT = process.env.PORT || 3011

// ======================
// MIDDLEWARE
// ======================

// Trust proxy - important for production environments behind reverse proxy/load balancer
// This ensures req.ip and req.headers are correctly set
if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', true)
}

// Security headers - configure to allow Authorization header
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Disable if causing issues with API responses
  })
)

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3010',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
)

// Request logging
app.use(morgan('dev'))

// Debug middleware for production - log Authorization header issues
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Only log API requests that require auth
    if (req.path.startsWith('/api/') && !req.path.includes('/auth/login') && !req.path.includes('/health')) {
      const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['authorization'] || req.headers['Authorization']
      if (!authHeader) {
        console.warn(`[AUTH DEBUG] Missing Authorization header on ${req.method} ${req.path}`, {
          headers: Object.keys(req.headers).filter(k => k.toLowerCase().includes('auth')),
          ip: req.ip,
        })
      }
    }
    next()
  })
}

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// System mode checks (maintenance and read-only)
app.use(checkMaintenanceMode)
app.use(checkReadOnlyMode)

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 300,
  message: { error: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 30,
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

// User Authentication & Security
app.use('/api/account-deactivations', apiLimiter, accountDeactivationsRoutes)
app.use('/api/verification-tokens', apiLimiter, verificationTokensRoutes)
app.use('/api/password-history', apiLimiter, passwordSecurityRoutes)
app.use('/api/2fa', apiLimiter, twoFactorRoutes)
app.use('/api/user-emails', apiLimiter, userEmailsRoutes)

// Scheduling
app.use('/api/call-schedules', apiLimiter, require('./routes/callSchedules'))
app.use('/api/holidays', apiLimiter, require('./routes/holidays'))
app.use('/api/agent-schedules', apiLimiter, require('./routes/agentSchedules'))

// Knowledge Base
app.use('/api/knowledge-bases', apiLimiter, require('./routes/knowledgeBases'))

// Billing Extensions
app.use('/api/tax-configuration', apiLimiter, require('./routes/taxConfiguration'))

// Communication
app.use('/api/ai-prompts', apiLimiter, require('./routes/aiPrompts'))
app.use('/api/email-logs', apiLimiter, require('./routes/emailLogs'))
app.use('/api/email-templates', apiLimiter, require('./routes/emailTemplates'))

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
