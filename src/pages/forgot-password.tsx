import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // 🔥 Added toast hook

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast(); // 🔥 Initialize toast

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.error || "Failed to send reset link");
      }

      setSentEmail(data.email);
      setSent(true);
    } catch (err: any) {
      // 🔥 Now it shows an error if email doesn't exist!
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        <div className="card-premium p-8 space-y-6">
          {!sent ? (
            <>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">Forgot Password?</h1>
                <p className="text-sm text-muted-foreground">No worries! Enter your email and we will send you a reset link.</p>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input {...register("email")} type="email" placeholder="you@example.com" className="pl-10" autoComplete="email" />
                  </div>
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full rounded-full h-11 font-semibold" disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Reset Link"}
                </Button>
              </form>
              <p className="text-center text-xs text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Check your email!</h2>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to<br />
                <span className="font-semibold text-foreground">{sentEmail}</span>
              </p>
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground text-left space-y-1">
                <p className="font-medium text-foreground mb-2">Next steps:</p>
                <p>1. Check your inbox (and spam folder)</p>
                <p>2. Click the reset link in the email</p>
                <p>3. Create your new password</p>
                <p>4. Link expires in 15 minutes</p>
              </div>
              <Button variant="outline" className="w-full rounded-full" onClick={() => setSent(false)}>
                Try a different email
              </Button>
              <Button className="w-full rounded-full" onClick={() => setLocation("/login")}>
                Back to Login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}