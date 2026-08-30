// RLS / permission-matrix test suite — hits the REAL hosted Supabase
// project configured in .env.local, signed in as the real seeded demo
// users from supabase/seed.sql (all share the password FaithCircle123!).
//
// Prerequisites to run this: `npm run test`
//   1. supabase/schema.sql has been run (creates has_permission(),
//      role_permissions, circle_leaders, etc.)
//   2. supabase/seed.sql has been run (creates admin@faithcircle.test,
//      leader.omar@faithcircle.test, student.layla@faithcircle.test, and
//      "Thursday Night Circle" with all of them as members)
//   3. Network access to the Supabase project from wherever this runs.
//
// This is a representative subset of the permission matrix — the two rows
// CLAUDE.md calls out as mattering most (submissions.create being 'own'
// for every role, roles.assign_admin being admin-only), plus a spread
// across 'all'/'circle'/'own'/denied — not exhaustive coverage of all 25
// permissions × 3 roles. It also writes real rows to your seeded circle's
// data (an attendance upsert); re-run seed.sql to reset if that matters.
//
// One real gap: the seed data has exactly one circle with every seeded
// user in it, so there's no seeded "student in a DIFFERENT circle" account
// to exercise circle-isolation deny-cases against. Flagged rather than
// worked around with ad-hoc fixture creation against a shared dev project.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = "FaithCircle123!";

async function signInAs(email: string): Promise<SupabaseClient<Database>> {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — check .env.local.",
    );
  }
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    throw new Error(
      `Could not sign in as ${email} (${error.message}). Has supabase/seed.sql been run against this project?`,
    );
  }
  return client;
}

async function actorId(client: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Expected a signed-in user.");
  return user.id;
}

let admin: SupabaseClient<Database>;
let leader: SupabaseClient<Database>; // administrative, leads "Thursday Night Circle"
let student: SupabaseClient<Database>; // plain member of the same circle
let circleId: string;
let studentId: string;
let leaderId: string;
let adminId: string;

beforeAll(async () => {
  admin = await signInAs("admin@faithcircle.test");
  leader = await signInAs("leader.omar@faithcircle.test");
  student = await signInAs("student.layla@faithcircle.test");

  adminId = await actorId(admin);
  leaderId = await actorId(leader);
  studentId = await actorId(student);

  const { data: circle, error } = await admin
    .from("circles")
    .select("id")
    .eq("name", "Thursday Night Circle")
    .single();
  if (error || !circle) {
    throw new Error("Seed circle 'Thursday Night Circle' not found — has seed.sql been run?");
  }
  circleId = circle.id;
});

afterAll(async () => {
  await Promise.all([admin?.auth.signOut(), leader?.auth.signOut(), student?.auth.signOut()]);
});

