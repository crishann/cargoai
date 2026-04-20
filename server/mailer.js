const nodemailer = require("nodemailer");

const {
  GMAIL_USER = "",
  GMAIL_APP_PASSWORD = "",
  APP_BASE_URL = "http://localhost:5173",
} = process.env;

let transporter;

function isMailConfigured() {
  return Boolean(GMAIL_USER && GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!isMailConfigured()) {
    throw new Error("Email transport is not configured");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }

  return transporter;
}

async function sendVerificationEmail({ email, username, token }) {
  const verifyUrl = `${APP_BASE_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

  await getTransporter().sendMail({
    from: `"CarGoAI" <${GMAIL_USER}>`,
    to: email,
    subject: "Verify your CarGoAI account",
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Verify your email</h2>
        <p>Hello ${escapeHtml(username || "there")},</p>
        <p>Finish creating your CarGoAI account by verifying your email address.</p>
        <p style="margin: 24px 0;">
          <a
            href="${verifyUrl}"
            style="display: inline-block; padding: 12px 20px; border-radius: 10px; background: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 600;"
          >
            Verify Email
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({ email, username, token }) {
  const resetUrl = `${APP_BASE_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  await getTransporter().sendMail({
    from: `"CarGoAI" <${GMAIL_USER}>`,
    to: email,
    subject: "Reset your CarGoAI password",
    html: `
      <div style="margin:0; padding:32px 16px; background:#eff4ff; font-family:Arial, sans-serif; color:#0f172a;">
        <div style="max-width:640px; margin:0 auto;">
          <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
            Reset your CarGoAI password securely. This link expires in 1 hour.
          </div>

          <div style="text-align:center; margin-bottom:18px;">
            <div style="display:inline-block; padding:10px 16px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
              CarGoAI Security
            </div>
          </div>

          <div style="background:#ffffff; border:1px solid #dbe4f0; border-radius:24px; box-shadow:0 18px 45px rgba(15,23,42,0.10); overflow:hidden;">
            <div style="padding:32px 32px 18px; background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%); color:#ffffff;">
              <div style="font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; opacity:0.85;">
                Password Reset
              </div>
              <h1 style="margin:10px 0 0; font-size:30px; line-height:1.2; font-weight:700;">
                Reset your password
              </h1>
              <p style="margin:12px 0 0; font-size:15px; line-height:1.7; color:rgba(255,255,255,0.88);">
                A reset request was received for your CarGoAI account.
              </p>
            </div>

            <div style="padding:28px 32px 32px;">
              <p style="margin:0 0 14px; font-size:16px; line-height:1.7;">
                Hello ${escapeHtml(username || "there")},
              </p>
              <p style="margin:0 0 22px; font-size:15px; line-height:1.8; color:#475569;">
                Use the button below to set a new password. For security, this link will expire in <strong>1 hour</strong>.
              </p>

              <div style="margin:0 0 24px;">
                <a
                  href="${resetUrl}"
                  style="display:inline-block; padding:14px 22px; border-radius:14px; background:#1d4ed8; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; box-shadow:0 12px 24px rgba(29,78,216,0.22);"
                >
                  Reset Password
                </a>
              </div>

              <div style="margin:0 0 24px; padding:16px 18px; border:1px solid #e2e8f0; border-radius:16px; background:#f8fafc;">
                <p style="margin:0 0 8px; font-size:13px; font-weight:700; color:#334155;">
                  Didn’t request this?
                </p>
                <p style="margin:0; font-size:14px; line-height:1.7; color:#64748b;">
                  You can safely ignore this email if you did not ask to reset your password.
                </p>
              </div>

              <p style="margin:0 0 10px; font-size:13px; font-weight:700; color:#334155;">
                Button not working?
              </p>
              <div style="padding:14px 16px; border-radius:16px; background:#0f172a; color:#e2e8f0; font-size:13px; line-height:1.7; word-break:break-all;">
                <a href="${resetUrl}" style="color:#93c5fd; text-decoration:underline;">${resetUrl}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { isMailConfigured, sendVerificationEmail, sendPasswordResetEmail };
