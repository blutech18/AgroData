import {
  Sprout,
  ShieldCheck,
  FileText,
  LineChart,
  Code2,
  ListChecks,
  Users,
  GraduationCap,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Logo } from "./Logo";

const features = [
  {
    icon: Sprout,
    title: "Farmer & Crop Registry",
    description: "Profiling, parcel mapping & yield inventory",
  },
  {
    icon: ShieldCheck,
    title: "Data Validation Guard",
    description: "Duplicate prevention & verified records",
  },
  {
    icon: FileText,
    title: "Automated Compliance",
    description: "Municipal & provincial report generation",
  },
  {
    icon: LineChart,
    title: "Analytics & Forecasts",
    description: "Statistical summaries & harvest insights",
  },
];

const stack = [
  "React 18",
  "TypeScript",
  "Tailwind CSS",
  "Supabase",
  "PostgreSQL",
  "Recharts",
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
      <DialogContent className="w-[94vw] sm:max-w-2xl md:max-w-3xl gap-0 overflow-hidden p-0 rounded-2xl border shadow-2xl scrollbar-none [&>button]:text-foreground/70 [&>button]:hover:text-foreground">
        {/* Header Banner */}
        <div className="relative border-b bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-emerald-50 px-7 py-4 dark:from-emerald-950/70 dark:via-emerald-900/30 dark:to-emerald-950/70">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-card dark:ring-border">
              <Logo className="h-8 w-8 object-contain" />
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  AGRODATA
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="border-emerald-600/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
                >
                  v1.0.0
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agricultural Data Management System · Office of the Municipal Agriculturalist · LGU Kinoguitan
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body - Designed to fit comfortably without scrollbars across screen sizes */}
        <div className="space-y-4 px-7 py-5 overflow-hidden scrollbar-none">
          {/* Executive Overview */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">AGRODATA</span> is the centralized digital agricultural management platform built for the{" "}
            <span className="font-medium text-foreground">Office of the Municipal Agriculturalist (OMA)</span> of LGU Kinoguitan, Misamis Oriental, transitioning local agricultural operations into an automated, data-driven system.
          </p>

          {/* Key Capabilities */}
          <div>
            <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Core Capabilities</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 px-3.5 py-2.5 transition-colors hover:border-emerald-500/30"
                >
                  <Icon className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Code2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Technology Architecture</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stack.map((item) => (
                <span
                  key={item}
                  className="rounded-md border border-border/50 bg-secondary/60 px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Proponents & Academic Attribution */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 dark:bg-muted/10">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-semibold text-foreground">Developers:</span>
                <span className="text-muted-foreground">
                  <span className="font-medium text-foreground">Lacang-lacang</span> (Analyst, Tech Writer) ·{" "}
                  <span className="font-medium text-foreground">Villasis</span> (Analyst, Developer)
                </span>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 border-t border-border/40 pt-2 text-xs text-muted-foreground">
              <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Capstone Project Proponents · Liceo de Cagayan University · College of Information Technology</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
