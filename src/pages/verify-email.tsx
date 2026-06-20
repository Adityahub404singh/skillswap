import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { Preferences } from "@capacitor/preferences";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) setEmail(emailParam);

    timerRef.current = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleVerify = async () => {
    if (!email) {
      setStatus("error");
      setMessage("No email found. Please register or login again.");
      return;
    }
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Enter the 6-digit code from your email." });
      return;
    }

    setStatus("verifying");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Verification failed.");
        return;
      }

      // Store token so user lands logged-in
      await Preferences.set({ key: "skillswap_token", value: data.token });
      localStorage.setItem("skillswap_token", data.token);
      setToken(data.token);

      setStatus("success");
      setMessage(data.message || "Email verified successfully!");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend OTP");
      toast({ title: "OTP resent!", description: "Check your email." });
      setCooldown(60);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-card"
      >
        {status === "idle" && (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black">Verify your email</h2>
            <p className="text-muted-foreground">
              {email
                ? <>We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span></>
                : "Enter your email and the OTP we sent you."}
            </p>

            {!new URLSearchParams(window.location.search).get("email") && (
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            )}

            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-[0.3em] h-14"
            />

            <Button onClick={handleVerify} className="w-full rounded-full h-12 font-bold">
              Verify Email
            </Button>

            <div className="text-sm text-muted-foreground">
              Didn't get the code?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          </>
        )}

        {status === "verifying" && (
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
            <Button variant="outline" className="w-full rounded-full h-12" onClick={() => setStatus("idle")}>
              Try Again
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full rounded-full h-10 text-sm">Back to Login</Button>
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}