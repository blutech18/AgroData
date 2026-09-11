import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CatalogSelectProps {
  /** Controlled catalog values (e.g. active unit names or species). */
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * A Select bound to a controlled reference catalog. If the current value is not
 * in the catalog (for example a legacy free-text entry recorded before the
 * catalog existed), it is still shown as a selectable option marked "(legacy)"
 * so editing a record never silently drops its value.
 */
export function CatalogSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  id,
  ariaLabel,
  disabled,
}: CatalogSelectProps) {
  const legacy = value && !options.includes(value);
  const items = legacy ? [value, ...options] : options;

  return (
    <Select value={value || ""} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No options — add them under Reference Data.
          </div>
        ) : (
          items.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
              {legacy && opt === value ? " (legacy)" : ""}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
