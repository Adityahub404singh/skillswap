import nodemailer from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

// 1. Sahi path set karo taaki .env file mil jaye
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 2. Debugging: Check karo ki variables load huye ya nahi
console.log("--- Debugging ---");
console.log("Email User found:", process.env.EMAIL_USER ? "YES" : "NO");
console.log("Email Pass found:", process.env.EMAIL_PASS ? "YES" : "NO");

// 3. Validation: Agar missing hai toh script ruk jayegi
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ ERROR: EMAIL_USER ya EMAIL_PASS .env file mein nahi mil raha!");
  process.exit(1); // Stop the script
}

// 4. Transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testEmail() {
  try {
    console.log("Testing email connection...");
    await transporter.verify();
    console.log("✅ Server is ready to send emails!");
    
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Khud ko test email
      subject: "Test Email from SkillSwap",
      text: "Agar ye email aa gaya, to tumhara email system set hai!",
    });
    console.log("📧 Test email sent successfully!");
  } catch (error) {
    console.error("❌ Email Error (Details):", error);
  }
}

testEmail();