import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string) {
  try {
    const user = process.env.EMAIL_USER || process.env.SMTP_USER;
    if (!user) {
      console.warn("EMAIL_USER missing, skipping email to:", to);
      return;
    }
    const info = await transporter.sendMail({
      from: `"SkillSwap" <${user}>`,
      to, subject, text,
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
  } catch (error: any) {
    console.error("Email error:", error.message);
  }
}