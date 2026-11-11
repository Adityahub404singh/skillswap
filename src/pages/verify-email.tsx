import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store/auth";
import { Preferences } from "@capacitor/preferences";

type VerificationStatus = "idle" | "verifying" | "success" | "error";

type ApiResponse = {
  success?: boolean;
  token?: string;
  message?: string;
  error?: string;
};

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

async function readApiResponse(response: Response): Promise<ApiResponse> {
  try {
    return (await response.json()) as ApiResponse;
  } catch {
    return {};
  }
}

export default function VerifyEmail() {
  const { setToken } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [emailFromUrl, setEmailFromUrl] = useState(false);
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  // Read the email once from the URL and run a clean, cancellable countdown.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email")?.trim();

    if (emailParam) {
      setEmail(emailParam);
      setEmailFromUrl(true);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail) {
      setStatus("error");
      setMessage("Please enter your email address.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Enter the 6-digit code sent to your email.",
      });
      return;
    }

    setStatus("verifying");
    setMessage("");

    try {
      const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          otp: normalizedOtp,
        }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || data.message || "Email verification failed. Please try again.");
        return;
      }

      if (!data.token) {
        setStatus("error");
        setMessage(
          "Your email was verified, but the server did not return a login token. Please sign in."
        );
        return;
      }

      // Keep the token in both Capacitor Preferences and web storage.
      await Preferences.set({ key: "skillswap_token", value: data.token });
      localStorage.setItem("skillswap_token", data.token);
      setToken(data.token);

      setStatus("success");
      setMessage(data.message || "Your email has been verified successfully.");
      toast({
        title: "Email verified",
        description: "Your account is ready to use.",
      });
    } catch {
      setStatus("error");
      setMessage(
        "We couldn't complete the request. Check your internet connection and try again."
      );
    }
  };

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || resending || cooldown > 0) return;

    setResending(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await readApiResponse(response);

      if (!response.ok || data.success === false) {
        throw new Error(data.error || data.message || "Could not resend the verification code.");
      }

      toast({
        title: "OTP sent",
        description: "Check your inbox and spam folder.",
      });
      setCooldown(60);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't resend OTP",
        description:
          error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-md w-full text-center space-y-6 p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm"
      >
        {status === "idle" && (
          <>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black">Verify your email</h2>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code we sent to your email address.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              {!emailFromUrl && (
                <div className="space-y-2 text-left">
                  <label htmlFor="verification-email" className="text-sm font-semibold">
                    Email address
                  </label>
                  <Input
                    id="verification-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12"
                    required
                  />
                </div>
              )}

              {emailFromUrl && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 px-3 py-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold break-all">{email}</span>
                </div>
              )}

              <div className="space-y-2 text-left">
                <label htmlFor="verification-otp" className="text-sm font-semibold">
                  6-digit verification code
                </label>
                <Input
                  id="verification-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  className="h-14 text-center text-2xl font-mono tracking-[0.3em]"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={otp.length !== 6 || !email.trim()}
                className="w-full rounded-full h-12 font-bold"
              >
                Verify Email
              </Button>
            </form>

            <div className="text-sm text-muted-foreground">
              Didn't receive the code?{" "}
              {cooldown > 0 ? (
                <span>Resend in {cooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !email.trim()}
                  className="text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          </>
        )}

        {status === "verifying" && (
          <div className="py-8 space-y-4">
            <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
            <h2 className="text-2xl font-black">Verifying your email...</h2>
            <p className="text-sm text-muted-foreground">
              Please keep this page open for a moment.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Email Verified!</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <Link href="/dashboard">
              <Button className="w-full rounded-full h-12 font-bold">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Verification Failed</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full h-12"
              onClick={() => {
                setStatus("idle");
                setMessage("");
              }}
            >
              Try Again
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full rounded-full h-10 text-sm">
                Back to Login
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
