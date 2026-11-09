
require("dotenv").config();

const crypto = require("crypto");

const key = process.env.RAZORPAY_KEY_ID?.trim();
const secret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!key || !secret) {
  console.log("Credentials missing");
  process.exit(1);
}

console.log({
  keyPrefix: key.slice(0, 9),
  keyLength: key.length,
  secretLength: secret.length,

  // Local fingerprint for private comparison.
  // Never share this fingerprint publicly.
  keyFingerprint: crypto
    .createHash("sha256")
    .update(key)
    .digest("hex")
    .slice(0, 12),

  secretFingerprint: crypto
    .createHash("sha256")
    .update(secret)
    .digest("hex")
    .slice(0, 12),
});

