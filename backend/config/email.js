const nodemailer = require('nodemailer')

// Configure for SendGrid SMTP
// Set environment variables in .env file:
// SMTP_HOST=smtp.sendgrid.net
// SMTP_PORT=587
// SMTP_USER=apikey
// SMTP_PASS=your_sendgrid_api_key
// EMAIL_FROM=noreply@yourdomain.com

// Validate required environment variables
if (!process.env.SMTP_PASS) {
  console.warn('⚠️  WARNING: SMTP_PASS environment variable is not set. Email sending will fail.')
  console.warn('   Please set SMTP_PASS in your .env file with your SendGrid API key.')
}

if (!process.env.EMAIL_FROM) {
  console.warn('⚠️  WARNING: EMAIL_FROM environment variable is not set.')
  console.warn('   Please set EMAIL_FROM in your .env file (e.g., noreply@yourdomain.com)')
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for 465, false for other ports (587 for SendGrid)
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS, // SendGrid API key (required)
  },
})

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML body
 */
const sendEmail = async (to, subject, html) => {
  try {
    // Validate required environment variables before attempting to send
    if (!process.env.SMTP_PASS) {
      throw new Error('SMTP_PASS environment variable is not set. Please configure SendGrid API key in .env file.')
    }

    if (!process.env.EMAIL_FROM) {
      throw new Error('EMAIL_FROM environment variable is not set. Please configure sender email in .env file.')
    }

    const info = await transporter.sendMail({
      from: `"Outbond Admin" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    })
    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    
    // Provide more helpful error messages
    let errorMessage = error.message
    if (error.message.includes('Invalid login') || error.message.includes('BadCredentials')) {
      errorMessage = 'Invalid SendGrid API key. Please check your SMTP_PASS in .env file.'
    } else if (error.message.includes('SMTP_PASS')) {
      errorMessage = error.message
    } else if (error.message.includes('EMAIL_FROM')) {
      errorMessage = error.message
    }
    
    return { success: false, error: errorMessage }
  }
}

module.exports = { transporter, sendEmail }
