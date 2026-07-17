import * as React from "react";
import { LogOut, Menu, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AboutDialog } from "@/components/shared/AboutDialog";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile, signOut } = useAuth();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [aboutOpen, setAboutOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await logActivity({ userId: profile?.user_id ?? null, action: "LOGOUT" });
    await signOut();
  };

  const initials =
    profile && `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-200 px-4 lg:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>

        <h1 className="hidden text-sm font-medium text-foreground lg:block">
          Office of the Municipal Agriculturalist, Kinoguitan, Misamis Oriental Agricultural Data Management System
        </h1>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setAboutOpen(true)}
          title="About this system"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">About this system</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">
            {profile ? `${profile.first_name} ${profile.last_name}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.user_roles?.role_name ?? "OMA User"}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials || "?"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => !o && setConfirmOpen(false)}
        title="Sign out?"
        description="You will be returned to the login screen."
        confirmLabel="Sign out"
        loading={signingOut}
        onConfirm={handleSignOut}
      />

      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </header>
  );
}
