import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  label?: string;
}

export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  isFetching,
  onPageChange,
  label = "records",
}: TablePaginationProps) {
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  // Build a compact page number window (max 5 visible)
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push(-1); // ellipsis
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push(-1); // ellipsis
    if (totalPages > 1) range.push(totalPages);

    return range;
  };

  return (
    <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0 ? (
          `No ${label} found`
        ) : (
          <>
            Showing <span className="font-medium">{rangeStart}–{rangeEnd}</span> of{" "}
            <span className="font-medium">{total.toLocaleString()}</span> {label}
            {isFetching && <span className="ml-2 text-xs opacity-60">Updating…</span>}
          </>
        )}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || isFetching}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isFetching}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((n, i) =>
            n === -1 ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground select-none">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === page ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onPageChange(n)}
                disabled={isFetching}
              >
                {n}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isFetching}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages || isFetching}
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
