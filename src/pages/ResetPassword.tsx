import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/shared/Logo";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    // The recovery link establishes a session; confirm we have one.
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login", { replace: true }), 2500);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100/90 via-emerald-50/50 to-emerald-200/70 p-4 dark:from-emerald-950 dark:via-[#072418] dark:to-emerald-950">
      {/* Ambient glowing orbs for visible depth and smoothness */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-400/25 blur-[110px] dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute -top-24 -left-20 h-[380px] w-[480px] rounded-full bg-teal-200/50 blur-[90px] dark:bg-emerald-700/25" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-[420px] w-[520px] rounded-full bg-emerald-300/40 blur-[100px] dark:bg-emerald-600/20" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo className="mb-3 h-16 w-16" />
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">AGRODATA account recovery</p>
        </div>

        <Card className="border-border/60 bg-card/95 shadow-xl backdrop-blur-sm dark:bg-card/90">
          <CardContent className="pt-6">
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                <p className="font-medium">Password updated</p>
                <p className="text-sm text-muted-foreground">Redirecting you to the login page…</p>
              </div>
            ) : !ready ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Open this page from the password reset link sent to your email. If you arrived here
                directly, request a new link from the login page.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive dark:text-red-400" />
                    <p className="leading-relaxed">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Updating…" : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
