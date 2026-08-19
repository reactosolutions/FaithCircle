import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { PermissionKey, PermissionScope, UserRole } from "@/lib/database.types";

type RequirePermissionResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string };

// The ONLY guard Server Actions call to check permission — wraps
// public.has_permission() via RPC, which is itself the single place
// permission logic lives (see CLAUDE.md's Permissions section). Every
// permission-gated Server Action calls this as its first statement;
// eslint-rules/require-permission-guard.mjs flags any exported action in an
// actions.ts file that doesn't (with a small allowlist for files that are
// genuinely permission-free — sign-in/up, self-only notification actions).
//
// The failure branch returns the same { ok: false, error } shape every
// other Server Action returns, so callers can just `return actor` on
// failure without re-wrapping it.
export async function requirePermission(
  key: PermissionKey,
  target: { circleId?: string | null; profileId?: string | null } = {},
): Promise<RequirePermissionResult> {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return { ok: false, error: "You need to sign in again." };
  }

  const { data: allowed, error } = await supabase.rpc("has_permission", {
    actor: user.id,
    key,
    target_circle: target.circleId ?? null,
    target_profile: target.profileId ?? null,
  });

  if (error || !allowed) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  return { ok: true, supabase, userId: user.id };
}

// Feeds usePermissions()'s client-side mirror (see
// src/components/app-shell/permissions-context.tsx) — fetched once in
// (app)/layout.tsx per request. Read-only reference data (role_permissions'
// RLS allows any authenticated user to select it), so no permission check
// needed here.
export async function getPermissionMapForRole(
  role: UserRole,
): Promise<Partial<Record<PermissionKey, PermissionScope>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_key, scope")
    .eq("role", role);

  const map: Partial<Record<PermissionKey, PermissionScope>> = {};
  for (const row of data ?? []) {
    map[row.permission_key as PermissionKey] = row.scope;
  }
  return map;
}
