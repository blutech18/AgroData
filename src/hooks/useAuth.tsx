import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/types/database";

interface AuthContextValue {
  session: Session | null;
  profile: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<AppUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async (authId: string) => {
    const { data } = await supabase
      .from("users")
      .select("*, user_roles(*)")
      .eq("auth_id", authId)
      .maybeSingle();
    setProfile((data as AppUser) ?? null);
  }, []);

  React.useEffect(() => {
    let active = true;

    // Safety net: never leave the app stuck on the loading screen.
    const failSafe = setTimeout(() => {
      if (active) setLoading(false);
    }, 8000);

    // Initial session read (getSession has already released its auth lock by
    // the time this resolves, so loading the profile here is safe).
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user.id).catch(() => setProfile(null));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // IMPORTANT: do NOT await Supabase calls directly inside this callback.
    // It runs while Supabase holds an internal auth lock; awaiting another
    // Supabase request here deadlocks the client. Defer with setTimeout(0).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      setLoading(false);
      if (newSession?.user) {
        const uid = newSession.user.id;
        setTimeout(() => {
          if (active) loadProfile(uid).catch(() => setProfile(null));
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      clearTimeout(failSafe);
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value: AuthContextValue = {
    session,
    profile,
    loading,
    isAdmin: profile?.user_roles?.role_name === "Municipal Agriculturalist",
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
