const nodemailer = require("nodemailer");
const { Resend }  = require("resend");

// ── helpers ──────────────────────────────────────────────
const isGmailConfigured = () =>
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;

const isResendConfigured = () =>
  process.env.RESEND_API_KEY &&
  !process.env.RESEND_API_KEY.includes("re_your");

const getGmailTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const GMAIL_FROM   = `Networq Nexus <${process.env.GMAIL_USER}>`;
const RESEND_FROM  = process.env.FROM_EMAIL || "Networq Nexus <onboarding@resend.dev>";

// ── HTML template ─────────────────────────────────────────
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

// ── core send function (Gmail first, Resend fallback) ──────
const sendEmail = async ({ to, subject, html }) => {
  if (isGmailConfigured()) {
    await getGmailTransporter().sendMail({ from: GMAIL_FROM, to, subject, html });
    return;
  }
  if (isResendConfigured()) {
    await getResend().emails.send({ from: RESEND_FROM, to, subject, html });
    return;
  }
  // dev mode — just log
  console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n`);
};

// ── public functions ───────────────────────────────────────
const sendVerificationEmail = async (to, name, token) => {
  const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Verification link for ${to}:\n${url}\n`);
    return;
  }

  await sendEmail({
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

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Password reset link for ${to}:\n${url}\n`);
    return;
  }

  await sendEmail({
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

const sendContactEmail = async ({ name, email, message }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "admin@networqnexus.com";

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV CONTACT] From: ${name} <${email}>\nMessage: ${message}\n`);
    return;
  }

  await sendEmail({
    to: adminEmail,
    subject: `Help Center Message from ${name}`,
    html: baseTemplate(`
      <h2 style="color:#f8fafc;margin:0 0 8px;">New Support Message</h2>
      <p style="color:#94a3b8;margin:0 0 20px;">Someone submitted a message via the Help Center.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;width:80px;">Name</td><td style="color:#f8fafc;font-size:13px;">${name}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0;font-size:13px;">Email</td><td style="color:#6366f1;font-size:13px;">${email}</td></tr>
      </table>
      <div style="margin-top:20px;padding:16px;background:#1e293b;border-radius:8px;border-left:3px solid #6366f1;">
        <p style="color:#94a3b8;font-size:13px;margin:0;white-space:pre-wrap;">${message}</p>
      </div>
      <a href="mailto:${email}" style="display:inline-block;margin-top:20px;background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:bold;">Reply to ${name}</a>
    `),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendContactEmail };
