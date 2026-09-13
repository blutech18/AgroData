import * as React from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Power, Plus, RotateCcw, Search } from "lucide-react";
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
  DialogDescription,
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
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TablePagination } from "@/components/shared/TablePagination";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate } from "@/lib/utils";
import {
  createUserAccount,
  fetchRoles,
  fetchUsers,
  setUserStatus,
  updateUserProfile,
  type NewUserInput,
  type UserFilters,
  type UserProfileInput,
} from "@/features/users";
import type { AppUser } from "@/types/database";

const emptyForm: NewUserInput = {
  role_id: 0,
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
};

export default function UsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [statusTarget, setStatusTarget] = React.useState<AppUser | null>(null);
  const [form, setForm] = React.useState<NewUserInput>(emptyForm);
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  React.useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  const PAGE_SIZE = 12;

  const filters = React.useMemo<UserFilters>(
    () => ({
      roleId: roleFilter === "ALL" ? undefined : Number(roleFilter),
      status:
        statusFilter === "ALL"
          ? undefined
          : (statusFilter as "ACTIVE" | "INACTIVE"),
    }),
    [roleFilter, statusFilter]
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["users", debounced, page, filters],
    queryFn: () => fetchUsers(debounced, page, PAGE_SIZE, filters),
    placeholderData: keepPreviousData,
  });
  const roles = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const hasActiveFilters = Boolean(
    debounced || roleFilter !== "ALL" || statusFilter !== "ALL"
  );

  const resetFilters = () => {
    setSearch("");
    setDebounced("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const users = data?.rows ?? [];

  const createMutation = useMutation({
    mutationFn: () => createUserAccount(form),
    onSuccess: async ({ user: saved, invited }) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "CREATE_USER",
        entity: "users",
        entityId: saved.user_id,
        details: saved.username,
      });
      toast({
        title: "Account created",
        description: invited
          ? `An invitation email was sent to ${saved.email}.`
          : `${saved.first_name} can now sign in.`,
        variant: "success",
      });
      setCreateOpen(false);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({
        title: "Could not create account",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      }),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing) throw new Error("No user selected");
      const { role_id, first_name, last_name, email, username } = form;
      const update: UserProfileInput = { role_id, first_name, last_name, email, username };
      return updateUserProfile(editing.user_id, update);
    },
    onSuccess: async (saved) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "UPDATE_USER",
        entity: "users",
        entityId: saved.user_id,
        details: saved.username,
      });
      toast({ title: "User updated", variant: "success" });
      setEditing(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not save", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACTIVE" | "INACTIVE" }) =>
      setUserStatus(id, status),
    onSuccess: async (_v, vars) => {
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "SET_USER_STATUS",
        entity: "users",
        entityId: vars.id,
        details: vars.status,
      });
      toast({ title: "Status updated", variant: "success" });
      setStatusTarget(null);
      invalidate();
    },
    onError: (err: unknown) =>
      toast({ title: "Could not update status", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const defaultRoleId = roles.data?.find((r) => r.role_name === "OMA Staff")?.role_id ?? 0;

  const openCreate = () => {
    setForm({ ...emptyForm, role_id: defaultRoleId });
    setCreateOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditing(u);
    setForm({
      role_id: u.role_id ?? 0,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      username: u.username,
      password: "",
    });
  };

  const roleOptions = roles.data ?? [];

  // Shared profile fields used by both create and edit dialogs.
  const profileFields = (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fn">First name</Label>
          <Input
            id="fn"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ln">Last name</Label>
          <Input
            id="ln"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="un">Username</Label>
        <Input
          id="un"
          required
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="em">Email</Label>
        <Input
          id="em"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select
          value={form.role_id ? String(form.role_id) : ""}
          onValueChange={(v) => setForm({ ...form, role_id: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((r) => (
              <SelectItem key={r.role_id} value={String(r.role_id)}>
                {r.role_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div>
      <PageHeader
        title="User Accounts"
        description="Create and manage login accounts for OMA personnel."
      >
        <Button onClick={openCreate} disabled={roleOptions.length === 0}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </PageHeader>

      <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search user name, email, or username…"
            className="w-full pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search users"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger aria-label="Filter by role">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              {roleOptions.map((r) => (
                <SelectItem key={r.role_id} value={String(r.role_id)}>
                  {r.role_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-40">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
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
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : users.length === 0 ? (
          <EmptyState
            title={hasActiveFilters ? "No user accounts match your filters" : "No user accounts yet"}
            description={
              hasActiveFilters
                ? "Try clearing your filters or changing your search."
                : "Add the first OMA staff or administrator account."
            }
            action={
              hasActiveFilters ? (
                <Button onClick={resetFilters} variant="outline" size="sm">
                  Reset filters
                </Button>
              ) : (
                <Button onClick={openCreate} variant="outline">
                  <Plus className="h-4 w-4" /> Add User
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
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">
                    {u.first_name} {u.last_name}
                  </TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.user_roles?.role_name ?? "—"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.account_status === "ACTIVE" ? "success" : "destructive"}>
                      {u.account_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(u.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(u)}
                        title={`Edit ${u.first_name} ${u.last_name}`}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">
                          Edit {u.first_name} {u.last_name}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={`${u.account_status === "ACTIVE" ? "Deactivate" : "Activate"} ${
                          u.first_name
                        } ${u.last_name}`}
                        onClick={() => setStatusTarget(u)}
                      >
                        <Power className="h-4 w-4" />
                        <span className="sr-only">
                          {u.account_status === "ACTIVE" ? "Deactivate" : "Activate"}{" "}
                          {u.first_name} {u.last_name}
                        </span>
                      </Button>
                    </div>
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
            label="users"
          />
          </>
        )}
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Creates the login account and its OMA profile together. Leave the password blank to
              email an invitation so the user sets their own password.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.role_id) {
                toast({ title: "Select a role", variant: "error" });
                return;
              }
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            {profileFields}
            <div className="space-y-2">
              <Label htmlFor="pw">Temporary password (optional)</Label>
              <Input
                id="pw"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="Leave blank to send an invitation email"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {form.password
                  ? "Share this with the user; they can change it later."
                  : "The user will receive an email invitation and choose their own password."}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating…" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            {profileFields}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate / deactivate confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title={
          statusTarget?.account_status === "ACTIVE"
            ? "Deactivate account?"
            : "Activate account?"
        }
        description={
          statusTarget
            ? statusTarget.account_status === "ACTIVE"
              ? `${statusTarget.first_name} ${statusTarget.last_name} will no longer be able to sign in until reactivated.`
              : `${statusTarget.first_name} ${statusTarget.last_name} will be able to sign in again.`
            : undefined
        }
        confirmLabel={statusTarget?.account_status === "ACTIVE" ? "Deactivate" : "Activate"}
        loading={statusMutation.isPending}
        onConfirm={() =>
          statusTarget &&
          statusMutation.mutate({
            id: statusTarget.user_id,
            status: statusTarget.account_status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
          })
        }
      />
    </div>
  );
}
