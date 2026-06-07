import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    if (!process.env.SMTP_USER) {
      console.warn("⚠️ SMTP_USER is missing in .env, skipping email to:", to);
      return;
    }
    const info = await transporter.sendMail({
      from: `"SkillSwap Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}
