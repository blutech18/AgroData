import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import {
  createLivestockSpecies,
  deleteLivestockSpecies,
  fetchLivestockSpecies,
  updateLivestockSpecies,
  type SpeciesInput,
} from "@/features/livestock";
import type { LivestockSpecies } from "@/types/database";

const emptyForm: SpeciesInput = { species_name: "", category: "LIVESTOCK", primary_product: "" };

export default function LivestockSpeciesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<LivestockSpecies | null>(null);
  const [form, setForm] = React.useState<SpeciesInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<LivestockSpecies | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["livestock-species"],
    queryFn: fetchLivestockSpecies,
    placeholderData: keepPreviousData,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["livestock-species"] });
  const species = data ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateLivestockSpecies(editing.species_id, form) : createLivestockSpecies(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_SPECIES" : "CREATE_SPECIES",
        entity: "livestock_species",
        entityId: saved.species_id,
        details: saved.species_name,
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
    mutationFn: (id: number) => deleteLivestockSpecies(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_SPECIES",
        entity: "livestock_species",
        entityId: id,
      });
      toast({ title: "Species deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "It may be in use by livestock records.",
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (s: LivestockSpecies) => {
    setEditing(s);
    setForm({
      species_name: s.species_name,
      category: s.category,
      primary_product: s.primary_product ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Livestock & Poultry Species"
        description="Reference catalog of animal species used in livestock and poultry records."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Species
        </Button>
      </PageHeader>

      <Card>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : species.length === 0 ? (
          <EmptyState title="No species yet" description="Add animal species to begin." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Species</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Primary product</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {species.map((s) => (
                <TableRow key={s.species_id}>
                  <TableCell className="font-medium">{s.species_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.category}</Badge>
                  </TableCell>
                  <TableCell>{s.primary_product ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      label={s.species_name}
                      onEdit={() => openEdit(s)}
                      onDelete={() => setToDelete(s)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Species" : "Add Species"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="species_name">Species name</Label>
              <Input
                id="species_name"
                required
                value={form.species_name}
                onChange={(e) => setForm({ ...form, species_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as SpeciesInput["category"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIVESTOCK">Livestock</SelectItem>
                  <SelectItem value="POULTRY">Poultry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_product">Primary product</Label>
              <Input
                id="primary_product"
                placeholder="e.g. Meat, Milk, Eggs"
                value={form.primary_product ?? ""}
                onChange={(e) => setForm({ ...form, primary_product: e.target.value })}
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
        title="Delete species?"
        description={toDelete ? `Remove "${toDelete.species_name}" from the catalog.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.species_id)}
      />
    </div>
  );
}
