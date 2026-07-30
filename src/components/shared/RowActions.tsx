import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RowActionsProps {
  /** Called when the edit action is chosen. */
  onEdit: () => void;
  /** Called when the delete action is chosen. */
  onDelete: () => void;
  /**
   * Describes the specific row, e.g. "Juan Dela Cruz" or "PLOT-3". Used to give
   * each icon-only button a unique accessible name, so screen-reader users hear
   * "Edit Juan Dela Cruz" instead of a table full of identical "Edit" buttons.
   */
  label?: string;
  disabled?: boolean;
}

/**
 * Standard edit/delete actions for a table row. Icon-only buttons carry
 * screen-reader text and a native tooltip, keeping every module's row actions
 * consistent and accessible.
 */
export function RowActions({ onEdit, onDelete, label, disabled }: RowActionsProps) {
  const editLabel = label ? `Edit ${label}` : "Edit";
  const deleteLabel = label ? `Delete ${label}` : "Delete";

  return (
    <div className="flex justify-center gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} title={editLabel}>
        <Pencil className="h-4 w-4" />
        <span className="sr-only">{editLabel}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
        disabled={disabled}
        title={deleteLabel}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">{deleteLabel}</span>
      </Button>
    </div>
  );
}
