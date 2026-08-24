import { unstable_cache } from "next/cache";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
// src/components/app-shell/permissions-context.tsx) — fetched in
// (app)/layout.tsx on every single navigation (layouts re-run their data
// fetching on a full page load), which made this one of the most-repeated
// queries in the app for no reason: role_permissions is seeded, read-only
// reference data (see CLAUDE.md's Permissions section) that's never edited
// through the app, so it's the same 3 possible results (one per role)
// forever. Cached here instead of refetched every time.
//
// Uses the admin client, not the per-request cookie-bound one:
// unstable_cache can't wrap a function that reads cookies (Next.js forbids
// it), which the regular client touches internally to resolve auth/RLS.
// The admin client has no such dependency, and bypassing RLS here is safe
// — the original comment's point still holds (role_permissions' RLS
// already allows any authenticated user to select it), this just reads
// the same rows a different way.
export const getPermissionMapForRole = unstable_cache(
  async (role: UserRole): Promise<Partial<Record<PermissionKey, PermissionScope>>> => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("role_permissions")
      .select("permission_key, scope")
      .eq("role", role);

    const map: Partial<Record<PermissionKey, PermissionScope>> = {};
    for (const row of data ?? []) {
      map[row.permission_key as PermissionKey] = row.scope;
    }
    return map;
  },
  ["role-permissions-map"],
  // No admin UI ever writes to role_permissions, so a long revalidate
  // window is just a safety net for a direct SQL edit, not a freshness
  // requirement.
  { revalidate: 3600 },
);
