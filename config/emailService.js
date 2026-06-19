const { Resend } = require("resend");

const isResendConfigured = () =>
  process.env.RESEND_API_KEY &&
  !process.env.RESEND_API_KEY.includes("re_your");

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.FROM_EMAIL || "Networq Nexus <onboarding@resend.dev>";

const baseTemplate = (content) => `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f172a;border-radius:12px;overflow:hidden;">
    <div style="background:#6366f1;padding:20px 24px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:bold;">⚡ Networq Nexus</span>
    </div>
    <div style="padding:32px 24px;">
      ${content}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #1e293b;text-align:center;">
      <p style="color:#475569;font-size:12px;margin:0;">© 2026 Networq Nexus. All rights reserved.</p>
    </div>
  </div>
`;

const sendVerificationEmail = async (to, name, token) => {
  const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;

  if (!isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Verification link for ${to}:\n${url}\n`);
    return;
  }

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Verify your Networq Nexus email",
    html: baseTemplate(`
      <h2 style="color:#f8fafc;margin:0 0 8px;">Verify your email</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Hi ${name}, click the button below to verify your email address and activate your account.</p>
      <a href="${url}" style="display:block;background:#6366f1;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:24px;">
        Verify Email Address
      </a>
      <p style="color:#475569;font-size:12px;margin:0;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `),
  });
};

const sendPasswordResetEmail = async (to, name, token) => {
  const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

  if (!isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Password reset link for ${to}:\n${url}\n`);
    return;
  }

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your Networq Nexus password",
    html: baseTemplate(`
      <h2 style="color:#f8fafc;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#94a3b8;margin:0 0 24px;">Hi ${name}, someone requested a password reset for your account. Click below to set a new password.</p>
      <a href="${url}" style="display:block;background:#6366f1;color:#fff;text-align:center;padding:14px;border-radius:8px;text-decoration:none;font-weight:bold;margin-bottom:24px;">
        Reset Password
      </a>
      <p style="color:#475569;font-size:12px;margin:0;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
