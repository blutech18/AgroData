import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateFilterInput } from "@/components/ui/date-filter-input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createHarvest,
  deleteHarvest,
  fetchHarvestablePlantings,
  fetchHarvests,
  type HarvestInput,
} from "@/features/planting";
import { fetchCrops } from "@/features/crops";
import type { HarvestInventory } from "@/types/database";

const emptyForm: HarvestInput = { planting_id: 0, quantity_harvested: 0, unit: "kg" };

export default function HarvestPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [cropFilter, setCropFilter] = React.useState<string>("ALL");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<HarvestInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<HarvestInventory | null>(null);
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
  }, [cropFilter, fromDate, toDate]);

  const PAGE_SIZE = 12;

  const crops = useQuery({ queryKey: ["crops"], queryFn: () => fetchCrops() });

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["harvest", debounced, page, cropFilter, fromDate, toDate],
    queryFn: () =>
      fetchHarvests(page, PAGE_SIZE, debounced, {
        cropName: cropFilter,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
    placeholderData: keepPreviousData,
  });
  const plantings = useQuery({
    queryKey: ["harvestable-plantings"],
    queryFn: fetchHarvestablePlantings,
  });

  const hasActiveFilters =
    Boolean(search) || cropFilter !== "ALL" || Boolean(fromDate) || Boolean(toDate);

  const resetFilters = () => {
    setSearch("");
    setDebounced("");
    setCropFilter("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const harvests = data?.rows ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["harvest"] });
    qc.invalidateQueries({ queryKey: ["planting"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    qc.invalidateQueries({ queryKey: ["yield-by-crop"] });
    qc.invalidateQueries({ queryKey: ["yield-trend"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => createHarvest(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "CREATE_HARVEST",
        entity: "harvest_inventory",
        entityId: saved.inventory_id,
      });
      toast({ title: "Harvest recorded", variant: "success" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not save", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteHarvest(id),
    onSuccess: async (_v, id) => {
      await logActivity({ userId: profile?.user_id ?? null, action: "DELETE_HARVEST", entity: "harvest_inventory", entityId: id });
      toast({ title: "Harvest deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not delete", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };


  return (
    <div>
      <PageHeader title="Harvest Inventory" description="Recorded harvested crop quantities.">
        <Button onClick={openCreate} disabled={(plantings.data?.length ?? 0) === 0}>
          <Plus className="h-4 w-4" /> Record Harvest
        </Button>
      </PageHeader>

      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search farm, barangay, plot…"
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search harvests"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select value={cropFilter} onValueChange={setCropFilter}>
            <SelectTrigger aria-label="Filter by crop">
              <SelectValue placeholder="All crops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All crops</SelectItem>
              {(crops.data?.rows ?? []).map((c) => (
                <SelectItem key={c.crop_id} value={c.crop_name}>
                  {c.crop_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <DateFilterInput
            id="harvest-from-date"
            placeholder="From"
            value={fromDate}
            max={toDate || undefined}
            onChange={setFromDate}
          />
        </div>
        <div className="w-full sm:w-44">
          <DateFilterInput
            id="harvest-to-date"
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

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : harvests.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No harvest records match your filters" : "No harvest records"}
            description={
              hasActiveFilters
                ? "Try clearing or adjusting your search and filter criteria."
                : "Record harvested quantities to track yield."
            }
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline">
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
                <TableHead>Crop</TableHead>
                <TableHead>Plot / Farm</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Harvested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {harvests.map((h) => (
                <TableRow key={h.inventory_id}>
                  <TableCell className="font-medium">
                    {h.planting_records?.crops?.crop_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {h.planting_records?.farm_plots?.plot_number} ·{" "}
                    {h.planting_records?.farm_plots?.farms?.farm_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    {formatNumber(h.quantity_harvested, 2)} {h.unit}
                  </TableCell>
                  <TableCell>{formatDate(h.harvested_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setToDelete(h)}
                      title={`Delete ${h.planting_records?.crops?.crop_name ?? ""} harvest record`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">
                        Delete {h.planting_records?.crops?.crop_name ?? ""} harvest record
                      </span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            isFetching={isFetching}
            onPageChange={setPage}
            label="harvests"
          />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Harvest</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.planting_id) {
                toast({ title: "Select a planting record", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Planting record</Label>
              <Select
                value={form.planting_id ? String(form.planting_id) : ""}
                onValueChange={(v) => setForm({ ...form, planting_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select planting" />
                </SelectTrigger>
                <SelectContent>
                  {(plantings.data ?? []).map((p) => (
                    <SelectItem key={p.planting_id} value={String(p.planting_id)}>
                      {p.crops?.crop_name} · {p.farm_plots?.plot_number} ({formatDate(p.planting_date)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">Quantity harvested</Label>
                <Input
                  id="qty"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={form.quantity_harvested || ""}
                  onChange={(e) => setForm({ ...form, quantity_harvested: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  required
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete harvest record?"
        description="This permanently removes the harvest entry from the inventory."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.inventory_id)}
      />
    </div>
  );
}
