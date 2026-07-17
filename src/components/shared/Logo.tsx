import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/logo.svg"
      alt="Department of Agriculture logo"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
