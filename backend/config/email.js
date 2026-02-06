const nodemailer = require('nodemailer')

// Configure for SendGrid SMTP
// Set environment variables:
// SMTP_HOST=smtp.sendgrid.net
// SMTP_PORT=587
// SMTP_USER=apikey
// SMTP_PASS=your_sendgrid_api_key
// EMAIL_FROM=your_email@domain.com
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for 465, false for other ports (587 for SendGrid)
  auth: {
    user: process.env.SMTP_USER || 'apikey',
    pass: process.env.SMTP_PASS, // SendGrid API key
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
    const info = await transporter.sendMail({
      from: `"Outbond Admin" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    })
    console.log('Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

module.exports = { transporter, sendEmail }
