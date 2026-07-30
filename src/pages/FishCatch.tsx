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
  createFishCatch,
  deleteFishCatch,
  fetchFishCatch,
  fetchFisherfolkOptions,
  updateFishCatch,
  type FishCatchInput,
} from "@/features/fisheries";
import type { FishCatch, FisheriesSubsector } from "@/types/database";

const emptyForm: FishCatchInput = {
  fisherfolk_id: 0,
  catch_date: "",
  subsector: "MARINE_MUNICIPAL",
  species_name: "",
  quantity: 0,
  unit: "kg",
  notes: "",
};

const subsectorLabel = (s: FisheriesSubsector) =>
  s === "MARINE_MUNICIPAL" ? "Marine (municipal)" : "Inland (municipal)";

export default function FishCatchPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FishCatch | null>(null);
  const [form, setForm] = React.useState<FishCatchInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<FishCatch | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["fish-catch", debounced, page],
    queryFn: () => fetchFishCatch(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const fisherfolk = useQuery({
    queryKey: ["fisherfolk-options"],
    queryFn: fetchFisherfolkOptions,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["fish-catch"] });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateFishCatch(editing.catch_id, form) : createFishCatch(form)),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_FISH_CATCH" : "CREATE_FISH_CATCH",
        entity: "fish_catch",
        entityId: saved.catch_id,
        details: saved.species_name,
      });
      toast({ title: editing ? "Catch updated" : "Catch recorded", variant: "success" });
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
    mutationFn: (id: number) => deleteFishCatch(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_FISH_CATCH",
        entity: "fish_catch",
        entityId: id,
      });
      toast({ title: "Catch deleted", variant: "success" });
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
  const openEdit = (c: FishCatch) => {
    setEditing(c);
    setForm({
      fisherfolk_id: c.fisherfolk_id,
      catch_date: c.catch_date,
      subsector: c.subsector,
      species_name: c.species_name,
      quantity: c.quantity,
      unit: c.unit,
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  };

  const optionLabel = (o: { farmers?: { first_name: string; last_name: string } | null; barangay: string }) =>
    o.farmers ? `${o.farmers.last_name}, ${o.farmers.first_name} · ${o.barangay}` : o.barangay;

  return (
    <div>
      <PageHeader
        title="Fish Catch Records"
        description="Municipal fish catch by date, subsector, species, and quantity."
      >
        <Button onClick={openCreate} disabled={(fisherfolk.data?.length ?? 0) === 0}>
          <Plus className="h-4 w-4" /> Add Catch
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search species…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState label="Loading catch records…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No catch records"
            description={
              (fisherfolk.data?.length ?? 0) === 0
                ? "Register fisherfolk first, then record their catch."
                : "Add the first catch record."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fisherfolk</TableHead>
                  <TableHead>Subsector</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.catch_id}>
                    <TableCell className="whitespace-nowrap">{formatDate(c.catch_date)}</TableCell>
                    <TableCell className="font-medium">
                      {c.fisherfolk?.farmers
                        ? `${c.fisherfolk.farmers.last_name}, ${c.fisherfolk.farmers.first_name}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{subsectorLabel(c.subsector)}</Badge>
                    </TableCell>
                    <TableCell>{c.species_name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {c.quantity} {c.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`${c.species_name} catch record`}
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
              label="catch records"
            />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Catch" : "Add Fish Catch"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Fisherfolk</Label>
              <Select
                value={form.fisherfolk_id ? String(form.fisherfolk_id) : ""}
                onValueChange={(v) => setForm({ ...form, fisherfolk_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fisherfolk" />
                </SelectTrigger>
                <SelectContent>
                  {(fisherfolk.data ?? []).map((o) => (
                    <SelectItem key={o.fisherfolk_id} value={String(o.fisherfolk_id)}>
                      {optionLabel(o)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catch_date">Catch date</Label>
                <Input
                  id="catch_date"
                  type="date"
                  required
                  value={form.catch_date}
                  onChange={(e) => setForm({ ...form, catch_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subsector</Label>
                <Select
                  value={form.subsector}
                  onValueChange={(v) => setForm({ ...form, subsector: v as FisheriesSubsector })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARINE_MUNICIPAL">Marine (municipal)</SelectItem>
                    <SelectItem value="INLAND_MUNICIPAL">Inland (municipal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="species_name">Species</Label>
              <Input
                id="species_name"
                required
                placeholder="e.g. Tilapia, Bangus, Tuna"
                value={form.species_name}
                onChange={(e) => setForm({ ...form, species_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.quantity}
                  onChange={(e) =>
                    setForm({ ...form, quantity: e.target.value ? Number(e.target.value) : 0 })
                  }
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
              <Button type="submit" disabled={saveMutation.isPending || !form.fisherfolk_id}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete catch record?"
        description="This permanently removes the fish catch record."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.catch_id)}
      />
    </div>
  );
}
