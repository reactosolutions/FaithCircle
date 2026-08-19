import { notFound, redirect } from "next/navigation";
import { createClient, getCachedUser } from "@/lib/supabase/server";
import { getAttendanceSheet } from "@/features/attendance/queries";
import { AttendanceSheet } from "@/features/attendance/components/attendance-sheet";
import { formatEventDate, formatEventTime } from "@/features/events/format";
import { FormatBadge } from "@/features/events/components/format-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AttendanceSheetPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const supabase = await createClient();
  const user = await getCachedUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const result = await getAttendanceSheet(eventId);
  if (!result) {
    notFound();
  }
  const { event, members } = result;

  let isLeader = profile?.role === "admin";
  if (!isLeader) {
    const { data: circle } = await supabase
      .from("circles")
      .select("leader_id")
      .eq("id", event.circle_id)
      .single();
    isLeader = circle?.leader_id === user.id;
  }
  if (!isLeader) {
    notFound();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{event.title}</CardTitle>
            <FormatBadge format={event.format} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at)}
          </p>
        </CardHeader>
        <CardContent>
          <AttendanceSheet
            eventId={event.id}
            format={event.format}
            members={members.map((member) => ({
              id: member.id,
              fullName: member.fullName,
              attendance: member.attendance,
              rsvpResponse: member.rsvpResponse,
              rsvpAttendMode: member.rsvpAttendMode,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