describe("has_permission() — representative matrix rows", () => {
  it("admin has 'all' scope on roles.assign_admin (admin only, per role)", async () => {
    const { data, error } = await admin.rpc("has_permission", { actor: adminId, key: "roles.assign_admin" });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("administrative does NOT have roles.assign_admin — can't manufacture a superior", async () => {
    const { data, error } = await leader.rpc("has_permission", {
      actor: leaderId,
      key: "roles.assign_admin",
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("administrative does NOT have roles.assign_administrative — can't manufacture a peer", async () => {
    const { data, error } = await leader.rpc("has_permission", {
      actor: leaderId,
      key: "roles.assign_administrative",
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("student does NOT have roles.assign_administrative", async () => {
    const { data, error } = await student.rpc("has_permission", {
      actor: studentId,
      key: "roles.assign_administrative",
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("administrative HAS events.create in a circle they lead ('circle' scope)", async () => {
    const { data, error } = await leader.rpc("has_permission", {
      actor: leaderId,
      key: "events.create",
      target_circle: circleId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("student HAS events.create in a circle they belong to ('circle' scope — any member may schedule)", async () => {
    const { data, error } = await student.rpc("has_permission", {
      actor: studentId,
      key: "events.create",
      target_circle: circleId,
    });
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it("student's events.edit is 'own' scope — their own created meeting only, never a leader's", async () => {
    // No target profile → 'own' scope has nothing to match on → denied.
    const { data: noTarget } = await student.rpc("has_permission", {
      actor: studentId,
      key: "events.edit",
      target_circle: circleId,
    });
    expect(noTarget).toBe(false);

    // Meeting they created (created_by = them) → allowed.
    const { data: ownMeeting } = await student.rpc("has_permission", {
      actor: studentId,
      key: "events.edit",
      target_circle: circleId,
      target_profile: studentId,
    });
    expect(ownMeeting).toBe(true);

    // Meeting someone else created → denied.
    const { data: othersMeeting } = await student.rpc("has_permission", {
      actor: studentId,
      key: "events.edit",
      target_circle: circleId,
      target_profile: leaderId,
    });
    expect(othersMeeting).toBe(false);
  });

  it("events.host_self is 'own' scope for every role — anyone may volunteer themselves as host", async () => {
    for (const [client, id, label] of [
      [admin, adminId, "admin"],
      [leader, leaderId, "administrative"],
      [student, studentId, "student"],
    ] as const) {
      const { data, error } = await client.rpc("has_permission", {
        actor: id,
        key: "events.host_self",
        target_profile: id,
      });
      expect(error, `${label}: unexpected error`).toBeNull();
      expect(data, `${label} should be able to volunteer themselves as host`).toBe(true);
    }
  });

  it("submissions.create is 'own' scope for all three roles — the author/answerer rule", async () => {
    for (const [client, id, label] of [
      [admin, adminId, "admin"],
      [leader, leaderId, "administrative"],
      [student, studentId, "student"],
    ] as const) {
      const { data, error } = await client.rpc("has_permission", {
        actor: id,
        key: "submissions.create",
        target_profile: id,
      });
      expect(error, `${label}: unexpected error`).toBeNull();
      expect(data, `${label} should have submissions.create on their own row`).toBe(true);
    }
  });

  it("nobody has submissions.create targeting someone ELSE's profile", async () => {
    const { data, error } = await leader.rpc("has_permission", {
      actor: leaderId,
      key: "submissions.create",
      target_profile: studentId,
    });
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it("student's attendance.view is 'own' scope — only their own record, not the circle's", async () => {
    const { data: ownScope } = await student.rpc("has_permission", {
      actor: studentId,
      key: "attendance.view",
      target_circle: null,
      target_profile: studentId,
    });
    expect(ownScope).toBe(true);

    const { data: circleScope } = await student.rpc("has_permission", {
      actor: studentId,
      key: "attendance.view",
      target_circle: circleId,
    });
    expect(circleScope).toBe(false);
  });
});

describe("RLS enforcement — real writes and reads, not just has_permission()", () => {
  it("change_member_role() rejects a non-admin caller (roles.assign_administrative)", async () => {
    const { error } = await leader.rpc("change_member_role", {
      target_profile: studentId,
      new_role: "administrative",
      reason: "RLS test — should be denied",
    });
    expect(error).not.toBeNull();
  });

  it("a student cannot insert their own attendance row — read-only per the matrix", async () => {
    const { data: anyEvent } = await admin
      .from("events")
      .select("id")
      .eq("circle_id", circleId)
      .limit(1)
      .single();
    expect(anyEvent).not.toBeNull();

    const { error } = await student.from("attendance").insert({
      event_id: anyEvent!.id,
      profile_id: studentId,
      status: "present",
    });
    expect(error).not.toBeNull();
  });

  it("a circle leader CAN take attendance in a circle they lead", async () => {
    const { data: event } = await leader
      .from("events")
      .select("id")
      .eq("circle_id", circleId)
      .limit(1)
      .single();
    expect(event).not.toBeNull();

    const { error } = await leader
      .from("attendance")
      .upsert(
        { event_id: event!.id, profile_id: studentId, status: "present", marked_by: leaderId },
        { onConflict: "event_id,profile_id" },
      );
    expect(error).toBeNull();
  });

  it("a student cannot read the audit log (RLS returns empty, not an error)", async () => {
    const { data, error } = await student.from("audit_log").select("id").limit(1);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("admin CAN read the audit log", async () => {
    const { data, error } = await admin.from("audit_log").select("id").limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("a student cannot promote themselves via a direct profiles update (trigger guard)", async () => {
    const { error } = await student.from("profiles").update({ role: "admin" }).eq("id", studentId);
    // RLS/the trigger may allow the statement through while silently
    // reverting the column, or reject it outright — either way, the role
    // must not actually change.
    void error;
    const { data: after } = await admin.from("profiles").select("role").eq("id", studentId).single();
    expect(after?.role).toBe("student");
  });
});
