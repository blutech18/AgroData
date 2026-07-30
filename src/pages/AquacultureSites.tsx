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
  createAquacultureSite,
  deleteAquacultureSite,
  fetchAquacultureSites,
  updateAquacultureSite,
  type AquacultureSiteInput,
} from "@/features/aquaculture";
import { fetchFarmerOptions } from "@/features/farmers";
import type { AquaSiteType, AquacultureSite, WaterEnvironment } from "@/types/database";

const emptyForm: AquacultureSiteInput = {
  farmer_id: 0,
  site_name: "",
  barangay: "",
  site_type: "POND",
  water_environment: "FRESHWATER",
  area_size: null,
};

const SITE_TYPES: AquaSiteType[] = ["POND", "CAGE", "TANK", "PEN"];
const ENVIRONMENTS: WaterEnvironment[] = ["FRESHWATER", "BRACKISH", "MARINE"];

export default function AquacultureSitesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AquacultureSite | null>(null);
  const [form, setForm] = React.useState<AquacultureSiteInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<AquacultureSite | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const PAGE_SIZE = 12;

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["aqua-sites", debounced, page],
    queryFn: () => fetchAquacultureSites(debounced, page, PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
  const farmers = useQuery({ queryKey: ["farmer-options"], queryFn: fetchFarmerOptions });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["aqua-sites"] });
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows ?? [];

  const saveMutation = useMutation({
    mutationFn: () =>
      editing ? updateAquacultureSite(editing.site_id, form) : createAquacultureSite(form),
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_AQUA_SITE" : "CREATE_AQUA_SITE",
        entity: "aquaculture_sites",
        entityId: saved.site_id,
        details: saved.site_name,
      });
      toast({ title: editing ? "Site updated" : "Site added", variant: "success" });
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
    mutationFn: (id: number) => deleteAquacultureSite(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_AQUA_SITE",
        entity: "aquaculture_sites",
        entityId: id,
      });
      toast({ title: "Site deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : "It may have linked culture cycles.",
        variant: "error",
      }),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };
  const openEdit = (s: AquacultureSite) => {
    setEditing(s);
    setForm({
      farmer_id: s.farmer_id,
      site_name: s.site_name,
      barangay: s.barangay,
      site_type: s.site_type,
      water_environment: s.water_environment,
      area_size: s.area_size,
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Aquaculture Sites"
        description="Ponds, cages, tanks, and pens operated by producers for fish farming."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Site
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search site or barangay…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState label="Loading sites…" />
        ) : isError ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState title="No aquaculture sites" description="Add the first site to begin." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Producer</TableHead>
                  <TableHead>Barangay</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Area (ha)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.site_id}>
                    <TableCell className="font-medium">{s.site_name}</TableCell>
                    <TableCell>
                      {s.farmers ? `${s.farmers.last_name}, ${s.farmers.first_name}` : "—"}
                    </TableCell>
                    <TableCell>{s.barangay}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.site_type}</Badge>
                    </TableCell>
                    <TableCell>{s.water_environment}</TableCell>
                    <TableCell>{s.area_size ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={s.site_name}
                        onEdit={() => openEdit(s)}
                        onDelete={() => setToDelete(s)}
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
              label="sites"
            />
          </>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Site" : "Add Aquaculture Site"}</DialogTitle>
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
                <Label htmlFor="site_name">Site name</Label>
                <Input
                  id="site_name"
                  required
                  value={form.site_name}
                  onChange={(e) => setForm({ ...form, site_name: e.target.value })}
                />
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Site type</Label>
                <Select
                  value={form.site_type}
                  onValueChange={(v) => setForm({ ...form, site_type: v as AquaSiteType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select
                  value={form.water_environment}
                  onValueChange={(v) =>
                    setForm({ ...form, water_environment: v as WaterEnvironment })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Area (ha)</Label>
                <Input
                  id="area"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.area_size ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, area_size: e.target.value ? Number(e.target.value) : null })
                  }
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
        title="Delete site?"
        description={toDelete ? `Remove "${toDelete.site_name}" and its culture cycles.` : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.site_id)}
      />
    </div>
  );
}
