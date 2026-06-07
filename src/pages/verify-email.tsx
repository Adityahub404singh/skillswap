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