const crypto = require('crypto')
const { supabaseAdmin } = require('../config/supabase')

/**
 * Middleware to validate webhook signature
 * Checks signature against configured secret for the provider
 */
const validateWebhookSignature = async (req, res, next) => {
  try {
    const providerName = req.headers['x-provider'] || req.body.provider || 'unknown'
    const webhookEndpoint = req.path || req.originalUrl

    // Get webhook security settings
    const { data: settings } = await supabaseAdmin
      .from('webhook_security_settings')
      .select('*')
      .eq('provider_name', providerName)
      .eq('webhook_endpoint', webhookEndpoint)
      .eq('is_enabled', true)
      .eq('require_signature', true)
      .single()

    // If no settings found or signature not required, allow
    if (!settings || !settings.require_signature) {
      return next()
    }

    // Get signature from headers (common patterns)
    const signature =
      req.headers['x-signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-hub-signature-256'] ||
      req.headers['x-twilio-signature'] ||
      req.headers['authorization']?.replace('Bearer ', '')

    if (!signature) {
      // Log failed attempt
      await logWebhookRequest(providerName, webhookEndpoint, req, false, 'Missing signature')
      return res.status(401).json({ error: 'Webhook signature is required' })
    }

    // Validate signature based on algorithm
    const isValid = validateSignature(
      req.body,
      signature,
      settings.secret_key,
      settings.signature_algorithm,
      req.headers
    )

    if (!isValid) {
      // Log failed attempt
      await logWebhookRequest(providerName, webhookEndpoint, req, false, 'Invalid signature')
      return res.status(401).json({ error: 'Invalid webhook signature' })
    }

    // Check IP allowlist if configured
    if (settings.allowed_ips && settings.allowed_ips.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      const isIPAllowed = settings.allowed_ips.some((cidr) => {
        try {
          if (cidr.includes('/')) {
            const [network, prefix] = cidr.split('/')
            return isIPInCIDR(clientIP, network, parseInt(prefix))
          } else {
            return clientIP === cidr
          }
        } catch {
          return false
        }
      })

      if (!isIPAllowed) {
        await logWebhookRequest(providerName, webhookEndpoint, req, false, 'IP not in allowlist')
        return res.status(403).json({ error: 'IP address not in allowlist' })
      }
    }

    // Check rate limit
    const rateLimitExceeded = await checkRateLimit(providerName, webhookEndpoint, settings.rate_limit_per_minute)
    if (rateLimitExceeded) {
      await logWebhookRequest(providerName, webhookEndpoint, req, false, 'Rate limit exceeded')
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    // Log successful request
    await logWebhookRequest(providerName, webhookEndpoint, req, true, null)

    // Update last validated timestamp
    await supabaseAdmin
      .from('webhook_security_settings')
      .update({ last_validated_at: new Date().toISOString() })
      .eq('id', settings.id)

    next()
  } catch (err) {
    console.error('Webhook signature validation error:', err)
    // On error, deny access (fail closed for security)
    return res.status(500).json({ error: 'Webhook validation failed' })
  }
}

/**
 * Validate signature based on algorithm
 */
function validateSignature(body, signature, secret, algorithm, headers) {
  try {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body)

    switch (algorithm) {
      case 'hmac_sha256':
        const hmac = crypto.createHmac('sha256', secret)
        hmac.update(bodyString)
        const expectedSignature = hmac.digest('hex')
        // Some providers prefix with algorithm (e.g., "sha256=...")
        return (
          signature === expectedSignature ||
          signature === `sha256=${expectedSignature}` ||
          signature === `sha256:${expectedSignature}`
        )

      case 'hmac_sha1':
        const hmac1 = crypto.createHmac('sha1', secret)
        hmac1.update(bodyString)
        const expectedSignature1 = hmac1.digest('hex')
        return (
          signature === expectedSignature1 ||
          signature === `sha1=${expectedSignature1}` ||
          signature === `sha1:${expectedSignature1}`
        )

      case 'twilio':
        // Twilio uses HMAC-SHA1 with specific format
        const url = headers['x-forwarded-url'] || headers['host'] || ''
        const hmacTwilio = crypto.createHmac('sha1', secret)
        hmacTwilio.update(url + bodyString)
        return signature === hmacTwilio.digest('base64')

      default:
        console.warn(`Unknown signature algorithm: ${algorithm}`)
        return false
    }
  } catch (err) {
    console.error('Signature validation error:', err)
    return false
  }
}

/**
 * Check rate limit for webhook
 */
async function checkRateLimit(providerName, webhookEndpoint, limitPerMinute) {
  try {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

    const { count } = await supabaseAdmin
      .from('webhook_request_logs')
      .select('*', { count: 'exact', head: true })
      .eq('provider_name', providerName)
      .eq('webhook_endpoint', webhookEndpoint)
      .gte('created_at', oneMinuteAgo)

    return (count || 0) >= limitPerMinute
  } catch {
    return false // On error, allow (fail open)
  }
}

/**
 * Log webhook request
 */
async function logWebhookRequest(providerName, webhookEndpoint, req, isValid, errorMessage) {
  try {
    const startTime = Date.now()
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim()

    // Store request body size (for large bodies, we might want to truncate)
    const requestBody = req.body || {}
    const requestBodySize = JSON.stringify(requestBody).length

    await supabaseAdmin.from('webhook_request_logs').insert({
      provider_name: providerName,
      webhook_endpoint: webhookEndpoint,
      request_method: req.method,
      request_headers: req.headers,
      request_body: requestBodySize > 10000 ? { truncated: true, size: requestBodySize } : requestBody,
      request_ip: clientIP,
      signature_valid: isValid,
      signature_error: errorMessage,
      processing_time_ms: Date.now() - startTime,
    })
  } catch (err) {
    console.error('Failed to log webhook request:', err)
  }
}

/**
 * Helper function to check if IP is in CIDR range
 */
function isIPInCIDR(ip, network, prefix) {
  try {
    const ipParts = ip.split('.').map(Number)
    const networkParts = network.split('.').map(Number)

    if (ipParts.length !== 4 || networkParts.length !== 4) {
      return false
    }

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]
    const networkNum = (networkParts[0] << 24) | (networkParts[1] << 16) | (networkParts[2] << 8) | networkParts[3]
    const mask = ~((1 << (32 - prefix)) - 1)

    return (ipNum & mask) === (networkNum & mask)
  } catch {
    return false
  }
}

module.exports = { validateWebhookSignature }
