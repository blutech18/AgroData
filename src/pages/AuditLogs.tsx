import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RotateCcw, ScrollText, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateFilterInput } from "@/components/ui/date-filter-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { fetchAuditLogs, type AuditLogFilters } from "@/features/audit";

const PAGE_SIZE = 12;

function actionVariant(action: string): "default" | "success" | "destructive" | "secondary" {
  if (action.startsWith("DELETE")) return "destructive";
  if (action.startsWith("CREATE")) return "success";
  if (action === "LOGIN" || action === "LOGOUT") return "secondary";
  return "default";
}

export default function AuditLogsPage() {
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [actionGroupFilter, setActionGroupFilter] = React.useState("ALL");
  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [actionGroupFilter, entityFilter, fromDate, toDate]);

  const filters = React.useMemo<AuditLogFilters>(
    () => ({
      actionGroup: actionGroupFilter === "ALL" ? undefined : actionGroupFilter,
      entity: entityFilter === "ALL" ? undefined : entityFilter,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [actionGroupFilter, entityFilter, fromDate, toDate]
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["audit-logs", debounced, page, filters],
    queryFn: () => fetchAuditLogs(page, PAGE_SIZE, debounced, filters),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  // Clamp page if the data set shrinks.
  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const hasActiveFilters = Boolean(
    debounced ||
      actionGroupFilter !== "ALL" ||
      entityFilter !== "ALL" ||
      fromDate ||
      toDate
  );

  const resetFilters = () => {
    setSearch("");
    setDebounced("");
    setActionGroupFilter("ALL");
    setEntityFilter("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="System activity trail for monitoring and accountability."
      />

      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search action, entity, details…"
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search audit logs"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select value={actionGroupFilter} onValueChange={setActionGroupFilter}>
            <SelectTrigger aria-label="Filter by action">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actions</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="AUTH">Login / Logout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger aria-label="Filter by entity">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entities</SelectItem>
              <SelectItem value="farmers">Farmers</SelectItem>
              <SelectItem value="farms">Farms</SelectItem>
              <SelectItem value="farm_plots">Plots</SelectItem>
              <SelectItem value="crops">Crops</SelectItem>
              <SelectItem value="crop_plantings">Plantings</SelectItem>
              <SelectItem value="crop_harvests">Harvests</SelectItem>
              <SelectItem value="fisherfolk">Fisherfolk</SelectItem>
              <SelectItem value="fish_catch">Fish Catch</SelectItem>
              <SelectItem value="aquaculture_sites">Aquaculture Sites</SelectItem>
              <SelectItem value="aquaculture_cycles">Aquaculture Cycles</SelectItem>
              <SelectItem value="livestock_records">Livestock</SelectItem>
              <SelectItem value="livestock_species">Livestock Species</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="backup">Backup</SelectItem>
              <SelectItem value="measurement_units">Units</SelectItem>
              <SelectItem value="aquatic_species">Aquatic Species</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <DateFilterInput
            id="from-date"
            placeholder="From"
            value={fromDate}
            max={toDate || undefined}
            onChange={setFromDate}
          />
        </div>
        <div className="w-full sm:w-44">
          <DateFilterInput
            id="to-date"
            placeholder="To"
            value={toDate}
            min={fromDate || undefined}
            onChange={setToDate}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={resetFilters}
          disabled={!hasActiveFilters}
          title="Reset filters"
          aria-label="Reset filters"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <Card className="overflow-hidden">
        {/* Summary bar */}
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ScrollText className="h-4 w-4" />
            <span>
              {total === 0
                ? "No activity recorded"
                : `Showing ${rangeStart}–${rangeEnd} of ${total} events`}
            </span>
          </div>
          {isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}
        </div>

        {isLoading ? (
          <LoadingState label="Loading audit logs…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No activity matches your filters" : "No activity logged yet"}
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log.log_id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.users ? `${log.users.first_name} ${log.users.last_name}` : "System"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.entity ?? "—"}
                      {log.entity_id ? ` #${log.entity_id}` : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.details ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isFetching}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
