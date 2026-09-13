import { supabase } from "@/lib/supabase";
import type { AuditLog } from "@/types/database";

export interface AuditLogPage {
  rows: AuditLog[];
  total: number;
}

export interface AuditLogFilters {
  actionGroup?: string;
  entity?: string;
  from?: string;
  to?: string;
}

export async function fetchAuditLogs(
  page: number,
  pageSize: number,
  search = "",
  filters: AuditLogFilters = {}
): Promise<AuditLogPage> {
  let query = supabase
    .from("audit_logs")
    .select("*, users(first_name, last_name, username)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`action.ilike.${term},entity.ilike.${term},details.ilike.${term}`);
  }

  if (filters.actionGroup && filters.actionGroup !== "ALL") {
    if (filters.actionGroup === "AUTH") {
      query = query.in("action", ["LOGIN", "LOGOUT"]);
    } else {
      query = query.ilike("action", `${filters.actionGroup}%`);
    }
  }

  if (filters.entity && filters.entity !== "ALL") {
    query = query.eq("entity", filters.entity);
  }

  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00`);
  }

  if (filters.to) {
    query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) throw error;
  return { rows: (data as AuditLog[]) ?? [], total: count ?? 0 };
}
