import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "./Logo";

export function ConfigNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <Logo className="mb-2 h-12 w-12" />
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> Configuration required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            AGRODATA needs a Supabase connection before it can run. Create a{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code> file in the project root
            (copy from <code className="rounded bg-muted px-1 py-0.5">.env.example</code>) and set:
          </p>
          <pre className="overflow-x-auto rounded-md bg-foreground/90 p-3 text-xs text-background">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
          </pre>
          <p>
            Then run the SQL migrations in{" "}
            <code className="rounded bg-muted px-1 py-0.5">supabase/migrations</code> and restart
            the dev server. See <code className="rounded bg-muted px-1 py-0.5">README.md</code> for
            full setup steps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
