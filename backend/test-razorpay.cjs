
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const envPath = path.resolve(__dirname, ".env");

// Read .env values
const fileEnv = dotenv.parse(fs.readFileSync(envPath));

// Load .env without overriding existing environment variables
dotenv.config({ path: envPath });

const currentKey = process.env.RAZORPAY_KEY_ID?.trim();
const currentSecret = process.env.RAZORPAY_KEY_SECRET?.trim();

const fileKey = fileEnv.RAZORPAY_KEY_ID?.trim();
const fileSecret = fileEnv.RAZORPAY_KEY_SECRET?.trim();

console.log("========== ENV SOURCE CHECK ==========");

console.log({
  envFileExists: fs.existsSync(envPath),
  keyExistsInFile: Boolean(fileKey),
  secretExistsInFile: Boolean(fileSecret),
  keyLoaded: Boolean(currentKey),
  secretLoaded: Boolean(currentSecret),
  keyMatchesFile: currentKey === fileKey,
  secretMatchesFile: currentSecret === fileSecret,
});
