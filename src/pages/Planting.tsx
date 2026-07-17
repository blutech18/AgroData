import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate, formatNumber } from "@/lib/utils";
import {
  createPlanting,
  deletePlanting,
  fetchPlantingRecords,
  fetchPlotOptions,
  updatePlanting,
  type PlantingInput,
} from "@/features/planting";
import { fetchCrops } from "@/features/crops";
import type { PlantingRecord, PlantingStatus } from "@/types/database";

const emptyForm: PlantingInput = {
  plot_id: 0,
  crop_id: 0,
  planting_date: new Date().toISOString().slice(0, 10),
  expected_harvest_date: null,
  actual_harvest_date: null,
  area_planted: 0,
  quantity_planted: null,
  planting_unit: "kg",
  planting_status: "PLANTED",
};

const statusVariant: Record<PlantingStatus, "default" | "success" | "destructive"> = {
  PLANTED: "default",
  HARVESTED: "success",
  SPOILED: "destructive",
};

export default function PlantingPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PlantingRecord | null>(null);
  const [form, setForm] = React.useState<PlantingInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<PlantingRecord | null>(null);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["planting", debounced, page],
    queryFn: () => fetchPlantingRecords(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const plots = useQuery({ queryKey: ["plot-options"], queryFn: fetchPlotOptions });
  const crops = useQuery({ queryKey: ["crops"], queryFn: () => fetchCrops() });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const records = data?.rows ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["planting"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updatePlanting(editing.planting_id, form) : createPlanting(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_PLANTING" : "CREATE_PLANTING",
        entity: "planting_records",
        entityId: saved.planting_id,
      });
      toast({ title: editing ? "Planting updated" : "Planting recorded", variant: "success" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not save", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlanting(id),
    onSuccess: async (_v, id) => {
      await logActivity({ userId: profile?.user_id ?? null, action: "DELETE_PLANTING", entity: "planting_records", entityId: id });
      toast({ title: "Planting deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not delete", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (p: PlantingRecord) => {
    setEditing(p);
    setForm({
      plot_id: p.plot_id,
      crop_id: p.crop_id,
      planting_date: p.planting_date,
      expected_harvest_date: p.expected_harvest_date,
      actual_harvest_date: p.actual_harvest_date,
      area_planted: p.area_planted,
      quantity_planted: p.quantity_planted,
      planting_unit: p.planting_unit,
      planting_status: p.planting_status,
    });
    setDialogOpen(true);
  };

  const noPrereqs = (plots.data?.length ?? 0) === 0 || (crops.data?.rows?.length ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title="Planting Records"
        description="Encode crops produced — planting cycles and production activities."
      >
        <Button onClick={openCreate} disabled={noPrereqs}>
          <Plus className="h-4 w-4" /> Record Planting
        </Button>
      </PageHeader>

      {noPrereqs && !plots.isLoading && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          You need at least one active farm plot and one crop before recording plantings.
        </p>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search crop, plot, farm, barangay, status…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : records.length === 0 ? (
          <EmptyState title="No planting records" description="Record a planting to begin monitoring." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Plot / Farm</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Planted</TableHead>
                <TableHead>Area (ha)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((p) => (
                <TableRow key={p.planting_id}>
                  <TableCell className="font-medium">{p.crops?.crop_name ?? "—"}</TableCell>
                  <TableCell>
                    {p.farm_plots?.plot_number} · {p.farm_plots?.farms?.farm_name ?? "—"}
                  </TableCell>
                  <TableCell>{p.farm_plots?.farms?.barangay ?? "—"}</TableCell>
                  <TableCell>{formatDate(p.planting_date)}</TableCell>
                  <TableCell>{formatNumber(p.area_planted, 2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.planting_status]}>{p.planting_status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {!isLoading && !isError && (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          isFetching={isFetching}
          onPageChange={setPage}
          label="records"
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Planting" : "Record Planting"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.plot_id || !form.crop_id) {
                toast({ title: "Select plot and crop", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plot</Label>
                <Select
                  value={form.plot_id ? String(form.plot_id) : ""}
                  onValueChange={(v) => setForm({ ...form, plot_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plot" />
                  </SelectTrigger>
                  <SelectContent>
                    {(plots.data ?? []).map((pl) => (
                      <SelectItem key={pl.plot_id} value={String(pl.plot_id)}>
                        {pl.plot_number} · {pl.farms?.farm_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Crop</Label>
                <Select
                  value={form.crop_id ? String(form.crop_id) : ""}
                  onValueChange={(v) => setForm({ ...form, crop_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {(crops.data ?? []).map((c) => (
                      <SelectItem key={c.crop_id} value={String(c.crop_id)}>
                        {c.crop_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planting_date">Planting date</Label>
                <Input
                  id="planting_date"
                  type="date"
                  required
                  value={form.planting_date}
                  onChange={(e) => setForm({ ...form, planting_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expected">Expected harvest</Label>
                <Input
                  id="expected"
                  type="date"
                  value={form.expected_harvest_date ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, expected_harvest_date: e.target.value || null })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area">Area (ha)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={form.area_planted || ""}
                  onChange={(e) => setForm({ ...form, area_planted: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">Qty planted</Label>
                <Input
                  id="qty"
                  type="number"
                  min={0}
                  value={form.quantity_planted ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, quantity_planted: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  required
                  value={form.planting_unit}
                  onChange={(e) => setForm({ ...form, planting_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.planting_status}
                onValueChange={(v) => setForm({ ...form, planting_status: v as PlantingStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANTED">Planted</SelectItem>
                  <SelectItem value="HARVESTED">Harvested</SelectItem>
                  <SelectItem value="SPOILED">Spoiled</SelectItem>
                </SelectContent>
              </Select>
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
        title="Delete planting record?"
        description="This permanently removes the planting record and any linked harvest entries."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.planting_id)}
      />
    </div>
  );
}
