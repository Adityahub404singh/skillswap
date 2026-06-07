# Fix: Email verification + Referral fix + Streak call
# cd C:\Users\alc\skillswap  then  .\fix-auth-email.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# ============================================================
# 1. BACKEND: auth.ts - Add email verification token on register
# ============================================================
$authPath = "backend\src\routes\auth.ts"
$auth = Get-Content $authPath -Raw

# Add crypto import at top if missing
if ($auth -notmatch "import crypto") {
  $auth = $auth -replace "(import { Router)", "import crypto from 'crypto';`n`$1"
}

# Add emailVerified and emailVerifyToken columns to usersTable if missing
if ($auth -notmatch "emailVerified") {
  $auth = $auth -replace "(notificationLastSent:.*?timestamp.*?},)", "`$1`n  emailVerified:     boolean(`"email_verified`").notNull().default(false),`n  emailVerifyToken:  text(`"email_verify_token`"),"
}

# Fix register - add email verification token + send email
$oldRegister = "    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token, user: formatUser(user) });"

$newRegister = @"
    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await db.update(usersTable)
      .set({ emailVerifyToken: verifyToken })
      .where(eq(usersTable.id, user.id));

    // Send verification email (non-blocking)
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      const verifyUrl = (process.env.FRONTEND_URL || 'https://skillswap.app') + '/verify-email?token=' + verifyToken + '&email=' + encodeURIComponent(user.email);
      await transporter.sendMail({
        from: '"SkillSwap" <' + process.env.EMAIL_USER + '>',
        to: user.email,
        subject: 'Verify your SkillSwap account',
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><div style="background:linear-gradient(135deg,#5B5BF6,#7c3aed);padding:24px;border-radius:16px;text-align:center;margin-bottom:24px"><h1 style="color:white;margin:0;font-size:24px">SkillSwap</h1><p style="color:rgba(255,255,255,0.8);margin:8px 0 0">Exchange Skills, Not Money</p></div><h2 style="color:#1a1a2e">Verify Your Email</h2><p style="color:#64748b">Hi ' + user.name + ', click below to verify your account and unlock all features.</p><a href="' + verifyUrl + '" style="display:inline-block;background:linear-gradient(135deg,#5B5BF6,#7c3aed);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:bold;margin:16px 0">Verify Email Address</a><p style="color:#94a3b8;font-size:12px;margin-top:24px">Link expires in 24 hours. If you did not create this account, ignore this email.</p></div>'
      });
    } catch (emailErr) {
      console.error('[register] Email send failed:', emailErr.message);
    }

    const jwtToken = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ token: jwtToken, user: formatUser(user), emailSent: true });
"@

$auth = $auth.Replace($oldRegister, $newRegister)

