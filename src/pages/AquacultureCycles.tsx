import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { CatalogSelect } from "@/components/shared/CatalogSelect";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { RowActions } from "@/components/shared/RowActions";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate } from "@/lib/utils";
import {
  createAquacultureCycle,
  deleteAquacultureCycle,
  fetchAquacultureCycles,
  fetchAquacultureSiteOptions,
  updateAquacultureCycle,
  validateAquacultureCycle,
  type AquacultureCycleInput,
} from "@/features/aquaculture";
import { fetchAquaticSpeciesOptions, fetchUnitOptions } from "@/features/reference";
import type { AquaCycleStatus, AquacultureCycle } from "@/types/database";

const emptyForm: AquacultureCycleInput = {
  site_id: 0,
  species_name: "",
  stocking_date: "",
  stocking_qty: null,
  harvest_date: null,
  harvest_qty: null,
  unit: "kg",
  status: "STOCKED",
};

const STATUSES: AquaCycleStatus[] = ["STOCKED", "HARVESTED", "LOST"];

export default function AquacultureCyclesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [speciesFilter, setSpeciesFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AquacultureCycle | null>(null);
  const [form, setForm] = React.useState<AquacultureCycleInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<AquacultureCycle | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => setPage(1), [statusFilter, speciesFilter]);

  const PAGE_SIZE = 12;

  const filters = React.useMemo(
    () => ({
      status: statusFilter === "ALL" ? undefined : (statusFilter as AquaCycleStatus),
      species: speciesFilter === "ALL" ? undefined : speciesFilter,
    }),
    [statusFilter, speciesFilter]
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["aqua-cycles", debounced, page, filters],
    queryFn: () => fetchAquacultureCycles(debounced, page, PAGE_SIZE, filters),
    placeholderData: keepPreviousData,
  });
  const sites = useQuery({ queryKey: ["aqua-site-options"], queryFn: fetchAquacultureSiteOptions });
  const speciesOptions = useQuery({
    queryKey: ["aquatic-species-options"],
    queryFn: fetchAquaticSpeciesOptions,
  });
  const unitOptions = useQuery({ queryKey: ["unit-options"], queryFn: fetchUnitOptions });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["aqua-cycles"] });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];

  const hasActiveFilters = Boolean(
    debounced || statusFilter !== "ALL" || speciesFilter !== "ALL"
  );

  const resetFilters = () => {
    setSearch("");
    setDebounced("");
    setStatusFilter("ALL");
    setSpeciesFilter("ALL");
    setPage(1);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateAquacultureCycle(editing.cycle_id, form) : createAquacultureCycle(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_AQUA_CYCLE" : "CREATE_AQUA_CYCLE",
        entity: "aquaculture_cycles",
        entityId: saved.cycle_id,
        details: saved.species_name,
      });
      toast({ title: editing ? "Cycle updated" : "Cycle added", variant: "success" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAquacultureCycle(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_AQUA_CYCLE",
        entity: "aquaculture_cycles",
        entityId: id,
      });
      toast({ title: "Cycle deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (c: AquacultureCycle) => {
    setEditing(c);
    setForm({
      site_id: c.site_id,
      species_name: c.species_name,
      stocking_date: c.stocking_date,
      stocking_qty: c.stocking_qty,
      harvest_date: c.harvest_date,
      harvest_qty: c.harvest_qty,
      unit: c.unit,
      status: c.status,
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Aquaculture Cycles"
        description="Stocking-to-harvest culture cycles per aquaculture site."
      >
        <Button onClick={openCreate} disabled={(sites.data?.length ?? 0) === 0}>
          <Plus className="h-4 w-4" /> Add Cycle
        </Button>
      </PageHeader>

      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search species…"
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search species"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger aria-label="Filter by species">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All species</SelectItem>
              {(speciesOptions.data ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <LoadingState label="Loading cycles…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No culture cycles match your filters" : "No culture cycles"}
            description={
              hasActiveFilters
                ? "Try clearing your filters or changing your search."
                : (sites.data?.length ?? 0) === 0
                ? "Add an aquaculture site first, then record its cycles."
                : "Add the first culture cycle."
            }
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
                  <TableHead>Site</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Stocked</TableHead>
                  <TableHead>Harvested</TableHead>
                  <TableHead>Harvest qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.cycle_id}>
                    <TableCell className="font-medium">
                      {c.aquaculture_sites?.site_name ?? "—"}
                    </TableCell>
                    <TableCell>{c.species_name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(c.stocking_date)}
                      {c.stocking_qty != null ? ` · ${c.stocking_qty}` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.harvest_date ? formatDate(c.harvest_date) : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.harvest_qty != null ? `${c.harvest_qty} ${c.unit}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`${c.species_name} culture cycle`}
                        onEdit={() => openEdit(c)}
                        onDelete={() => setToDelete(c)}
                      />
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
              label="cycles"
            />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Cycle" : "Add Culture Cycle"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const problem = validateAquacultureCycle(form);
              if (problem) {
                toast({ title: "Check the cycle", description: problem, variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Site</Label>
              <Select
                value={form.site_id ? String(form.site_id) : ""}
                onValueChange={(v) => setForm({ ...form, site_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {(sites.data ?? []).map((s) => (
                    <SelectItem key={s.site_id} value={String(s.site_id)}>
                      {s.site_name} · {s.barangay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="species_name">Species</Label>
                <CatalogSelect
                  id="species_name"
                  ariaLabel="Species"
                  placeholder="Select species"
                  options={speciesOptions.data ?? []}
                  value={form.species_name}
                  onChange={(v) => setForm({ ...form, species_name: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as AquaCycleStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stocking_date">Stocking date</Label>
                <Input
                  id="stocking_date"
                  type="date"
                  required
                  value={form.stocking_date}
                  onChange={(e) => setForm({ ...form, stocking_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stocking_qty">Stocking qty</Label>
                <Input
                  id="stocking_qty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.stocking_qty ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stocking_qty: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="harvest_date">Harvest date</Label>
                <Input
                  id="harvest_date"
                  type="date"
                  value={form.harvest_date ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, harvest_date: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvest_qty">Harvest qty</Label>
                <Input
                  id="harvest_qty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.harvest_qty ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      harvest_qty: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <CatalogSelect
                  id="unit"
                  ariaLabel="Unit"
                  placeholder="Select unit"
                  options={unitOptions.data ?? []}
                  value={form.unit}
                  onChange={(v) => setForm({ ...form, unit: v })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.site_id}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete cycle?"
        description="This permanently removes the culture cycle."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.cycle_id)}
      />
    </div>
  );
}
