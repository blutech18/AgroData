import * as React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/audit";
import { clearAttempts, getLockRemaining, registerFailure } from "@/lib/loginGuard";
import { ModeToggle } from "@/components/mode-toggle";

type Mode = "login" | "forgot";

export default function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);
  const [lockRemaining, setLockRemaining] = React.useState(0);

  // Tick the lockout countdown every second when locked.
  React.useEffect(() => {
    if (lockRemaining <= 0) return;
    const t = setInterval(() => {
      setLockRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lockRemaining]);

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const existingLock = getLockRemaining(email);
    if (existingLock > 0) {
      setLockRemaining(existingLock);
      setError(`Too many failed attempts. Try again in ${Math.ceil(existingLock / 60000)} minute(s).`);
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    if (signInError) {
      const { remaining, lockMs } = registerFailure(email);
      if (lockMs > 0) {
        setLockRemaining(lockMs);
        setError(
          `Account temporarily locked after 3 failed attempts. Try again in ${Math.ceil(
            lockMs / 60000
          )} minute(s), or reset your password.`
        );
      } else {
        setError(`${signInError}. ${remaining} attempt(s) remaining before temporary lock.`);
      }
      setSubmitting(false);
      return;
    }

    clearAttempts(email);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: profile } = await supabase
        .from("users")
        .select("user_id")
        .eq("auth_id", data.user.id)
        .maybeSingle();
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "LOGIN",
        details: `Successful login for ${email}`,
      });
    }
    navigate("/", { replace: true });
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setResetSent(true);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setResetSent(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-emerald-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="mb-3 h-20 w-20" />
          <h1 className="text-2xl font-bold tracking-tight">AGRODATA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agricultural Data Management System
            <br />
            Office of the Municipal Agriculturalist · LGU Kinoguitan
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {mode === "login" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="staff@kinoguitan.gov.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={submitting || lockRemaining > 0}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {lockRemaining > 0
                    ? `Locked · ${Math.ceil(lockRemaining / 1000)}s`
                    : submitting
                    ? "Signing in…"
                    : "Sign in"}
                </Button>
              </form>
            ) : resetSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <MailCheck className="h-10 w-10 text-emerald-600" />
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">
                  If an account exists for <span className="font-medium">{email}</span>, a password
                  reset link has been sent.
                </p>
                <Button variant="outline" className="mt-2" onClick={() => switchMode("login")}>
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter your account email and we'll send you a link to reset your password.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="username"
                    placeholder="staff@kinoguitan.gov.ph"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending…" : "Send reset link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => switchMode("login")}
                >
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Authorized OMA personnel only. All activity is logged.
        </p>
      </div>

      {/* Floating dark/light toggle */}
      <div className="fixed bottom-5 right-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/80 shadow-lg ring-1 ring-border backdrop-blur-sm">
          <ModeToggle />
        </div>
      </div>
    </div>
  );
}
