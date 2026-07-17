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
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatNumber } from "@/lib/utils";
import { SimplePagination } from "@/components/shared/SimplePagination";
import {
  createFarm,
  deleteFarm,
  fetchFarmerOptions,
  fetchFarms,
  updateFarm,
  type FarmInput,
} from "@/features/farms";
import type { Farm } from "@/types/database";

const emptyForm: FarmInput = {
  farmer_id: 0,
  farm_name: "",
  barangay: "",
  total_area: null,
  soil_type: null,
  irrigation_type: null,
};

export default function FarmsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Farm | null>(null);
  const [form, setForm] = React.useState<FarmInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<Farm | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farms", debounced, page],
    queryFn: () => fetchFarms(debounced, page, 10),
    placeholderData: keepPreviousData,
  });
  const farmerOptions = useQuery({ queryKey: ["farmer-options"], queryFn: fetchFarmerOptions });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["farms"] });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateFarm(editing.farm_id, form) : createFarm(form)),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_FARM" : "CREATE_FARM",
        entity: "farms",
        entityId: saved.farm_id,
        details: saved.farm_name,
      });
      toast({ title: editing ? "Farm updated" : "Farm added", variant: "success" });
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
    mutationFn: (id: number) => deleteFarm(id),
    onSuccess: async (_v, id) => {
      await logActivity({ userId: profile?.user_id ?? null, action: "DELETE_FARM", entity: "farms", entityId: id });
      toast({ title: "Farm deleted", variant: "success" });
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
  const openEdit = (f: Farm) => {
    setEditing(f);
    setForm({
      farmer_id: f.farmer_id,
      farm_name: f.farm_name,
      barangay: f.barangay,
      total_area: f.total_area,
      soil_type: f.soil_type,
      irrigation_type: f.irrigation_type,
    });
    setDialogOpen(true);
  };

  const farms = data?.data ?? [];
  const total = data?.count ?? 0;

  return (
    <div>
      <PageHeader title="Farms & Land Use" description="Agricultural land managed by registered farmers.">
        <Button onClick={openCreate} disabled={(farmerOptions.data?.length ?? 0) === 0}>
          <Plus className="h-4 w-4" /> Add Farm
        </Button>
      </PageHeader>

      {(farmerOptions.data?.length ?? 0) === 0 && !farmerOptions.isLoading && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Register at least one farmer before adding farms.
        </p>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search farm name or barangay…"
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
        ) : farms.length === 0 ? (
          <EmptyState title="No farms found" description="Add a farm to start tracking land use." />
        ) : (
          <>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farm</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Area (ha)</TableHead>
                <TableHead>Soil</TableHead>
                <TableHead>Irrigation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farms.map((f) => (
                <TableRow key={f.farm_id}>
                  <TableCell className="font-medium">{f.farm_name}</TableCell>
                  <TableCell>
                    {f.farmers ? `${f.farmers.last_name}, ${f.farmers.first_name}` : "—"}
                  </TableCell>
                  <TableCell>{f.barangay}</TableCell>
                  <TableCell>{formatNumber(f.total_area, 2)}</TableCell>
                  <TableCell>{f.soil_type ? <Badge variant="secondary">{f.soil_type}</Badge> : "—"}</TableCell>
                  <TableCell>{f.irrigation_type ? <Badge variant="secondary">{f.irrigation_type}</Badge> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(f)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <SimplePagination page={page} pageSize={10} total={total} onPageChange={setPage} />
        </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Farm" : "Add Farm"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.farmer_id) {
                toast({ title: "Select an owner", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Owner (farmer)</Label>
              <Select
                value={form.farmer_id ? String(form.farmer_id) : ""}
                onValueChange={(v) => setForm({ ...form, farmer_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farmer" />
                </SelectTrigger>
                <SelectContent>
                  {(farmerOptions.data ?? []).map((f) => (
                    <SelectItem key={f.farmer_id} value={String(f.farmer_id)}>
                      {f.last_name}, {f.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farm_name">Farm name</Label>
                <Input
                  id="farm_name"
                  required
                  value={form.farm_name}
                  onChange={(e) => setForm({ ...form, farm_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm_barangay">Barangay</Label>
                <Input
                  id="farm_barangay"
                  required
                  value={form.barangay}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_area">Area (ha)</Label>
                <Input
                  id="total_area"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.total_area ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, total_area: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Soil type</Label>
                <Select
                  value={form.soil_type ?? ""}
                  onValueChange={(v) => setForm({ ...form, soil_type: v as FarmInput["soil_type"] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLAY">Clay</SelectItem>
                    <SelectItem value="LOAM">Loam</SelectItem>
                    <SelectItem value="SANDY">Sandy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Irrigation</Label>
                <Select
                  value={form.irrigation_type ?? ""}
                  onValueChange={(v) =>
                    setForm({ ...form, irrigation_type: v as FarmInput["irrigation_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAINFED">Rainfed</SelectItem>
                    <SelectItem value="IRRIGATED">Irrigated</SelectItem>
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
        title="Delete farm?"
        description={
          toDelete ? `This removes "${toDelete.farm_name}" and its plots and planting records.` : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.farm_id)}
      />
    </div>
  );
}
