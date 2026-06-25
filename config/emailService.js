const nodemailer = require("nodemailer");
const { Resend }  = require("resend");

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

const GMAIL_FROM  = `Networq Nexus <${process.env.GMAIL_USER}>`;
const RESEND_FROM = process.env.FROM_EMAIL || "Networq Nexus <onboarding@resend.dev>";

const sendEmail = async ({ to, subject, text }) => {
  if (isGmailConfigured()) {
    await getGmailTransporter().sendMail({ from: GMAIL_FROM, to, subject, text });
    return;
  }
  if (isResendConfigured()) {
    await getResend().emails.send({ from: RESEND_FROM, to, subject, text });
    return;
  }
  console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n${text}\n`);
};

// ── Email verification ─────────────────────────────────────────────────
const sendVerificationEmail = async (to, name, token) => {
  const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/verify-email?token=${token}`;

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Verification link for ${to}:\n${url}\n`);
    return;
  }

  await sendEmail({
    to,
    subject: "Verify your Networq Nexus email",
    text:
`Hi ${name},

Please verify your email address to activate your Networq Nexus account.

Verification Link:
${url}

This link expires in 24 hours.

If you did not create an account, you can safely ignore this email.

Regards,
Networq Nexus`,
  });
};

// ── Password reset ─────────────────────────────────────────────────────
const sendPasswordResetEmail = async (to, name, token) => {
  const url = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Password reset link for ${to}:\n${url}\n`);
    return;
  }

  await sendEmail({
    to,
    subject: "Reset your Networq Nexus password",
    text:
`Hi ${name},

We received a request to reset the password for your Networq Nexus account.

Reset Link:
${url}

This link expires in 1 hour.

If you did not request a password reset, you can safely ignore this email. Your password will not change.

Regards,
Networq Nexus`,
  });
};

// ── Contact / help centre ──────────────────────────────────────────────
const sendContactEmail = async ({ name, email, message }) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || "admin@networqnexus.com";

  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV CONTACT] From: ${name} <${email}>\nMessage: ${message}\n`);
    return;
  }

  await sendEmail({
    to: adminEmail,
    subject: `Help Centre Message from ${name}`,
    text:
`New support message received via Networq Nexus Help Centre.

Name    : ${name}
Email   : ${email}

Message:
--------
${message}
--------

Reply directly to: ${email}`,
  });
};

// ── Interview scheduled ────────────────────────────────────────────────
const sendInterviewScheduledEmail = async (to, name, { jobTitle, company, date, time, meetLink }) => {
  const [h, m] = (time || "00:00").split(":");
  const hr = parseInt(h, 10);
  const formattedTime = `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  const formattedDate = new Date(date).toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const todayDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  await sendEmail({
    to,
    subject: `Interview Call Letter — ${jobTitle} at ${company}`,
    text:
`INTERVIEW CALL LETTER
=====================
${company}
${todayDate}

Subject: Invitation for Interview for the Position of ${jobTitle}

Dear ${name},

Thank you for your application for the position of ${jobTitle} at ${company}. We are pleased to inform you that you have been shortlisted for the next phase of our selection process.

INTERVIEW DETAILS
-----------------
Date  : ${formattedDate}
Time  : ${formattedTime}
Mode  : Virtual (Google Meet)
Link  : ${meetLink}

DOCUMENTS TO CARRY
------------------
1. Updated Resume
2. Government-issued ID Proof
3. Educational Certificates (if applicable)
4. Portfolio or work samples (if applicable)

INTERVIEW PROCESS OVERVIEW
--------------------------
The interview will include a brief introduction, a technical discussion related to the role, and a Q&A session. Please be ready 5 minutes before the scheduled time and ensure your camera and microphone are working.

Please confirm your availability by replying to this email at least 24 hours before the interview. If you have any questions or need further clarification, feel free to reach out.

We look forward to meeting you and discussing your potential contribution to our team.

Best regards,
HR Team
${company}
via Networq Nexus`,
  });
};

// ── Org invite ─────────────────────────────────────────────────────────
const sendOrgInviteEmail = async (to, { orgName, inviterName, role, acceptUrl }) => {
  const roleLabel = role === "admin" ? "Admin" : role === "hr" ? "HR Manager" : "Employee";
  if (!isGmailConfigured() && !isResendConfigured()) {
    console.log(`\n[DEV EMAIL] Org Invite for ${to}:\n${acceptUrl}\n`);
    return;
  }
  await sendEmail({
    to,
    subject: `You're invited to join ${orgName} on Networq Nexus`,
    text:
`Hi,

${inviterName} has invited you to join ${orgName} as ${roleLabel} on Networq Nexus.

Click the link below to accept your invitation:
${acceptUrl}

This invitation expires in 7 days.

If you don't have a Networq Nexus account yet, you'll be prompted to create one first.

If you weren't expecting this invitation, you can safely ignore this email.

Regards,
Networq Nexus`,
  });
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendContactEmail,
  sendInterviewScheduledEmail,
  sendOrgInviteEmail,
};
