import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🔍 Testing SkillSwap Certification Engine Files...");

const certPath = path.join(__dirname, 'public', 'certificate.html');
const verifyPath = path.join(__dirname, 'public', 'verify.html');

let allPassed = true;

if (fs.existsSync(certPath)) {
    console.log("✓ Success: 'public/certificate.html' found!");
} else {
    console.log("❌ Missing: 'public/certificate.html' nahi mila!");
    allPassed = false;
}

if (fs.existsSync(verifyPath)) {
    console.log("✓ Success: 'public/verify.html' found!");
} else {
    console.log("❌ Missing: 'public/verify.html' nahi mila!");
    allPassed = false;
}

if (allPassed) {
    console.log("\n🚀 Sabhi files ekdum set hain! Ab tum terminal me 'npm run dev' chala kar browser par test kar sakte ho.");
} else {
    console.log("\n⚠️ Kuch files miss ho rahi hain, check kar lo.");
}