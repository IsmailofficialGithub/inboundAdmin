/**
 * Email templates for the admin panel
 */

const accountCreatedTemplate = (email, tempPassword) => ({
  subject: 'Your Account Has Been Created',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Welcome to Outbond</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">Your account has been created successfully.</p>
        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="margin: 5px 0; color: #64748b;"><strong>Email:</strong> ${email}</p>
          ${tempPassword ? `<p style="margin: 5px 0; color: #64748b;"><strong>Temporary Password:</strong> ${tempPassword}</p>` : ''}
        </div>
        <p style="color: #64748b; font-size: 14px;">Please change your password after your first login.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">— The Outbond Team</p>
      </div>
    </div>
  `,
})

const accountSuspendedTemplate = (email, reason) => ({
  subject: 'Your Account Has Been Suspended',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #ef4444; padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Account Suspended</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">Your account (<strong>${email}</strong>) has been suspended.</p>
        ${reason ? `<p style="color: #334155; font-size: 16px;"><strong>Reason:</strong> ${reason}</p>` : ''}
        <p style="color: #64748b; font-size: 14px;">If you believe this is a mistake, please contact support.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">— The Outbond Team</p>
      </div>
    </div>
  `,
})

const passwordResetTemplate = (email, resetLink) => ({
  subject: 'Password Reset Request',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Password Reset</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">A password reset was requested for <strong>${email}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you did not request this, please ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">— The Outbond Team</p>
      </div>
    </div>
  `,
})

const adminPasswordResetTemplate = (email, newPassword) => ({
  subject: 'Your Admin Password Has Been Reset',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Password Reset</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">Your admin account password has been reset by an administrator.</p>
        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="margin: 5px 0; color: #64748b;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0; color: #64748b;"><strong>New Password:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${newPassword}</code></p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Please log in with this password and change it immediately for security purposes.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">— The Outbond Team</p>
      </div>
    </div>
  `,
})

const invoiceEmailTemplate = (invoiceNumber, invoiceDate, dueDate, totalAmount, currency, invoiceUrl, pdfUrl, companyName = 'Outbond') => ({
  subject: `Invoice ${invoiceNumber} from ${companyName}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Invoice ${invoiceNumber}</h1>
      </div>
      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">Please find your invoice details below:</p>
        <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; color: #334155; text-align: right;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Invoice Date:</strong></td>
              <td style="padding: 8px 0; color: #334155; text-align: right;">${invoiceDate}</td>
            </tr>
            ${dueDate ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; color: #334155; text-align: right;">${dueDate}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 2px solid #e2e8f0;">
              <td style="padding: 12px 0; color: #334155; font-size: 18px;"><strong>Total Amount:</strong></td>
              <td style="padding: 12px 0; color: #334155; font-size: 18px; font-weight: bold; text-align: right;">${currency} ${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          ${invoiceUrl ? `
          <a href="${invoiceUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; margin: 5px;">
            View Invoice Online
          </a>
          ` : ''}
          ${pdfUrl ? `
          <a href="${pdfUrl}" style="background: #fff; color: #6366f1; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block; margin: 5px; border: 2px solid #6366f1;">
            Download PDF
          </a>
          ` : ''}
        </div>
        <p style="color: #64748b; font-size: 14px;">If you have any questions about this invoice, please contact our support team.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">— The ${companyName} Team</p>
      </div>
    </div>
  `,
})

module.exports = {
  accountCreatedTemplate,
  accountSuspendedTemplate,
  passwordResetTemplate,
  adminPasswordResetTemplate,
  invoiceEmailTemplate,
}
