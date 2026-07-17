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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import {
  createCrop,
  deleteCrop,
  fetchCrops,
  updateCrop,
  type CropInput,
} from "@/features/crops";
import type { Crop } from "@/types/database";

const emptyForm: CropInput = { crop_name: "", crop_category: "", expected_harvest_days: null };

export default function CropsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Crop | null>(null);
  const [form, setForm] = React.useState<CropInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<Crop | null>(null);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["crops", debounced, page],
    queryFn: () => fetchCrops(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["crops"] });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const crops = data?.rows ?? [];

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateCrop(editing.crop_id, form) : createCrop(form)),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_CROP" : "CREATE_CROP",
        entity: "crops",
        entityId: saved.crop_id,
        details: saved.crop_name,
      });
      toast({ title: editing ? "Crop updated" : "Crop added", variant: "success" });
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
    mutationFn: (id: number) => deleteCrop(id),
    onSuccess: async (_v, id) => {
      await logActivity({ userId: profile?.user_id ?? null, action: "DELETE_CROP", entity: "crops", entityId: id });
      toast({ title: "Crop deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "It may be in use by planting records.",
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (c: Crop) => {
    setEditing(c);
    setForm({
      crop_name: c.crop_name,
      crop_category: c.crop_category ?? "",
      expected_harvest_days: c.expected_harvest_days,
    });
    setDialogOpen(true);
  };


  return (
    <div>
      <PageHeader title="Crops" description="Crop types and classifications used in monitoring.">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Crop
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search crop or category…"
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
        ) : crops.length === 0 ? (
          <EmptyState title="No crops yet" description="Add crop types to begin." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Crop</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expected Harvest (days)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crops.map((c) => (
                <TableRow key={c.crop_id}>
                  <TableCell className="font-medium">{c.crop_name}</TableCell>
                  <TableCell>
                    {c.crop_category ? <Badge variant="secondary">{c.crop_category}</Badge> : "—"}
                  </TableCell>
                  <TableCell>{c.expected_harvest_days ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(c)}
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
          label="crops"
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Crop" : "Add Crop"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="crop_name">Crop name</Label>
              <Input
                id="crop_name"
                required
                value={form.crop_name}
                onChange={(e) => setForm({ ...form, crop_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crop_category">Category</Label>
              <Input
                id="crop_category"
                placeholder="e.g. Cereal, Vegetable, Root Crop"
                value={form.crop_category ?? ""}
                onChange={(e) => setForm({ ...form, crop_category: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Expected harvest days</Label>
              <Input
                id="days"
                type="number"
                min={0}
                value={form.expected_harvest_days ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expected_harvest_days: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
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
        title="Delete crop?"
        description={toDelete ? `Remove "${toDelete.crop_name}" from the crop list.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.crop_id)}
      />
    </div>
  );
}
