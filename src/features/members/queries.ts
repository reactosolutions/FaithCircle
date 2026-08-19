import { cache } from "react";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import type { ProfileStatus, UserRole } from "@/lib/database.types";

export interface MemberFilters {
  search?: string;
  role?: UserRole;
  status?: ProfileStatus;
  page?: number;
  pageSize?: number;
}

export const MEMBERS_PAGE_SIZE = 20;

// PostgREST's `.or()` filter treats "," and "()" as syntax, so a search
// term containing them would otherwise break the query string. Wrapping
// the value in double quotes (with internal quotes escaped) is the
// documented way to pass a literal value through it.
function quoteFilterValue(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export async function listMembers(filters: MemberFilters = {}) {
  const supabase = await createClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? MEMBERS_PAGE_SIZE;

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, status, can_host, avatar_url", { count: "exact" })
    .order("full_name", { ascending: true });

  if (filters.role) {
    query = query.eq("role", filters.role);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.search?.trim()) {
    const term = quoteFilterValue(`%${filters.search.trim()}%`);
    query = query.or(`full_name.ilike.${term},email.ilike.${term}`);
  }

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { members: data, total: count ?? 0, page, pageSize };
}

// Deliberately separate from listMembers' base select — phone is gated by
// members.view_contact (admin=all, administrative=circle, student=none),
// so it can't ride along in the shared list payload every viewer receives.
// Only call this from a path already restricted to viewers who may see it.
export async function getPhonesByIds(ids: string[]) {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, phone").in("id", ids);
  return Object.fromEntries((data ?? []).map((row) => [row.id, row.phone]));
}

export async function getMember(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

// Wrapped in React's cache() for the same reason getCachedUser() is (see
// that function's comment) — nearly every page and layout in the (app)
// shell calls this at least once, and without memoization each call was
// its own round trip to the same row within a single request/render.
export const getViewerProfile = cache(async () => {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});
