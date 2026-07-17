import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { navSections } from "./nav";

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const { isAdmin } = useAuth();

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden border-r transition-[width] duration-300 ease-in-out",
        "bg-gradient-to-b from-emerald-50 via-emerald-100 to-emerald-200 dark:from-emerald-950 dark:via-emerald-900 dark:to-emerald-950",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center gap-2.5 border-b px-3.5">
        <Logo className="h-9 w-9" />
        <div
          className={cn(
            "leading-tight transition-opacity duration-200",
            collapsed && "pointer-events-none w-0 opacity-0"
          )}
        >
          <p className="whitespace-nowrap text-lg font-bold tracking-tight">AGRODATA</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4">
        {navSections.map((section, index) => {
          const items = section.items.filter((i) => !i.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={section.title}>
              <div
                className={cn(
                  "mb-2 flex h-4 items-center",
                  collapsed ? "justify-center px-0" : "px-3"
                )}
              >
                {!collapsed ? (
                  <span className="truncate text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                    {section.title}
                  </span>
                ) : index > 0 ? (
                  <span className="h-px w-8 bg-border" />
                ) : null}
              </div>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span
                      className={cn(
                        "whitespace-nowrap",
                        collapsed
                          ? "hidden"
                          : "animate-in fade-in slide-in-from-left-3 duration-300"
                      )}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
