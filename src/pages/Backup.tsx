import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Upload, Loader2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/audit";
import { formatDate } from "@/lib/utils";
import {
  downloadBackup,
  exportBackup,
  parseBackupFile,
  restoreBackup,
  type BackupFile,
} from "@/features/backup";

export default function BackupPage() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<BackupFile | null>(null);

  const exportMutation = useMutation({
    mutationFn: exportBackup,
    onSuccess: async (backup) => {
      downloadBackup(backup);
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "CREATE_BACKUP",
        entity: "backup",
        details: `Exported on ${formatDate(backup.generatedAt)}`,
      });
      toast({ title: "Backup downloaded", variant: "success" });
    },
    onError: (err: unknown) =>
      toast({ title: "Backup failed", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const restoreMutation = useMutation({
    mutationFn: (backup: BackupFile) => restoreBackup(backup),
    onSuccess: async (result) => {
      const total = Object.values(result.restored).reduce((a, b) => a + b, 0);
      await logActivity({
        userId: profile?.user_id ?? null,
        action: "RESTORE_BACKUP",
        entity: "backup",
        details: `Restored ${total} records`,
      });
      toast({ title: "Restore complete", description: `${total} records restored.`, variant: "success" });
      setPending(null);
      qc.invalidateQueries();
    },
    onError: (err: unknown) =>
      toast({ title: "Restore failed", description: err instanceof Error ? err.message : undefined, variant: "error" }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      const backup = await parseBackupFile(file);
      setPending(backup);
    } catch (err) {
      toast({
        title: "Invalid file",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  };

  const pendingCount = pending
    ? Object.values(pending.data).reduce((a, rows) => a + (rows?.length ?? 0), 0)
    : 0;

  return (
    <div>
      <PageHeader
        title="Backup & Restore"
        description="Export a full copy of the system data, or restore from a previous backup file."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" /> Create backup
            </CardTitle>
            <CardDescription>
              Downloads all agricultural records as a single JSON file you can store safely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" /> Restore from backup
            </CardTitle>
            <CardDescription>
              Imports records from an AGRODATA backup file. Existing records with the same ID are
              updated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoreMutation.isPending}
            >
              <Upload className="h-4 w-4" /> Choose backup file
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-amber-200 bg-amber-50/60">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Restoring overwrites records that share the same ID as those in the backup file. This
            action affects shared data for everyone. Always create a fresh backup before restoring.
            Note: user login accounts are managed by authentication and are not changed by restore.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title="Restore this backup?"
        description={
          pending
            ? `This will import ${pendingCount} record(s) from a backup generated ${formatDate(
                pending.generatedAt
              )}. Matching records will be overwritten.`
            : undefined
        }
        confirmLabel="Restore"
        loading={restoreMutation.isPending}
        onConfirm={() => pending && restoreMutation.mutate(pending)}
      />
    </div>
  );
}
