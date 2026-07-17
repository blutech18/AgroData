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
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 [&>button]:text-foreground/70 [&>button]:hover:text-foreground">
        {/* Banner header */}
        <div className="relative flex items-center gap-4 border-b bg-gradient-to-r from-emerald-50 via-emerald-100 to-emerald-200 px-6 py-5">
          <Logo className="h-12 w-12 shrink-0" />
          <div className="min-w-0">
            <DialogTitle className="text-lg font-bold tracking-tight">AGRODATA</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Agricultural Data Management System
            </p>
          </div>
          {/* Sits directly below the dialog's corner close (X) button */}
          <Badge variant="secondary" className="absolute right-4 top-11 shrink-0">
            v1.0.0
          </Badge>
        </div>

        <div className="px-6 py-4">
          {/* About */}
          <p className="text-justify text-sm leading-relaxed text-muted-foreground">
            AGRODATA is a web-based agricultural data management system built for the{" "}
            <span className="font-medium text-foreground">
              Office of the Municipal Agriculturalist (OMA)
            </span>{" "}
            of LGU Kinoguitan, Misamis Oriental. It replaces manual, paper-based record
            keeping with a centralized digital platform for managing farmer profiles, land
            use, and crop production — with automated reporting and data-driven analytics
            to support evidence-based agricultural planning.
          </p>

          <div className="my-4 border-t" />

          {/* Key features */}
          <div className="text-center">
            <p className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Key Features
            </p>
            <div className="grid gap-2.5 text-left sm:grid-cols-2">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 rounded-lg border p-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm leading-snug">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="my-4 border-t" />

          {/* Tech stack */}
          <div className="text-center">
            <p className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

          <div className="my-4 border-t" />

          {/* Developer credit */}
          <div className="text-center">
            <p className="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Developer
            </p>
            <div className="mx-auto grid max-w-2xl gap-2.5 sm:grid-cols-2">
              {developers.map((dev) => (
                <div key={dev.name} className="rounded-lg border p-3 text-center">
                  <p className="font-semibold">{dev.name}</p>
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
            <p className="mt-3 text-xs text-muted-foreground">Capstone Project Proponents</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Liceo de Cagayan University · College of Information Technology
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
