import { supabase } from "./supabase";

/**
 * Records a system activity in the audit log (Use Case 16: Audit Logs &
 * System Monitoring). Failures are swallowed so logging never blocks a
 * primary operation.
 */
export async function logActivity(params: {
  userId: number | null;
  action: string;
  entity?: string;
  entityId?: string | number;
  details?: string;
}) {
  try {
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      entity: params.entity ?? null,
      entity_id: params.entityId !== undefined ? String(params.entityId) : null,
      details: params.details ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[AGRODATA] Failed to write audit log:", err);
  }
}
