import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  createPlot,
  deletePlot,
  fetchFarmOptions,
  fetchPlots,
  updatePlot,
  type PlotInput,
} from "@/features/farms";
import type { FarmPlot } from "@/types/database";

const emptyForm: PlotInput = {
  farm_id: 0,
  plot_number: "",
  plot_size: 0,
  status: "ACTIVE",
};

export default function PlotsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FarmPlot | null>(null);
  const [form, setForm] = React.useState<PlotInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<FarmPlot | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["plots", debounced],
    queryFn: () => fetchPlots(debounced),
  });
  const farmOptions = useQuery({ queryKey: ["farm-options"], queryFn: fetchFarmOptions });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["plots"] });
    qc.invalidateQueries({ queryKey: ["plot-options"] });
  };

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updatePlot(editing.plot_id, form) : createPlot(form)),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_PLOT" : "CREATE_PLOT",
        entity: "farm_plots",
        entityId: saved.plot_id,
        details: saved.plot_number,
      });
      toast({ title: editing ? "Plot updated" : "Plot added", variant: "success" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not save", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePlot(id),
    onSuccess: async (_v, id) => {
      await logActivity({ userId: profile?.user_id ?? null, action: "DELETE_PLOT", entity: "farm_plots", entityId: id });
      toast({ title: "Plot deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "It may be used by planting records.",
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (p: FarmPlot) => {
    setEditing(p);
    setForm({
      farm_id: p.farm_id,
      plot_number: p.plot_number,
      plot_size: p.plot_size,
      status: p.status,
    });
    setDialogOpen(true);
  };

  const plots = data ?? [];
  const noFarms = (farmOptions.data?.length ?? 0) === 0;

  return (
    <div>
      <PageHeader
        title="Farm Plots"
        description="Subdivisions within farms. Plots are used when recording plantings."
      >
        <Button onClick={openCreate} disabled={noFarms}>
          <Plus className="h-4 w-4" /> Add Plot
        </Button>
      </PageHeader>

      {noFarms && !farmOptions.isLoading && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Add at least one farm before creating plots.
        </p>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search plot number…"
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
        ) : plots.length === 0 ? (
          <EmptyState title="No plots found" description="Add a plot to start recording plantings." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plot No.</TableHead>
                <TableHead>Farm</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Size (ha)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plots.map((p) => (
                <TableRow key={p.plot_id}>
                  <TableCell className="font-medium">{p.plot_number}</TableCell>
                  <TableCell>{p.farms?.farm_name ?? "—"}</TableCell>
                  <TableCell>{p.farms?.barangay ?? "—"}</TableCell>
                  <TableCell>{formatNumber(p.plot_size, 2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "ACTIVE" ? "success" : "warning"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plot" : "Add Plot"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.farm_id) {
                toast({ title: "Select a farm", variant: "error" });
                return;
              }
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Farm</Label>
              <Select
                value={form.farm_id ? String(form.farm_id) : ""}
                onValueChange={(v) => setForm({ ...form, farm_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  {(farmOptions.data ?? []).map((f) => (
                    <SelectItem key={f.farm_id} value={String(f.farm_id)}>
                      {f.farm_name} · {f.barangay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plot_number">Plot number</Label>
                <Input
                  id="plot_number"
                  required
                  value={form.plot_number}
                  onChange={(e) => setForm({ ...form, plot_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plot_size">Size (ha)</Label>
                <Input
                  id="plot_size"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  value={form.plot_size || ""}
                  onChange={(e) => setForm({ ...form, plot_size: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as PlotInput["status"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="FALLOW">Fallow</SelectItem>
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
        title="Delete plot?"
        description={
          toDelete ? `This removes plot "${toDelete.plot_number}" and its planting records.` : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.plot_id)}
      />
    </div>
  );
}
