import { supabase } from "@/lib/supabase";

// Order matters for restore (parents before children).
const TABLES = [
  "user_roles",
  "users",
  "farmers",
  "crops",
  "farms",
  "farm_plots",
  "planting_records",
  "harvest_inventory",
  "yield_statistics",
  "audit_logs",
] as const;

type TableName = (typeof TABLES)[number];

const PK: Record<TableName, string> = {
  user_roles: "role_id",
  users: "user_id",
  farmers: "farmer_id",
  crops: "crop_id",
  farms: "farm_id",
  farm_plots: "plot_id",
  planting_records: "planting_id",
  harvest_inventory: "inventory_id",
  yield_statistics: "stat_id",
  audit_logs: "log_id",
};

export interface BackupFile {
  app: "AGRODATA";
  version: number;
  generatedAt: string;
  data: Record<string, unknown[]>;
}

export async function exportBackup(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const { data: rows, error } = await supabase.from(table).select("*");
    if (error) throw error;
    data[table] = rows ?? [];
  }
  return {
    app: "AGRODATA",
    version: 1,
    generatedAt: new Date().toISOString(),
    data,
  };
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agrodata-backup-${backup.generatedAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface RestoreResult {
  restored: Record<string, number>;
}

/**
 * Restores records from a backup file. Rows are upserted by primary key so
 * relationships are preserved, then identity sequences are resynced so future
 * inserts don't collide. Existing records with matching IDs are updated.
 */
export async function restoreBackup(backup: BackupFile): Promise<RestoreResult> {
  if (backup?.app !== "AGRODATA" || !backup.data) {
    throw new Error("Invalid AGRODATA backup file.");
  }

  const restored: Record<string, number> = {};

  for (const table of TABLES) {
    const rows = (backup.data[table] as Record<string, unknown>[]) ?? [];
    if (rows.length === 0) {
      restored[table] = 0;
      continue;
    }

    // audit_logs has no UPDATE policy -> insert only, skipping duplicates.
    const ignoreDuplicates = table === "audit_logs";
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: PK[table], ignoreDuplicates });
    if (error) throw new Error(`Failed restoring "${table}": ${error.message}`);
    restored[table] = rows.length;
  }

  // Advance identity sequences past the restored IDs.
  const { error: rpcError } = await supabase.rpc("resync_identity_sequences");
  if (rpcError) {
    // Non-fatal: data is restored, but warn about sequence state.
    // eslint-disable-next-line no-console
    console.warn("[AGRODATA] resync_identity_sequences failed:", rpcError.message);
  }

  return { restored };
}

export async function parseBackupFile(file: File): Promise<BackupFile> {
  const text = await file.text();
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
  if (parsed?.app !== "AGRODATA") {
    throw new Error("This does not look like an AGRODATA backup file.");
  }
  return parsed;
}
