import * as React from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DateFilterInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Format YYYY-MM-DD to a readable date without timezone-shift bugs */
export function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return iso;
}

export const DateFilterInput = React.forwardRef<HTMLInputElement, DateFilterInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "Date",
      className,
      min,
      max,
      id,
      disabled,
      ...props
    },
    forwardedRef
  ) => {
    const hiddenDateInputRef = React.useRef<HTMLInputElement | null>(null);
    const visibleInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(forwardedRef, () => hiddenDateInputRef.current as HTMLInputElement);

    const openPicker = () => {
      if (disabled) return;
      const input = hiddenDateInputRef.current;
      if (!input) return;

      try {
        if (typeof input.showPicker === "function") {
          input.showPicker();
          return;
        }
      } catch {
        // Fallback for environments where showPicker is restricted
      }
      input.focus();
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onChange("");
      visibleInputRef.current?.focus();
    };

    const displayValue = value ? formatDisplayDate(value) : "";

    return (
      <div
        className={cn(
          "relative flex h-10 w-full min-w-[130px] items-center rounded-md border border-input bg-background text-sm ring-offset-background",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <input
          ref={visibleInputRef}
          id={id}
          type="text"
          readOnly
          disabled={disabled}
          value={displayValue}
          placeholder={placeholder}
          aria-label={props["aria-label"] || placeholder}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            } else if ((e.key === "Backspace" || e.key === "Delete") && value) {
              e.preventDefault();
              onChange("");
            }
          }}
          className={cn(
            "h-full w-full rounded-md bg-transparent px-3 py-2 text-sm text-foreground whitespace-nowrap",
            "placeholder:text-muted-foreground focus:outline-none cursor-pointer select-none",
            value ? "pr-14" : "pr-8",
            disabled && "cursor-not-allowed"
          )}
        />

        <div className="pointer-events-auto absolute right-2.5 flex items-center gap-1 text-muted-foreground">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-muted hover:text-foreground focus:outline-none"
              title="Clear date"
              aria-label="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={openPicker}
            className="p-0.5 hover:text-foreground focus:outline-none"
            aria-label="Open calendar"
          >
            <Calendar className="h-4 w-4" />
          </button>
        </div>

        {/* Real hidden date input for browser native picker */}
        <input
          ref={hiddenDateInputRef}
          type="date"
          tabIndex={-1}
          disabled={disabled}
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full opacity-0 pointer-events-none -z-10"
        />
      </div>
    );
  }
);

DateFilterInput.displayName = "DateFilterInput";