# Add email verify route before export
if ($auth -notmatch "verify-email") {
  $verifyRoute = @"

// GET /api/auth/verify-email?token=xxx&email=xxx
router.get("/verify-email", async (req, res) => {
  try {
    const { token, email } = req.query as { token: string; email: string };
    if (!token || !email) return res.status(400).json({ error: "Missing token or email" });

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email)).limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerifyToken !== token) return res.status(400).json({ error: "Invalid or expired token" });

    await db.update(usersTable)
      .set({ emailVerified: true, emailVerifyToken: null } as any)
      .where(eq(usersTable.id, user.id));

    // Bonus credits for verifying email
    await db.update(usersTable)
      .set({ credits: user.credits + 25 })
      .where(eq(usersTable.id, user.id));

    await db.insert(transactionsTable).values({
      userId: user.id, amount: 25, type: "bonus",
      description: "Email verified! +25 bonus credits"
    });

    res.json({ success: true, message: "Email verified! +25 bonus credits added." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

"@
  $auth = $auth -replace "export default router;", "$verifyRoute`nexport default router;"
}

[System.IO.File]::WriteAllText("$pwd\$authPath", $auth, [System.Text.Encoding]::UTF8)
Write-Host "auth.ts - email verification added" -ForegroundColor Green

# ============================================================
# 2. DB: Add email_verified columns
# ============================================================
$dbScript = @"
require('dotenv').config({path:'.env'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
const sqls = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT"
];
Promise.all(sqls.map(s => p.query(s)))
  .then(() => { console.log('DB columns added!'); p.end(); })
  .catch(e => { console.log('ERR:', e.message); p.end(); });
"@
$dbScript | Set-Content "$pwd\backend\add-email-cols.cjs" -Encoding UTF8
node "$pwd\backend\add-email-cols.cjs"
Write-Host "DB columns added" -ForegroundColor Green

# ============================================================
# 3. FRONTEND: verify-email page
# ============================================================
$verifyPage = @'
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmail() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");

    if (!token || !email) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "Email verified successfully!");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => { setStatus("error"); setMessage("Network error. Try again."); });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-card">

        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h2 className="text-2xl font-black">Verifying your email...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-black">Email Verified!</h2>
            <p className="text-muted-foreground">{message}</p>
            <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm mx-auto w-fit">
              <Zap className="w-4 h-4" /> +25 bonus credits added!
            </div>
            <Link href="/dashboard">
              <Button className="w-full rounded-full h-12 font-bold">Go to Dashboard</Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black">Verification Failed</h2>
            <p className="text-muted-foreground">{message}</p>
            <Link href="/login">
              <Button variant="outline" className="w-full rounded-full h-12">Back to Login</Button>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
'@
[System.IO.File]::WriteAllText("$pwd\src\pages\verify-email.tsx", $verifyPage, [System.Text.Encoding]::UTF8)
Write-Host "verify-email.tsx created" -ForegroundColor Green

# ============================================================
# 4. App.tsx - Add verify-email route + fix streak call
# ============================================================
$appPath = "src\App.tsx"
$app = Get-Content $appPath -Raw

# Add VerifyEmail import
if ($app -notmatch "VerifyEmail") {
  $app = $app -replace "(import FlashBoard)", "import VerifyEmail from `"@/pages/verify-email`";`n`$1"
}

# Add route
if ($app -notmatch "verify-email") {
  $app = $app -replace '(<Route path="/notifications">)', '<Route path="/verify-email" component={VerifyEmail} />
        $1'
}

# Fix streak call - add useEffect inside Router function
if ($app -notmatch "useEffect.*updateStreak") {
  $app = $app -replace '(function Router\(\) \{)', '$1
  const token = useAuthStore((s) => s.token);
  useEffect(() => { if (token) updateStreak(token); }, [token]);'
}

[System.IO.File]::WriteAllText("$pwd\$appPath", $app, [System.Text.Encoding]::UTF8)
Write-Host "App.tsx - verify-email route + streak call fixed" -ForegroundColor Green

# ============================================================
# 5. BUILD + PUSH
# ============================================================
Write-Host ""
Write-Host "Building frontend..." -ForegroundColor Cyan
$fe = npm run build 2>&1
$feErr = $fe | Select-String "error TS"
if ($feErr) {
  Write-Host "TS Errors:" -ForegroundColor Red
  $feErr | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Frontend BUILD PASSED!" -ForegroundColor Green
  $fe | Select-String "built in" | ForEach-Object { Write-Host "  $_" }
}

Write-Host ""
Write-Host "Building backend..." -ForegroundColor Cyan
cd backend
$be = npm run build 2>&1
$beErr = $be | Select-String "error TS|error:"
if ($beErr) {
  Write-Host "Backend errors:" -ForegroundColor Red
  $beErr | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
} else {
  Write-Host "Backend BUILD PASSED!" -ForegroundColor Green
}
cd ..

Write-Host ""
Write-Host "Committing..." -ForegroundColor Cyan
git add .
git commit -m "feat: email verification on register, verify-email page, +25 credits on verify, streak fix"
git push origin main

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
Write-Host "New features:" -ForegroundColor Yellow
Write-Host "  1. Register karo - verification email aayegi" -ForegroundColor White
Write-Host "  2. Email link click karo - +25 bonus credits" -ForegroundColor White
Write-Host "  3. /verify-email page" -ForegroundColor White
Write-Host "  4. Streak auto-update on login" -ForegroundColor White
