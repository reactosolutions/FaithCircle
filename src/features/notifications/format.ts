import type { Database } from "@/lib/database.types";

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

// Maps a stored notification (type + a small payload snapshot, per
// src/lib/notifications.ts) to what the inbox row actually shows. Every
// type wired up so far is written with the fields this function expects —
// add a case here whenever a new type starts being written.
export function formatNotification(row: NotificationRow): { text: string; href: string | null } {
  const payload = row.payload as Record<string, unknown>;
  switch (row.type) {
    case "meeting_scheduled":
      return { text: `New meeting: ${payload.eventTitle}`, href: `/events/${payload.eventId}` };
    case "host_assigned":
      return { text: `You're hosting: ${payload.eventTitle}`, href: `/events/${payload.eventId}` };
    case "attendance_recorded":
      return {
        text: `Your attendance was recorded for ${payload.eventTitle}`,
        href: `/events/${payload.eventId}`,
      };
    case "feedback_received":
      return {
        text: `Feedback received on ${payload.assignmentTitle}`,
        href: `/homework/${payload.assignmentId}`,
      };
    case "role_changed":
      return { text: `Your role changed to ${payload.newRole}`, href: "/settings/account" };
    case "new_signup":
      return payload.kind === "join_request"
        ? {
            text: `New join request from ${payload.fullName ?? payload.email}`,
            href: "/settings/organization",
          }
        : {
            text: `New signup awaiting approval: ${payload.fullName ?? payload.email}`,
            href: "/members?status=pending",
          };
    default:
      return { text: row.type, href: null };
  }
}
