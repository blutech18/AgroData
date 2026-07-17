import {
  Sprout,
  ShieldCheck,
  FileText,
  LineChart,
  Code2,
  ListChecks,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Logo } from "./Logo";

const features = [
  { icon: Sprout, text: "Farmer profiling and crop yield inventory" },
  { icon: ShieldCheck, text: "Data validation and duplicate prevention" },
  { icon: FileText, text: "Automated municipal & provincial compliance reports" },
  { icon: LineChart, text: "Analytics dashboard, yield trends, and production forecasts" },
];

const stack = ["React + Vite", "TypeScript", "Tailwind CSS", "Supabase / PostgreSQL"];
const developers = [
  { name: "Lacang-lacang", roles: ["Analyst", "Technical Writer"] },
  { name: "Villasis", roles: ["Analyst", "Developer"] },
];

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-5xl gap-0 overflow-hidden p-0 sm:w-full [&>button]:text-foreground/70 [&>button]:hover:text-foreground">
        {/* Banner — adapts to light/dark */}
        <div className="relative flex items-center gap-4 border-b bg-gradient-to-r from-emerald-100 via-emerald-50 to-emerald-100 dark:from-emerald-900/60 dark:via-emerald-950 dark:to-emerald-900/60 px-6 py-5">
          {/* Logo in a white circle so it renders correctly on any background */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5">
            <Logo className="h-10 w-10" />
          </div>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              AGRODATA
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Agricultural Data Management System
            </p>
          </div>
          <Badge
            variant="secondary"
            className="absolute right-12 top-5 shrink-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          >
            v1.0.0
          </Badge>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* About */}
          <p className="text-justify text-sm leading-relaxed text-muted-foreground">
            AGRODATA is a web-based agricultural data management system built for the{" "}
            <span className="font-semibold text-foreground">
              Office of the Municipal Agriculturalist (OMA)
            </span>{" "}
            of LGU Kinoguitan, Misamis Oriental. It replaces manual, paper-based record
            keeping with a centralized digital platform for managing farmer profiles, land
            use, and crop production — with automated reporting and data-driven analytics
            to support evidence-based agricultural planning.
          </p>

          <div className="border-t" />

          {/* Key features */}
          <div>
            <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Key Features
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {features.map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-2.5 dark:bg-muted/20"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm leading-snug text-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Tech stack */}
          <div className="text-center">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Code2 className="h-3.5 w-3.5" /> Technology
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {stack.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>

          <div className="border-t" />

          {/* Developer credit */}
          <div className="text-center">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Developer
            </p>
            <div className="mx-auto grid max-w-2xl gap-2.5 sm:grid-cols-2">
              {developers.map((dev) => (
                <div
                  key={dev.name}
                  className="rounded-lg border bg-muted/40 p-3 text-center dark:bg-muted/20"
                >
                  <p className="font-semibold text-foreground">{dev.name}</p>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                    {dev.roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Capstone Project Proponents</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Liceo de Cagayan University · College of Information Technology
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
