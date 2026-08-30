// Hand-written to match supabase/schema.sql. Once the schema has been applied
// to a real Supabase project, replace this file with the output of:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type UserRole = "admin" | "administrative" | "student";
export type ProfileStatus = "invited" | "active" | "inactive" | "pending";
export type EventRecurrence = "none" | "weekly" | "biweekly" | "monthly";
export type EventStatus = "scheduled" | "cancelled" | "completed";
export type RsvpResponse = "going" | "not_going" | "tentative" | "no_response";
export type AttendanceStatus = "present" | "absent" | "excused";
export type SubmissionStatus = "draft" | "submitted" | "reviewed";
export type QuestionType = "text" | "multiple_choice";
export type ReminderLeadTime = "1h" | "3h" | "1d" | "2d";
export type ThemePreference = "light" | "dark" | "system";
export type LanguagePreference = "en" | "ar";
export type PhoneVisibility = "circle" | "leaders";
export type JoinPolicy = "open_invite" | "approval_required";
export type JoinRequestStatus = "pending" | "approved" | "rejected";
export type EventFormat = "in_person" | "online" | "hybrid";
export type MeetProvider = "google_meet" | "zoom" | "teams" | "other";
export type EventAudience = "circle" | "multi_circle" | "custom";
export type AttendMode = "in_person" | "online";
export type ReasonCategory = "travel" | "illness" | "work" | "family" | "distance" | "other";
export type PermissionScope = "own" | "circle" | "all";
export type PermissionKey =
  | "members.view"
  | "members.view_contact"
  | "members.invite"
  | "members.edit"
  | "members.deactivate"
  | "members.delete"
  | "roles.assign_administrative"
  | "roles.assign_admin"
  | "circles.view"
  | "circles.create"
  | "circles.edit_settings"
  | "events.view"
  | "events.create"
  | "events.edit"
  | "events.delete"
  | "events.rsvp"
  | "events.host_self"
  | "attendance.view"
  | "attendance.record"
  | "assignments.view"
  | "assignments.create"
  | "assignments.edit"
  | "submissions.create"
  | "submissions.view"
  | "submissions.review"
  | "settings.organization"
  | "audit.view"
  | "data.export";

