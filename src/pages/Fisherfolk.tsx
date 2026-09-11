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
import {
  createFisherfolk,
  deleteFisherfolk,
  fetchFisherfolk,
  fetchRegisteredFisherfolkFarmerIds,
  updateFisherfolk,
  type FisherfolkInput,
} from "@/features/fisheries";
import { fetchFarmerOptions } from "@/features/farmers";
import type { Fisherfolk, FishingInvolvement } from "@/types/database";

const emptyForm: FisherfolkInput = {
  farmer_id: 0,
  barangay: "",
  involvement: "FULL_TIME",
  vessel_type: "",
  gear_type: "",
};

export default function FisherfolkPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Fisherfolk | null>(null);
  const [form, setForm] = React.useState<FisherfolkInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<Fisherfolk | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["fisherfolk", debounced, page],
    queryFn: () => fetchFisherfolk(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const farmers = useQuery({ queryKey: ["farmer-options"], queryFn: fetchFarmerOptions });
  const registeredIds = useQuery({
    queryKey: ["fisherfolk-registered-ids"],
    queryFn: fetchRegisteredFisherfolkFarmerIds,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fisherfolk"] });
    qc.invalidateQueries({ queryKey: ["fisherfolk-registered-ids"] });
  };

  // In create mode, hide producers that already have a profile (one per
  // producer). When editing, keep the current producer selectable.
  const producerOptions = React.useMemo(() => {
    const taken = new Set(registeredIds.data ?? []);
    return (farmers.data ?? []).filter(
      (f) => !taken.has(f.farmer_id) || f.farmer_id === editing?.farmer_id
    );
  }, [farmers.data, registeredIds.data, editing]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateFisherfolk(editing.fisherfolk_id, form) : createFisherfolk(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_FISHERFOLK" : "CREATE_FISHERFOLK",
        entity: "fisherfolk",
        entityId: saved.fisherfolk_id,
      });
      toast({ title: editing ? "Fisherfolk updated" : "Fisherfolk registered", variant: "success" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast({
        title: "Could not save",
        description: msg.includes("duplicate")
          ? "This producer is already registered as fisherfolk."
          : msg,
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFisherfolk(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_FISHERFOLK",
        entity: "fisherfolk",
        entityId: id,
      });
      toast({ title: "Fisherfolk deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "It may have linked catch records.",
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (f: Fisherfolk) => {
    setEditing(f);
    setForm({
      farmer_id: f.farmer_id,
      barangay: f.barangay,
      involvement: f.involvement,
      vessel_type: f.vessel_type ?? "",
      gear_type: f.gear_type ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Fisherfolk"
        description="Producers engaged in municipal fishing, linked to the producer registry."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Register Fisherfolk
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
          <LoadingState label="Loading fisherfolk…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No fisherfolk yet" description="Register the first fisherfolk." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producer</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Involvement</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Gear</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.fisherfolk_id}>
                    <TableCell className="font-medium">
                      {f.farmers ? `${f.farmers.last_name}, ${f.farmers.first_name}` : "—"}
                    </TableCell>
                    <TableCell>{f.barangay}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {f.involvement === "FULL_TIME" ? "Full-time" : "Part-time"}
                      </Badge>
                    </TableCell>
                    <TableCell>{f.vessel_type || "—"}</TableCell>
                    <TableCell>{f.gear_type || "—"}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={
                          f.farmers
                            ? `${f.farmers.first_name} ${f.farmers.last_name}`
                            : "fisherfolk profile"
                        }
                        onEdit={() => openEdit(f)}
                        onDelete={() => setToDelete(f)}
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
              label="fisherfolk"
            />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Fisherfolk" : "Register Fisherfolk"}</DialogTitle>
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
                onValueChange={(v) => {
                  const fid = Number(v);
                  const picked = producerOptions.find((f) => f.farmer_id === fid);
                  setForm((prev) => ({
                    ...prev,
                    farmer_id: fid,
                    barangay: prev.barangay.trim() ? prev.barangay : picked?.barangay ?? "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select producer" />
                </SelectTrigger>
                <SelectContent>
                  {producerOptions.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      All producers already have a profile.
                    </div>
                  ) : (
                    producerOptions.map((f) => (
                      <SelectItem key={f.farmer_id} value={String(f.farmer_id)}>
                        {f.last_name}, {f.first_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barangay">Barangay</Label>
                <Input
                  id="barangay"
                  required
                  value={form.barangay}
                  onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Involvement</Label>
                <Select
                  value={form.involvement}
                  onValueChange={(v) =>
                    setForm({ ...form, involvement: v as FishingInvolvement })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full-time</SelectItem>
                    <SelectItem value="PART_TIME">Part-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vessel">Vessel type</Label>
                <Input
                  id="vessel"
                  placeholder="e.g. Motorized banca"
                  value={form.vessel_type ?? ""}
                  onChange={(e) => setForm({ ...form, vessel_type: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gear">Gear type</Label>
                <Input
                  id="gear"
                  placeholder="e.g. Hook and line, gill net"
                  value={form.gear_type ?? ""}
                  onChange={(e) => setForm({ ...form, gear_type: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !form.farmer_id}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete fisherfolk?"
        description="This removes the fisherfolk profile and its catch records."
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.fisherfolk_id)}
      />
    </div>
  );
}
