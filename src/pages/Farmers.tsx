import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateFilterInput } from "@/components/ui/date-filter-input";
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
  createFarmer,
  deleteFarmer,
  fetchDistinctBarangays,
  fetchFarmerSectors,
  fetchFarmers,
  findPossibleDuplicates,
  updateFarmer,
  type FarmerInput,
  type FarmerSectors,
} from "@/features/farmers";
import type { Farmer, Sex } from "@/types/database";

const SECTOR_LABELS: { key: keyof FarmerSectors; label: string }[] = [
  { key: "crops", label: "Crops" },
  { key: "livestock", label: "Livestock" },
  { key: "fisheries", label: "Fisheries" },
  { key: "aquaculture", label: "Aquaculture" },
];

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
  const [sectorFilter, setSectorFilter] = React.useState<string>("ALL");
  const [barangayFilter, setBarangayFilter] = React.useState<string>("ALL");
  const [sexFilter, setSexFilter] = React.useState<string>("ALL");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Farmer | null>(null);
  const [form, setForm] = React.useState<FarmerInput>(emptyForm);
  const [toDelete, setToDelete] = React.useState<Farmer | null>(null);
  const [duplicates, setDuplicates] = React.useState<Farmer[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [sectorFilter, barangayFilter, sexFilter, fromDate, toDate]);

  const PAGE_SIZE = 12;

  const barangayQuery = useQuery({
    queryKey: ["farmer-barangays"],
    queryFn: fetchDistinctBarangays,
  });
  const barangayList = barangayQuery.data ?? [];

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: [
      "farmers",
      debounced,
      page,
      sectorFilter,
      barangayFilter,
      sexFilter,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      fetchFarmers(debounced, page, PAGE_SIZE, {
        sector: sectorFilter as keyof FarmerSectors | "ALL",
        barangay: barangayFilter,
        sex: sexFilter as Sex | "ALL",
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = data?.rows;
  const farmers = React.useMemo(() => rows ?? [], [rows]);

  const farmerIds = React.useMemo(() => farmers.map((f) => f.farmer_id), [farmers]);

  const { data: sectors } = useQuery({
    queryKey: ["farmer-sectors", farmerIds],
    queryFn: () => fetchFarmerSectors(farmerIds),
    enabled: farmerIds.length > 0,
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["farmers"] });
    qc.invalidateQueries({ queryKey: ["farmer-barangays"] });
    qc.invalidateQueries({ queryKey: ["farmer-options"] });
    qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const hasActiveFilters =
    Boolean(search) ||
    sectorFilter !== "ALL" ||
    barangayFilter !== "ALL" ||
    sexFilter !== "ALL" ||
    Boolean(fromDate) ||
    Boolean(toDate);

  const resetFilters = () => {
    setSearch("");
    setDebounced("");
    setSectorFilter("ALL");
    setBarangayFilter("ALL");
    setSexFilter("ALL");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

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
      setDuplicates([]);
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

  /**
   * Register Producer AF-1: warn about a possible duplicate before saving so
   * staff can review the existing record instead of silently creating another
   * profile for the same person.
   */
  const submitForm = async () => {
    if (duplicates.length > 0) {
      saveMutation.mutate();
      return;
    }
    setCheckingDuplicates(true);
    try {
      const matches = await findPossibleDuplicates(form, editing?.farmer_id);
      if (matches.length > 0) {
        setDuplicates(matches);
        return;
      }
      saveMutation.mutate();
    } catch {
      // Detection is advisory only; the database constraint remains the
      // authoritative guard against exact duplicates.
      saveMutation.mutate();
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDuplicates([]);
    setDialogOpen(true);
  };

  const openEdit = (f: Farmer) => {
    setEditing(f);
    setDuplicates([]);
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

      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search farmer name, contact…"
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search farmers"
          />
        </div>

        <div className="w-full sm:w-36">
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger aria-label="Filter by sector">
              <SelectValue placeholder="All sectors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sectors</SelectItem>
              {SECTOR_LABELS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <Select value={barangayFilter} onValueChange={setBarangayFilter}>
            <SelectTrigger aria-label="Filter by barangay">
              <SelectValue placeholder="All barangays" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All barangays</SelectItem>
              {barangayList.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-32">
          <Select value={sexFilter} onValueChange={setSexFilter}>
            <SelectTrigger aria-label="Filter by sex">
              <SelectValue placeholder="All sexes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sexes</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-44">
          <DateFilterInput
            id="reg-from-date"
            placeholder="From"
            value={fromDate}
            max={toDate || undefined}
            onChange={setFromDate}
          />
        </div>
        <div className="w-full sm:w-44">
          <DateFilterInput
            id="reg-to-date"
            placeholder="To"
            value={toDate}
            min={fromDate || undefined}
            onChange={setToDate}
          />
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

      <Card>
        {isLoading ? (
          <LoadingState label="Loading farmers…" />
        ) : isError ? (
          <ErrorState />
        ) : farmers.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No farmers match your filters" : "No farmers found"}
            description={
              hasActiveFilters
                ? "Try clearing or adjusting your search and filter criteria."
                : "Register the first farmer to get started."
            }
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline">
                  Reset filters
                </Button>
              ) : (
                <Button onClick={openCreate} variant="outline">
                  <Plus className="h-4 w-4" /> Register Farmer
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead className="text-center">Sectors</TableHead>
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
                  <TableCell className="text-center">
                    {(() => {
                      const active = SECTOR_LABELS.filter(
                        (s) => sectors?.[f.farmer_id]?.[s.key]
                      );
                      if (active.length === 0) {
                        return (
                          <span className="block text-center text-xs text-muted-foreground">No records yet</span>
                        );
                      }
                      return (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {active.map((s) => (
                            <Badge key={s.key}>{s.label}</Badge>
                          ))}
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{f.barangay}</TableCell>
                  <TableCell>{f.contact_no}</TableCell>
                  <TableCell>{formatDate(f.registration_date)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      label={`${f.first_name} ${f.last_name}`}
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
            label="farmers"
          />
          </>
        )}
      </Card>

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDuplicates([]);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Farmer" : "Register Farmer"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitForm();
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

            {duplicates.length > 0 && (
              <div
                role="alert"
                className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <p className="font-medium">Possible duplicate producer found</p>
                <p>
                  A producer with the same name and matching birthdate or barangay is already
                  registered. Review the existing record below, or confirm to save this profile
                  anyway.
                </p>
                <ul className="space-y-1">
                  {duplicates.map((d) => (
                    <li key={d.farmer_id}>
                      {d.last_name}, {d.first_name} · {d.barangay} · born {formatDate(d.birthdate)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || checkingDuplicates}
                variant={duplicates.length > 0 ? "destructive" : "default"}
              >
                {saveMutation.isPending
                  ? "Saving…"
                  : checkingDuplicates
                    ? "Checking…"
                    : duplicates.length > 0
                      ? "Save anyway"
                      : editing
                        ? "Save changes"
                        : "Register"}
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
