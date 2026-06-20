// backend/src/lib/mailer.ts
// Gmail SMTP via Nodemailer
// npm install nodemailer @types/nodemailer

import nodemailer from "nodemailer";

// ─────────────────────────────────────────
// Gmail transporter — App Password use karo
// Normal Gmail password kaam nahi karta
// Google Account → Security → App Passwords
// .env mein variable names: EMAIL_USER, EMAIL_PASS (GMAIL_USER nahi!)
// ─────────────────────────────────────────
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // 16-digit App Password
  },
});

// Generate 6-digit OTP
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email
export async function sendVerificationEmail(
  toEmail: string,
  userName: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your SkillSwap account — OTP inside",
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">
              Skill<span style="opacity: 0.8;">Swap</span>
            </h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">
              Learn anything. Teach everything.
            </p>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #1a1a2e; margin: 0 0 8px;">Hey ${userName}! 👋</h2>
            <p style="color: #666; line-height: 1.6; margin: 0 0 24px;">
              Welcome to SkillSwap! Use this OTP to verify your email address.
              This code expires in <strong>10 minutes</strong>.
            </p>
            <div style="background: #f8f7ff; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
              <p style="color: #666; margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">
                Your Verification Code
              </p>
              <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #6366f1; font-family: monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #999; font-size: 13px; margin: 0;">
              ⚠️ Never share this OTP with anyone. SkillSwap team will never ask for it.
              If you didn't register, ignore this email.
            </p>
          </div>
          <div style="background: #f8f8f8; padding: 16px 32px; text-align: center;">
            <p style="color: #bbb; font-size: 12px; margin: 0;">
              © 2026 SkillSwap · Made with ❤️ in India
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  otp: string
): Promise<void> {
  await transporter.sendMail({
    from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Reset your SkillSwap password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #6366f1;">Password Reset — SkillSwap</h2>
        <p>Hey ${userName}, use this OTP to reset your password. Expires in <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #6366f1; 
                    background: #f8f7ff; border-radius: 8px; padding: 16px; text-align: center; 
                    font-family: monospace; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #999; font-size: 13px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  });
}