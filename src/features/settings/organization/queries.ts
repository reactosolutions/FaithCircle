import { createClient } from "@/lib/supabase/server";

export async function getOrgSettings() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("org_settings").select("*").eq("id", true).single();
  if (error) return null;
  return data;
}

export async function listPendingJoinRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return data;
}

// The read-only matrix for Settings > Organization > Roles — every
// (permission, role) pair with its scope, joined and grouped in JS rather
// than a PostgREST embed (this hand-written Database type declares
// `Relationships: []` on every table, so an embedded select wouldn't
// type-check).
export async function listPermissionMatrix() {
  const supabase = await createClient();
  const [{ data: permissions, error: permError }, { data: rolePermissions, error: rpError }] =
    await Promise.all([
      supabase.from("permissions").select("key, resource, action, description").order("key"),
      supabase.from("role_permissions").select("role, permission_key, scope"),
    ]);
  if (permError) throw permError;
  if (rpError) throw rpError;

  return (permissions ?? []).map((permission) => ({
    ...permission,
    scopes: Object.fromEntries(
      (rolePermissions ?? [])
        .filter((rp) => rp.permission_key === permission.key)
        .map((rp) => [rp.role, rp.scope]),
    ) as Partial<Record<"admin" | "administrative" | "student", "own" | "circle" | "all">>,
  }));
}

