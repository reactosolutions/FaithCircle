import { createClient, getCachedUser } from "@/lib/supabase/server";

// One assignment list, annotated with the viewer's own submission status.
// This is what makes the To do / Submitted / Reviewed tabs possible for
// EVERY role, including administrative — their own answer status shows up
// here exactly like a student's; the review queue is a separate section on
// the assignment detail page, not a different list.
export async function listAssignmentsForViewer() {
  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) return [];

  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("id, circle_id, title, due_at, points, published, created_at")
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const assignmentIds = (assignments ?? []).map((a) => a.id);

  const { data: mySubmissions } =
    assignmentIds.length > 0
      ? await supabase
          .from("submissions")
          .select("assignment_id, status, score")
          .eq("profile_id", user.id)
          .in("assignment_id", assignmentIds)
      : { data: [] };

  const mineByAssignment = new Map((mySubmissions ?? []).map((s) => [s.assignment_id, s]));

  const circleIds = Array.from(new Set((assignments ?? []).map((a) => a.circle_id)));
  const { data: circles } =
    circleIds.length > 0
      ? await supabase.from("circles").select("id, name").in("id", circleIds)
      : { data: [] };
  const circleNameById = new Map((circles ?? []).map((c) => [c.id, c.name]));

  return (assignments ?? []).map((assignment) => {
    const mine = mineByAssignment.get(assignment.id);
    return {
      ...assignment,
      circleName: circleNameById.get(assignment.circle_id) ?? "",
      myStatus: mine?.status ?? null,
      myScore: mine?.score ?? null,
    };
  });
}

export async function getAssignmentDetail(assignmentId: string) {
  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("id", assignmentId)
    .single();
  if (error || !assignment) return null;

  const { data: circle } = await supabase
    .from("circles")
    .select("id, name, leader_id")
    .eq("id", assignment.circle_id)
    .single();

  const user = await getCachedUser();

  let mySubmission = null;
  if (user) {
    const { data } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("profile_id", user.id)
      .maybeSingle();
    mySubmission = data ?? null;
  }

  return { assignment, circle: circle ?? null, mySubmission };
}

// Relies on RLS to do the actual scoping: a circle leader's submissions_select
// policy matches every row for their circle's assignments, so this naturally
// returns the full class list for a leader and just their own row for anyone
// else. The page only renders this section when the viewer is confirmed
// leader/admin, so the RLS behavior here is a backstop, not the real gate.
export async function getReviewQueue(assignmentId: string) {
  const supabase = await createClient();
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("submitted_at", { ascending: true });
  if (error) throw error;

  const profileIds = (submissions ?? []).map((s) => s.profile_id);
  const { data: profiles } =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (submissions ?? []).map((submission) => ({
    ...submission,
    memberName: nameById.get(submission.profile_id) ?? "Unnamed",
  }));
}

// For the member detail page — relies on RLS the same way getReviewQueue
// does: submissions_select already limits this to the caller's own row
// unless they hold submissions.view for the assignment's circle (admin=all,
// administrative=circle they lead), so no separate permission check is
// needed here.
export async function getMemberSubmissionHistory(profileId: string) {
  const supabase = await createClient();
  const { data: submissions, error } = await supabase
    .from("submissions")
    .select("id, assignment_id, status, score, submitted_at, reviewed_at")
    .eq("profile_id", profileId)
    .order("submitted_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  if (!submissions || submissions.length === 0) return [];

  const assignmentIds = submissions.map((s) => s.assignment_id);
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, points")
    .in("id", assignmentIds);
  const assignmentById = new Map((assignments ?? []).map((a) => [a.id, a]));

  return submissions.map((submission) => ({
    ...submission,
    assignmentTitle: assignmentById.get(submission.assignment_id)?.title ?? "Untitled assignment",
    maxPoints: assignmentById.get(submission.assignment_id)?.points ?? null,
  }));
}
