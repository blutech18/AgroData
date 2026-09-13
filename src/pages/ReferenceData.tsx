import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { RowActions } from "@/components/shared/RowActions";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import {
  createAquaticSpecies,
  createUnit,
  deleteAquaticSpecies,
  deleteUnit,
  fetchAquaticSpecies,
  fetchUnits,
  updateAquaticSpecies,
  updateUnit,
  type AquaticSpeciesInput,
  type UnitInput,
} from "@/features/reference";
import type { AquaticSpecies, MeasurementUnit } from "@/types/database";

const DIMENSIONS = ["WEIGHT", "COUNT", "VOLUME", "AREA"];

const emptyUnit: UnitInput = { unit_name: "", dimension: "WEIGHT", active: true };
const emptySpecies: AquaticSpeciesInput = { common_name: "", scientific_name: "", active: true };

export default function ReferenceDataPage() {
  return (
    <div>
      <PageHeader
        title="Reference Data"
        description="Controlled measurement units and aquatic species used across the sector forms and reports."
      />
      <div className="space-y-6">
        <UnitsCard />
        <AquaticSpeciesCard />
      </div>
    </div>
  );
}

function UnitsCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MeasurementUnit | null>(null);
  const [form, setForm] = React.useState<UnitInput>(emptyUnit);
  const [toDelete, setToDelete] = React.useState<MeasurementUnit | null>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ["units"], queryFn: fetchUnits });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["units"] });
    qc.invalidateQueries({ queryKey: ["unit-options"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateUnit(editing.unit_id, form) : createUnit(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_UNIT" : "CREATE_UNIT",
        entity: "measurement_units",
        entityId: saved.unit_id,
        details: saved.unit_name,
      });
      toast({ title: editing ? "Unit updated" : "Unit added", variant: "success" });
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
    mutationFn: (id: number) => deleteUnit(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_UNIT",
        entity: "measurement_units",
        entityId: id,
      });
      toast({ title: "Unit deleted", variant: "success" });
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
    setForm(emptyUnit);
    setDialogOpen(true);
  };
  const openEdit = (u: MeasurementUnit) => {
    setEditing(u);
    setForm({ unit_name: u.unit_name, dimension: u.dimension ?? "WEIGHT", active: u.active });
    setDialogOpen(true);
  };

  const [search, setSearch] = React.useState("");
  const [dimensionFilter, setDimensionFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const rows = data ?? [];

  const filteredRows = React.useMemo(() => {
    let list = rows;
    if (dimensionFilter !== "ALL") {
      list = list.filter((u) => u.dimension === dimensionFilter);
    }
    if (statusFilter !== "ALL") {
      const active = statusFilter === "ACTIVE";
      list = list.filter((u) => u.active === active);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.unit_name.toLowerCase().includes(q) ||
          (u.dimension?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  }, [rows, search, dimensionFilter, statusFilter]);

  const hasActiveFilters = Boolean(
    search || dimensionFilter !== "ALL" || statusFilter !== "ALL"
  );
  const resetFilters = () => {
    setSearch("");
    setDimensionFilter("ALL");
    setStatusFilter("ALL");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Measurement Units</CardTitle>
          <CardDescription>Units offered in production, catch, and harvest forms.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Unit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search unit name or dimension…"
              className="w-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search units"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
              <SelectTrigger aria-label="Filter by dimension">
                <SelectValue placeholder="All dimensions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All dimensions</SelectItem>
                {DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
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
        {isLoading ? (
          <LoadingState label="Loading units…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No units yet" description="Add the units your office records." />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No matching units"
            description="Try clearing your filters or changing your search."
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Dimension</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((u) => (
                  <TableRow key={u.unit_id}>
                    <TableCell className="font-medium">{u.unit_name}</TableCell>
                    <TableCell>{u.dimension ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "secondary" : "outline"}>
                        {u.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`${u.unit_name} unit`}
                        onEdit={() => openEdit(u)}
                        onDelete={() => setToDelete(u)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Unit" : "Add Unit"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.unit_name.trim()) {
                toast({ title: "Unit name is required", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="unit_name">Unit name</Label>
              <Input
                id="unit_name"
                required
                placeholder="e.g. kg, pcs, tray"
                value={form.unit_name}
                onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dimension</Label>
                <Select
                  value={form.dimension ?? "WEIGHT"}
                  onValueChange={(v) => setForm({ ...form, dimension: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIMENSIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.active ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(v) => setForm({ ...form, active: v === "ACTIVE" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
        title="Delete unit?"
        description={
          toDelete
            ? `Remove "${toDelete.unit_name}". Existing records keep their recorded unit.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.unit_id)}
      />
    </Card>
  );
}

function AquaticSpeciesCard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AquaticSpecies | null>(null);
  const [form, setForm] = React.useState<AquaticSpeciesInput>(emptySpecies);
  const [toDelete, setToDelete] = React.useState<AquaticSpecies | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["aquatic-species"],
    queryFn: fetchAquaticSpecies,
  });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["aquatic-species"] });
    qc.invalidateQueries({ queryKey: ["aquatic-species-options"] });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateAquaticSpecies(editing.aqua_species_id, form) : createAquaticSpecies(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_AQUATIC_SPECIES" : "CREATE_AQUATIC_SPECIES",
        entity: "aquatic_species",
        entityId: saved.aqua_species_id,
        details: saved.common_name,
      });
      toast({ title: editing ? "Species updated" : "Species added", variant: "success" });
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
    mutationFn: (id: number) => deleteAquaticSpecies(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_AQUATIC_SPECIES",
        entity: "aquatic_species",
        entityId: id,
      });
      toast({ title: "Species deleted", variant: "success" });
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
    setForm(emptySpecies);
    setDialogOpen(true);
  };
  const openEdit = (s: AquaticSpecies) => {
    setEditing(s);
    setForm({
      common_name: s.common_name,
      scientific_name: s.scientific_name ?? "",
      active: s.active,
    });
    setDialogOpen(true);
  };

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const rows = data ?? [];

  const filteredRows = React.useMemo(() => {
    let list = rows;
    if (statusFilter !== "ALL") {
      const active = statusFilter === "ACTIVE";
      list = list.filter((s) => s.active === active);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.common_name.toLowerCase().includes(q) ||
          (s.scientific_name?.toLowerCase() ?? "").includes(q)
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const hasActiveFilters = Boolean(search || statusFilter !== "ALL");
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Aquatic Species</CardTitle>
          <CardDescription>Species offered in fish catch and aquaculture forms.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Species
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search common or scientific species name…"
              className="w-full pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search aquatic species"
            />
          </div>
          <div className="w-full sm:w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
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
        {isLoading ? (
          <LoadingState label="Loading species…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No species yet" description="Add the aquatic species your office records." />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No matching species"
            description="Try clearing your filters or changing your search."
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Common name</TableHead>
                  <TableHead>Scientific name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((s) => (
                  <TableRow key={s.aqua_species_id}>
                    <TableCell className="font-medium">{s.common_name}</TableCell>
                    <TableCell className="italic text-muted-foreground">
                      {s.scientific_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "secondary" : "outline"}>
                        {s.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`${s.common_name}`}
                        onEdit={() => openEdit(s)}
                        onDelete={() => setToDelete(s)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Species" : "Add Species"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.common_name.trim()) {
                toast({ title: "Common name is required", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="common_name">Common name</Label>
              <Input
                id="common_name"
                required
                placeholder="e.g. Tilapia, Milkfish (Bangus)"
                value={form.common_name}
                onChange={(e) => setForm({ ...form, common_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scientific_name">Scientific name</Label>
                <Input
                  id="scientific_name"
                  placeholder="optional"
                  value={form.scientific_name ?? ""}
                  onChange={(e) => setForm({ ...form, scientific_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.active ? "ACTIVE" : "INACTIVE"}
                  onValueChange={(v) => setForm({ ...form, active: v === "ACTIVE" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
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
        title="Delete species?"
        description={
          toDelete
            ? `Remove "${toDelete.common_name}". Existing records keep their recorded species.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.aqua_species_id)}
      />
    </Card>
  );
}
