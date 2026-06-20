import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Loader2, KeyRound } from "lucide-react";

export default function ResetPassword() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const email = new URLSearchParams(search).get("email") || "";
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
        <div className="space-y-3">
          <p className="text-muted-foreground">No email found. Please request a reset OTP again.</p>
          <Link href="/forgot-password" className="text-primary font-semibold hover:underline">Forgot Password</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Invalid OTP", description: "Enter the 6-digit code from your email." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Password too short", description: "Must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords don't match", description: "Please re-enter your password." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      toast({ title: "Password reset! 🎉", description: "You can now login with your new password." });
      setLocation("/login");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/forgot-password" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="card-premium p-8 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              Enter the OTP sent to<br />
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">OTP</label>
            <Input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className="text-center text-xl font-mono tracking-[0.3em] h-12"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={loading} className="w-full rounded-full h-11 font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}