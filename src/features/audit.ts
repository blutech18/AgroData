import { supabase } from "@/lib/supabase";
import type { AuditLog } from "@/types/database";

export interface AuditLogPage {
  rows: AuditLog[];
  total: number;
}

export async function fetchAuditLogs(page: number, pageSize: number): Promise<AuditLogPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*, users(first_name, last_name, username)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { rows: (data as AuditLog[]) ?? [], total: count ?? 0 };
}
