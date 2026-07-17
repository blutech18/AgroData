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
import { formatDate } from "@/lib/utils";
import { SimplePagination } from "@/components/shared/SimplePagination";
import {
  createFarmer,
  deleteFarmer,
  fetchFarmers,
  updateFarmer,
  type FarmerInput,
} from "@/features/farmers";
import type { Farmer } from "@/types/database";

const emptyForm: FarmerInput = {
  first_name: "",
  last_name: "",
  sex: "MALE",
  birthdate: "",
  contact_no: "",
  address: "",
  barangay: "",
};

export default function FarmersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Farmer | null>(null);
  const [form, setForm] = React.useState<FarmerInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<Farmer | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["farmers", debounced, page],
    queryFn: () => fetchFarmers(debounced, page, 10),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["farmers"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return updateFarmer(editing.farmer_id, form);
      return createFarmer(form);
    },
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: editing ? "UPDATE_FARMER" : "CREATE_FARMER",
        entity: "farmers",
        entityId: saved.farmer_id,
        details: `${saved.first_name} ${saved.last_name}`,
      });
      toast({
        title: editing ? "Farmer updated" : "Farmer registered",
        variant: "success",
      });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save farmer";
      toast({
        title: "Could not save",
        description: msg.includes("duplicate")
          ? "A farmer with the same name, birthdate, and barangay already exists."
          : msg,
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFarmer(id),
    onSuccess: async (_v, id) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "DELETE_FARMER",
        entity: "farmers",
        entityId: id,
      });
      toast({ title: "Farmer deleted", variant: "success" });
      setToDelete(null);
      invalidate();
    },
    onError: (err: unknown) => {
      toast({
        title: "Could not delete",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (f: Farmer) => {
    setEditing(f);
    setForm({
      first_name: f.first_name,
      last_name: f.last_name,
      sex: f.sex,
      birthdate: f.birthdate,
      contact_no: f.contact_no,
      address: f.address,
      barangay: f.barangay,
    });
    setDialogOpen(true);
  };

  const farmers = data?.data ?? [];
  const total = data?.count ?? 0;

  return (
    <div>
      <PageHeader
        title="Farmer Profiles"
        description="Register and manage farmer records for the municipality."
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Register Farmer
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name, barangay, contact…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        {isLoading ? (
          <LoadingState label="Loading farmers…" />
        ) : isError ? (
          <ErrorState />
        ) : farmers.length === 0 ? (
          <EmptyState
            title="No farmers found"
            description="Register the first farmer to get started."
            action={
              <Button onClick={openCreate} variant="outline">
                <Plus className="h-4 w-4" /> Register Farmer
              </Button>
            }
          />
        ) : (
          <>
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Barangay</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map((f) => (
                <TableRow key={f.farmer_id}>
                  <TableCell className="font-medium">
                    {f.last_name}, {f.first_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{f.sex}</Badge>
                  </TableCell>
                  <TableCell>{f.barangay}</TableCell>
                  <TableCell>{f.contact_no}</TableCell>
                  <TableCell>{formatDate(f.registration_date)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToDelete(f)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Farmer" : "Register Farmer"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sex</Label>
                <Select
                  value={form.sex}
                  onValueChange={(v) => setForm({ ...form, sex: v as FarmerInput["sex"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birthdate</Label>
                <Input
                  id="birthdate"
                  type="date"
                  required
                  value={form.birthdate}
                  onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_no">Contact no.</Label>
                <Input
                  id="contact_no"
                  required
                  maxLength={15}
                  placeholder="09XXXXXXXXX"
                  value={form.contact_no}
                  onChange={(e) => setForm({ ...form, contact_no: e.target.value })}
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

            <div className="space-y-2">
              <Label htmlFor="address">Complete address</Label>
              <Input
                id="address"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete farmer?"
        description={
          toDelete
            ? `This will permanently remove ${toDelete.first_name} ${toDelete.last_name} and all linked farms and records.`
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.farmer_id)}
      />
    </div>
  );
}
