import { createClient } from "@/lib/supabase/server";

export interface AuditLogFilters {
  from?: string;
  to?: string;
  actorId?: string;
  tableName?: string;
  action?: string;
  recordId?: string;
}

export const AUDIT_LOG_PAGE_SIZE = 10;

export async function listAuditLog(filters: AuditLogFilters & { page?: number } = {}) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = AUDIT_LOG_PAGE_SIZE;

  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false });

  if (filters.from) query = query.gte("occurred_at", filters.from);
  if (filters.to) query = query.lte("occurred_at", filters.to);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.tableName) query = query.eq("table_name", filters.tableName);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.recordId) query = query.eq("record_id", filters.recordId);

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

export async function listAuditLogForRecord(tableName: string, recordId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAuditActors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("actor_id, actor_email")
    .not("actor_id", "is", null)
    .limit(500);
  if (error) throw error;

  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.actor_id && !seen.has(row.actor_id)) {
      seen.set(row.actor_id, row.actor_email ?? row.actor_id);
    }
  }
  return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
}