export interface NotificationPrefs {
  meeting_scheduled: { in_app: boolean; email: boolean };
  meeting_reminder: { in_app: boolean; email: boolean };
  host_assigned: { in_app: boolean; email: boolean };
  new_assignment: { in_app: boolean; email: boolean };
  assignment_due_soon: { in_app: boolean; email: boolean };
  feedback_received: { in_app: boolean; email: boolean };
  attendance_recorded: { in_app: boolean; email: boolean };
  role_changed: { in_app: boolean; email: boolean };
  new_signup: { in_app: boolean; email: boolean };
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          can_host: boolean;
          home_address: string | null;
          home_lat: number | null;
          home_lng: number | null;
          host_capacity: number | null;
          status: ProfileStatus;
          created_at: string;
          home_arrival_notes: string | null;
          notification_prefs: NotificationPrefs;
          reminder_lead_time: ReminderLeadTime;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          language: LanguagePreference;
          theme: ThemePreference;
          timezone: string;
          date_format: string;
          week_starts_on: number;
          show_hijri_dates: boolean;
          phone_visibility: PhoneVisibility;
          hide_address_until_rsvp: boolean;
          profile_completed_at: string | null;
          must_change_password: boolean;
        };
        Insert: Partial<Omit<Database["public"]["Tables"]["profiles"]["Row"], "id">> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      circles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          leader_id: string | null;
          created_at: string;
          cover_image_url: string | null;
          default_meeting_weekday: number | null;
          default_meeting_time: string | null;
          default_meeting_duration_minutes: number;
          default_recurrence: EventRecurrence;
          homework_due_offset_days: number | null;
          attendance_flag_threshold: number;
          invite_code: string | null;
          join_policy: JoinPolicy;
        };
        Insert: Partial<Database["public"]["Tables"]["circles"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["circles"]["Row"]>;
        Relationships: [];
      };
      circle_members: {
        Row: { circle_id: string; profile_id: string; joined_at: string };
        Insert: Partial<Database["public"]["Tables"]["circle_members"]["Row"]> & {
          circle_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["circle_members"]["Row"]>;
        Relationships: [];
      };
      circle_leaders: {
        Row: { circle_id: string; profile_id: string };
        Insert: Partial<Database["public"]["Tables"]["circle_leaders"]["Row"]> & {
          circle_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["circle_leaders"]["Row"]>;
        Relationships: [];
      };
      permissions: {
        Row: { key: string; resource: string; action: string; description: string | null };
        Insert: Partial<Database["public"]["Tables"]["permissions"]["Row"]> & {
          key: string;
          resource: string;
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["permissions"]["Row"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: { role: UserRole; permission_key: string; scope: PermissionScope };
        Insert: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]> & {
          role: UserRole;
          permission_key: string;
          scope: PermissionScope;
        };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Row"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          circle_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          host_id: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          recurrence: EventRecurrence;
          parent_event_id: string | null;
          status: EventStatus;
          created_at: string;
          created_by: string | null;
          format: EventFormat;
          meet_url: string | null;
          meet_provider: MeetProvider | null;
          meet_notes: string | null;
          in_person_capacity: number | null;
          audience: EventAudience;
        };
        Insert: Partial<Database["public"]["Tables"]["events"]["Row"]> & {
          circle_id: string;
          title: string;
          starts_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Row"]>;
        Relationships: [];
      };
      event_circles: {
        Row: { event_id: string; circle_id: string };
        Insert: Partial<Database["public"]["Tables"]["event_circles"]["Row"]> & {
          event_id: string;
          circle_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_circles"]["Row"]>;
        Relationships: [];
      };
      event_invitees: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          added_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["event_invitees"]["Row"]> & {
          event_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_invitees"]["Row"]>;
        Relationships: [];
      };
      // The single participation record — "are you coming" and "did you
      // come" are one row. `response` doubles as the attendance status
      // (going = present, not_going = absent, not_going + a reason =
      // excused); `attend_mode` is intent before the meeting, actual after.
      event_rsvps: {
        Row: {
          event_id: string;
          profile_id: string;
          response: RsvpResponse;
          responded_at: string | null;
          attend_mode: AttendMode | null;
          reason: string | null;
          reason_category: ReasonCategory | null;
          note: string | null;
          marked_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["event_rsvps"]["Row"]> & {
          event_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_rsvps"]["Row"]>;
        Relationships: [];
      };
      // `attendance` is now a read-only VIEW over event_rsvps (see
      // schema.sql) in the old column shape — reads still work everywhere;
      // writes go through event_rsvps via the attendance Server Actions.
      attendance: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          status: AttendanceStatus;
          note: string | null;
          marked_by: string | null;
          marked_at: string;
          mode: AttendMode | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      assignments: {
        Row: {
          id: string;
          circle_id: string;
          title: string;
          instructions: string | null;
          attachment_url: string | null;
          due_at: string | null;
          created_by: string | null;
          points: number | null;
          published: boolean;
          created_at: string;
          question_type: QuestionType;
          choices: string[] | null;
        };
        Insert: Partial<Database["public"]["Tables"]["assignments"]["Row"]> & {
          circle_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Row"]>;
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          assignment_id: string;
          profile_id: string;
          answer_text: string | null;
          attachment_url: string | null;
          status: SubmissionStatus;
          submitted_at: string | null;
          reviewer_id: string | null;
          feedback: string | null;
          score: number | null;
          reviewed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["submissions"]["Row"]> & {
          assignment_id: string;
          profile_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["submissions"]["Row"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          payload: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          profile_id: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [];
      };
      host_blackout_dates: {
        Row: {
          id: string;
          profile_id: string;
          starts_on: string;
          ends_on: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["host_blackout_dates"]["Row"]> & {
          profile_id: string;
          starts_on: string;
          ends_on: string;
        };
        Update: Partial<Database["public"]["Tables"]["host_blackout_dates"]["Row"]>;
        Relationships: [];
      };
      join_requests: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          requested_at: string;
          status: JoinRequestStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["join_requests"]["Row"]> & {
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["join_requests"]["Row"]>;
        Relationships: [];
      };
      org_settings: {
        Row: {
          id: boolean;
          join_policy: JoinPolicy;
          invite_link_token: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["org_settings"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["org_settings"]["Row"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          occurred_at: string;
          table_name: string;
          record_id: string | null;
          // 'insert'/'update'/'delete' for trigger-generated rows; free text
          // for explicitly-logged app events (data_export, sign_in, ...).
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          actor_email: string | null;
          old_data: Record<string, unknown> | null;
          new_data: Record<string, unknown> | null;
          changed_fields: string[] | null;
          context: Record<string, unknown> | null;
          reason: string | null;
        };
        // Row mutations are logged by the trigger. The handful of app-level
        // events CLAUDE.md calls out (data export, sign-in, ...) are the
        // only legitimate direct inserts — always via the service-role
        // client, since there's no insert policy for regular users.
        Insert: Partial<Database["public"]["Tables"]["audit_log"]["Row"]> & {
          table_name: string;
          action: string;
        };
        Update: never;
        Relationships: [];
      };
      audit_exclusions: {
        Row: { table_name: string; column_name: string };
        Insert: { table_name: string; column_name: string };
        Update: Partial<Database["public"]["Tables"]["audit_exclusions"]["Row"]>;
        Relationships: [];
      };
    };
    Views: {
      // reason/reason_category are nulled out here unless the caller is
      // admin or it's their own row — see schema.sql's event_rsvps_visible
      // comment. Any read of another profile's RSVP reason for DISPLAY
      // (not the caller's own) should go through this view, never the
      // event_rsvps table directly.
      event_rsvps_visible: {
        Row: {
          event_id: string;
          profile_id: string;
          response: RsvpResponse;
          responded_at: string | null;
          attend_mode: AttendMode | null;
          reason: string | null;
          reason_category: ReasonCategory | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_permission: {
        Args: {
          actor: string;
          key: string;
          target_circle?: string | null;
          target_profile?: string | null;
        };
        Returns: boolean;
      };
      change_member_role: {
        Args: { target_profile: string; new_role: UserRole; reason: string };
        Returns: undefined;
      };
      claim_event_host: {
        Args: { target_event_id: string };
        Returns: undefined;
      };
      release_event_host: {
        Args: { target_event_id: string };
        Returns: undefined;
      };
    };
  };
}
