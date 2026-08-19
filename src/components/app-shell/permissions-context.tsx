"use client";

import { createContext, useContext } from "react";
import type { PermissionKey, PermissionScope } from "@/lib/database.types";

export type PermissionMap = Partial<Record<PermissionKey, PermissionScope>>;

const PermissionsContext = createContext<PermissionMap>({});

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: PermissionMap;
  children: React.ReactNode;
}) {
  return (
    <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>
  );
}

// A cached CLIENT-SIDE MIRROR of the viewer's role_permissions row, hydrated
// once from the server in (app)/layout.tsx. This is NOT a security
// boundary — it exists purely so components can show/hide UI (a "Schedule
// meeting" button, a Settings > Organization nav link) without a network
// round-trip. It can be stale, inspected, or spoofed in devtools, and none
// of that matters: every real check happens server-side, in has_permission()
// via RLS and via the requirePermission() guard every Server Action calls.
// Never branch a write, a redirect, or anything security-relevant on this.
export function usePermissions() {
  const permissions = useContext(PermissionsContext);

  function scopeFor(key: PermissionKey): PermissionScope | null {
    return permissions[key] ?? null;
  }

  function can(key: PermissionKey): boolean {
    return scopeFor(key) !== null;
  }

  return { can, scopeFor };
}
