import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
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
import { RowActions } from "@/components/shared/RowActions";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate } from "@/lib/utils";
import {
  createLivestockRecord,
  deleteLivestockRecord,
  fetchLivestockRecords,
  fetchLivestockSpecies,
  updateLivestockRecord,
  type LivestockRecordInput,
} from "@/features/livestock";
import { fetchFarmerOptions } from "@/features/farmers";
import type { AnimalProductType, LivestockRecord } from "@/types/database";

const emptyForm: LivestockRecordInput = {
  farmer_id: 0,
  species_id: 0,
  barangay: "",
  record_date: "",
  inventory_count: 0,
  births: 0,
  deaths: 0,
  disposed: 0,
  production_type: null,
  production_qty: null,
  production_unit: "",
  notes: "",
};

const PRODUCT_TYPES: AnimalProductType[] = ["MEAT", "MILK", "EGGS", "OTHER"];

export default function LivestockPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LivestockRecord | null>(null);
  const [form, setForm] = React.useState<LivestockRecordInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<LivestockRecord | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["livestock-records", debounced, page],
    queryFn: () => fetchLivestockRecords(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const farmers = useQuery({ queryKey: ["farmer-options"], queryFn: fetchFarmerOptions });
  const species = useQuery({ queryKey: ["livestock-species"], queryFn: fetchLivestockSpecies });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["livestock-records"] });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const records = data?.rows ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateLivestockRecord(editing.record_id, form) : createLivestockRecord(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_LIVESTOCK" : "CREATE_LIVESTOCK",
        entity: "livestock_records",
        entityId: saved.record_id,
      });
      toast({ title: editing ? "Record updated" : "Record added", variant: "success" });
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
    mutationFn: (id: number) => deleteLivestockRecord(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_LIVESTOCK",
        entity: "livestock_records",
        entityId: id,
      });
      toast({ title: "Record deleted", variant: "success" });
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
  const openEdit = (r: LivestockRecord) => {
    setEditing(r);
    setForm({
      farmer_id: r.farmer_id,
      species_id: r.species_id,
      barangay: r.barangay,
      record_date: r.record_date,
      inventory_count: r.inventory_count,
      births: r.births,
      deaths: r.deaths,
      disposed: r.disposed,
      production_type: r.production_type,
      production_qty: r.production_qty,
      production_unit: r.production_unit ?? "",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div>
      <PageHeader
        title="Livestock & Poultry Records"
        description="Periodic animal inventory, births, deaths, dispositions, and production per producer."
      >
        <Button onClick={openCreate} disabled={(species.data?.length ?? 0) === 0}>
          <Plus className="h-4 w-4" /> Add Record
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search barangay…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState label="Loading records…" />
        ) : isError ? (
          <ErrorState />
        ) : records.length === 0 ? (
          <EmptyState title="No livestock records" description="Add the first record to begin." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Births</TableHead>
                  <TableHead>Deaths</TableHead>
                  <TableHead>Production</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.record_id}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.record_date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.farmers ? `${r.farmers.last_name}, ${r.farmers.first_name}` : "—"}
                    </TableCell>
                    <TableCell>
                      {r.livestock_species?.species_name ?? "—"}
                      {r.livestock_species && (
                        <Badge variant="secondary" className="ml-1">
                          {r.livestock_species.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.barangay}</TableCell>
                    <TableCell>{r.inventory_count}</TableCell>
                    <TableCell>{r.births}</TableCell>
                    <TableCell>{r.deaths}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {r.production_qty != null
                        ? `${r.production_qty} ${r.production_unit ?? ""} ${r.production_type ?? ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`${r.livestock_species?.species_name ?? "livestock"} record`}
                        onEdit={() => openEdit(r)}
                        onDelete={() => setToDelete(r)}
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
              label="records"
            />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Record" : "Add Livestock Record"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Producer</Label>
              <Select
                value={form.farmer_id ? String(form.farmer_id) : ""}
                onValueChange={(v) => setForm({ ...form, farmer_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select producer" />
                </SelectTrigger>
                <SelectContent>
                  {(farmers.data ?? []).map((f) => (
                    <SelectItem key={f.farmer_id} value={String(f.farmer_id)}>
                      {f.last_name}, {f.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Species</Label>
                <Select
                  value={form.species_id ? String(form.species_id) : ""}
                  onValueChange={(v) => setForm({ ...form, species_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent>
                    {(species.data ?? []).map((s) => (
                      <SelectItem key={s.species_id} value={String(s.species_id)}>
                        {s.species_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="record_date">Record date</Label>
                <Input
                  id="record_date"
                  type="date"
                  required
                  value={form.record_date}
                  onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barangay">Barangay</Label>
              <Input
                id="barangay"
                required
                value={form.barangay}
                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label htmlFor="inv">Inventory</Label>
                <Input
                  id="inv"
                  type="number"
                  min={0}
                  value={form.inventory_count}
                  onChange={(e) => setForm({ ...form, inventory_count: num(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="births">Births</Label>
                <Input
                  id="births"
                  type="number"
                  min={0}
                  value={form.births}
                  onChange={(e) => setForm({ ...form, births: num(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deaths">Deaths</Label>
                <Input
                  id="deaths"
                  type="number"
                  min={0}
                  value={form.deaths}
                  onChange={(e) => setForm({ ...form, deaths: num(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disposed">Disposed</Label>
                <Input
                  id="disposed"
                  type="number"
                  min={0}
                  value={form.disposed}
                  onChange={(e) => setForm({ ...form, disposed: num(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Production type</Label>
                <Select
                  value={form.production_type ?? "NONE"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      production_type: v === "NONE" ? null : (v as AnimalProductType),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    {PRODUCT_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pqty">Production qty</Label>
                <Input
                  id="pqty"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.production_qty ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      production_qty: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="punit">Unit</Label>
                <Input
                  id="punit"
                  placeholder="kg, L, pcs"
                  value={form.production_unit ?? ""}
                  onChange={(e) => setForm({ ...form, production_unit: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || !form.farmer_id || !form.species_id}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete record?"
        description="This permanently removes the livestock record."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.record_id)}
      />
    </div>
  );
}
