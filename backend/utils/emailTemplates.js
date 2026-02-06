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

module.exports = {
  accountCreatedTemplate,
  accountSuspendedTemplate,
  passwordResetTemplate,
}
