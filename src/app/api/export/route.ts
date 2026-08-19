import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = value === null || value === undefined ? "" : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n");
}

// Not a Server Action — it needs to return a raw file download, which
// Server Actions can't do. Auth/authorization checked the same way as
// everywhere else; the export itself is one of the events CLAUDE.md calls
// out as needing an explicit audit_log entry, since it's not a row
// mutation the trigger would otherwise catch.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const table = request.nextUrl.searchParams.get("table");
  if (table !== "attendance" && table !== "homework" && table !== "audit") {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  let rows: Record<string, unknown>[] = [];
  if (table === "attendance") {
    const { data } = await supabase
      .from("attendance")
      .select("event_id, profile_id, status, note, marked_at");
    rows = data ?? [];
  } else if (table === "homework") {
    const { data } = await supabase
      .from("submissions")
      .select("assignment_id, profile_id, status, score, submitted_at, reviewed_at");
    rows = data ?? [];
  } else {
    // audit — current filter set, same params as the viewer page.
    const params = request.nextUrl.searchParams;
    let query = supabase
      .from("audit_log")
      .select("occurred_at, table_name, record_id, action, actor_email, changed_fields")
      .order("occurred_at", { ascending: false })
      .limit(1000);
    const from = params.get("from");
    const to = params.get("to");
    const actorId = params.get("actorId");
    const tableName = params.get("tableName");
    const action = params.get("action");
    const recordId = params.get("recordId");
    if (from) query = query.gte("occurred_at", from);
    if (to) query = query.lte("occurred_at", to);
    if (actorId) query = query.eq("actor_id", actorId);
    if (tableName) query = query.eq("table_name", tableName);
    if (action) query = query.eq("action", action);
    if (recordId) query = query.eq("record_id", recordId);
    const { data } = await query;
    rows = data ?? [];
  }

  const csv = toCsv(rows);

  const adminClient = createAdminClient();
  await adminClient.from("audit_log").insert({
    table_name: table,
    action: "data_export",
    actor_id: user.id,
    actor_role: profile.role,
    actor_email: user.email ?? null,
    context: { source: "app", row_count: rows.length },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${table}-export.csv"`,
    },
  });
}
