-- Rewaa (رواء) schema
-- Idempotent and re-runnable: paste into the Supabase SQL Editor any time.
-- Tables use `create table if not exists` (never dropped, to protect data),
-- followed by `alter table ... add column if not exists` for every column —
-- this project already had an older, narrower `profiles` table from before
-- this schema existed, and `create table if not exists` alone is a no-op
-- against a table that's already there, so it would silently skip adding
-- any new columns. The `alter`s make every table converge to the shape
-- below regardless of what was already present.
-- Functions use `create or replace`. Policies and triggers are dropped and
-- recreated so their definitions always match this file.

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('admin', 'administrative', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.profile_status as enum ('invited', 'active', 'inactive');
exception when duplicate_object then null; end $$;

-- 'pending' = a self-service /signup awaiting admin approval, distinct from
-- 'invited' (an admin already invited/approved them; they're just finishing
-- onboarding). Added separately since ALTER TYPE ADD VALUE can't run inside
-- the same DO block as CREATE TYPE.
alter type public.profile_status add value if not exists 'pending';

do $$ begin
  create type public.event_recurrence as enum ('none', 'weekly', 'biweekly', 'monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('scheduled', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rsvp_response as enum ('going', 'not_going', 'no_response');
exception when duplicate_object then null; end $$;

-- Added separately, same reason profile_status's 'pending' is: ALTER TYPE
-- ADD VALUE can't run inside the same DO block as CREATE TYPE.
alter type public.rsvp_response add value if not exists 'tentative';

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum ('draft', 'submitted', 'reviewed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_type as enum ('text', 'multiple_choice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_lead_time as enum ('1h', '3h', '1d', '2d');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.theme_preference as enum ('light', 'dark', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.language_preference as enum ('en', 'ar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.phone_visibility as enum ('circle', 'leaders');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.join_policy as enum ('open_invite', 'approval_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.join_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_format as enum ('in_person', 'online', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.meet_provider as enum ('google_meet', 'zoom', 'teams', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_audience as enum ('circle', 'multi_circle', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attend_mode as enum ('in_person', 'online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reason_category as enum ('travel', 'illness', 'work', 'family', 'distance', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.permission_scope as enum ('own', 'circle', 'all');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Tables
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role public.user_role not null default 'student';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists can_host boolean not null default false;
alter table public.profiles add column if not exists home_address text;
alter table public.profiles add column if not exists home_lat double precision;
alter table public.profiles add column if not exists home_lng double precision;
alter table public.profiles add column if not exists host_capacity integer;
alter table public.profiles add column if not exists status public.profile_status not null default 'active';
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- Settings: HOSTING
alter table public.profiles add column if not exists home_arrival_notes text;

-- Settings: NOTIFICATIONS — one jsonb matrix (type -> {in_app, email}) rather
-- than 14 boolean columns; the UI renders it as a grid but the shape can
-- grow a new notification type without a migration.
alter table public.profiles add column if not exists notification_prefs jsonb not null default '{
  "meeting_scheduled": {"in_app": true, "email": true},
  "meeting_reminder": {"in_app": true, "email": true},
  "host_assigned": {"in_app": true, "email": true},
  "new_assignment": {"in_app": true, "email": true},
  "assignment_due_soon": {"in_app": true, "email": false},
  "feedback_received": {"in_app": true, "email": true},
  "attendance_recorded": {"in_app": true, "email": false},
  "role_changed": {"in_app": true, "email": true},
  "new_signup": {"in_app": true, "email": true}
}'::jsonb;

-- Backfill for rows created before "role_changed" existed — jsonb defaults
-- only apply to new rows, not retroactively, so notifyUsers() would
-- otherwise silently skip every pre-existing profile for this type until
-- they happened to resave their notification preferences.
update public.profiles
set notification_prefs = notification_prefs || '{"role_changed": {"in_app": true, "email": true}}'::jsonb
where not (notification_prefs ? 'role_changed');

-- Same backfill, for "new_signup" — notifyUsers() only ever targets admins
-- with this type (see notifyUsers() call sites in signUp/submitJoinRequest),
-- but every profile still carries the same NotificationPrefs shape.
update public.profiles
set notification_prefs = notification_prefs || '{"new_signup": {"in_app": true, "email": true}}'::jsonb
where not (notification_prefs ? 'new_signup');
alter table public.profiles add column if not exists reminder_lead_time public.reminder_lead_time not null default '1d';
alter table public.profiles add column if not exists quiet_hours_start time;
alter table public.profiles add column if not exists quiet_hours_end time;

-- Settings: PREFERENCES
alter table public.profiles add column if not exists language public.language_preference not null default 'ar';
alter table public.profiles alter column language set default 'ar';
alter table public.profiles add column if not exists theme public.theme_preference not null default 'system';
alter table public.profiles add column if not exists timezone text not null default 'Asia/Riyadh';
alter table public.profiles add column if not exists date_format text not null default 'MMM d, yyyy';
alter table public.profiles add column if not exists week_starts_on integer not null default 0;
alter table public.profiles add column if not exists show_hijri_dates boolean not null default false;

-- Settings: PRIVACY
alter table public.profiles add column if not exists phone_visibility public.phone_visibility not null default 'circle';
alter table public.profiles add column if not exists hide_address_until_rsvp boolean not null default true;

-- Signup: marks the phone/hosting-availability intake step done, for both
-- the 'invited' (admin-approved) and 'pending' (awaiting approval) flows.
-- Null = still needs /complete-profile. For 'pending' specifically, this is
-- also what separates "just signed up" from "actually waiting on a human" —
-- status alone can't tell the two apart since both are 'pending'.
alter table public.profiles add column if not exists profile_completed_at timestamptz;

-- Set true whenever an admin creates or resets a password on someone's
-- behalf (inviteMember, resetMemberPassword) — both hand the admin a temp
-- password to share out of band, and this is what forces a change to a
-- password only the account owner knows before they can use the app.
-- Cleared by changeRequiredPassword() once they do.
alter table public.profiles add column if not exists must_change_password boolean not null default false;

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid()
);

alter table public.circles add column if not exists name text not null default '';
alter table public.circles alter column name drop default;
alter table public.circles add column if not exists description text;
alter table public.circles add column if not exists leader_id uuid references public.profiles (id) on delete set null;
alter table public.circles add column if not exists created_at timestamptz not null default now();

-- Settings: CIRCLE (leader-scoped defaults)
alter table public.circles add column if not exists cover_image_url text;
alter table public.circles add column if not exists default_meeting_weekday integer;
alter table public.circles add column if not exists default_meeting_time time;
alter table public.circles add column if not exists default_meeting_duration_minutes integer not null default 90;
alter table public.circles add column if not exists default_recurrence public.event_recurrence not null default 'none';
alter table public.circles add column if not exists homework_due_offset_days integer;
alter table public.circles add column if not exists attendance_flag_threshold integer not null default 3;

do $$ begin
  alter table public.circles add constraint circles_default_meeting_weekday_check
    check (default_meeting_weekday is null or default_meeting_weekday between 0 and 6);
exception when duplicate_object then null; end $$;

-- Signup: a circle-scoped invite code + join policy, separate from the
-- org-wide invite link in org_settings (which is for when no circle is
-- named). A code with an 'open_invite' policy lets /signup skip approval
-- for that one circle; 'approval_required' (the default) still routes
-- through the pending-approval queue even with a valid code.
alter table public.circles add column if not exists invite_code text;
alter table public.circles add column if not exists join_policy public.join_policy not null default 'approval_required';

do $$ begin
  alter table public.circles add constraint circles_invite_code_key unique (invite_code);
exception when duplicate_object or duplicate_table then null; end $$;

-- Settings: HOSTING — blackout date ranges (a member can have several)
create table if not exists public.host_blackout_dates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.host_blackout_dates add constraint host_blackout_dates_range_check
    check (ends_on >= starts_on);
exception when duplicate_object then null; end $$;

create index if not exists idx_host_blackout_dates_profile on public.host_blackout_dates (profile_id);

-- Settings: ORGANIZATION — join requests (approval-required join policy)
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  requested_at timestamptz not null default now(),
  status public.join_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz
);

create index if not exists idx_join_requests_status on public.join_requests (status);

-- Settings: ORGANIZATION — a single-row config table. The boolean-literal
-- primary key + check is the standard Postgres singleton-table trick: only
-- one row (id = true) can ever exist.
create table if not exists public.org_settings (
  id boolean primary key default true,
  join_policy public.join_policy not null default 'approval_required',
  invite_link_token text
);

do $$ begin
  alter table public.org_settings add constraint org_settings_singleton_check check (id);
exception when duplicate_object then null; end $$;

insert into public.org_settings (id) values (true) on conflict (id) do nothing;

create table if not exists public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (circle_id, profile_id)
);

alter table public.circle_members add column if not exists joined_at timestamptz not null default now();

-- ============================================================================
-- Permissions
--
-- Three tables, one function (has_permission(), defined further down once
-- circle_members exists), no hardcoded role checks in RLS policies, Server
-- Actions, or components. See CLAUDE.md's Permissions section for the full
-- matrix this is seeded from.
-- ============================================================================

create table if not exists public.permissions (
  key text primary key,
  resource text not null,
  action text not null,
  description text
);

create table if not exists public.role_permissions (
  role public.user_role not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  scope public.permission_scope not null,
  primary key (role, permission_key)
);

-- circle_leaders — an administrative may lead more than one circle.
-- circles.leader_id remains the circle's single primary/organizing leader
-- (used for defaults, e.g. the events form's owning circle); this table is
-- the source of truth for permission scope and is backfilled from leader_id
-- below.
create table if not exists public.circle_leaders (
  circle_id uuid not null references public.circles (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (circle_id, profile_id)
);

create index if not exists idx_circle_leaders_profile on public.circle_leaders (profile_id);

insert into public.circle_leaders (circle_id, profile_id)
select id, leader_id from public.circles where leader_id is not null
on conflict do nothing;

insert into public.permissions (key, resource, action, description) values
  ('members.view', 'members', 'view', 'See member profiles'),
  ('members.view_contact', 'members', 'view_contact', 'See phone/email contact details'),
  ('members.invite', 'members', 'invite', 'Invite a new member'),
  ('members.edit', 'members', 'edit', 'Edit a member profile'),
  ('members.deactivate', 'members', 'deactivate', 'Deactivate a member'),
  ('members.delete', 'members', 'delete', 'Permanently delete a member with no activity history'),
  ('roles.assign_administrative', 'roles', 'assign_administrative', 'Promote/demote a circle leader'),
  ('roles.assign_admin', 'roles', 'assign_admin', 'Promote/demote an admin'),
  ('circles.view', 'circles', 'view', 'See a circle exists'),
  ('circles.create', 'circles', 'create', 'Create a circle'),
  ('circles.edit_settings', 'circles', 'edit_settings', 'Edit a circle''s settings'),
  ('events.view', 'events', 'view', 'See a meeting'),
  ('events.create', 'events', 'create', 'Schedule a meeting'),
  ('events.edit', 'events', 'edit', 'Edit a meeting'),
  ('events.delete', 'events', 'delete', 'Cancel/delete a meeting'),
  ('events.rsvp', 'events', 'rsvp', 'RSVP to a meeting'),
  ('events.host_self', 'events', 'host_self', 'Volunteer yourself as a meeting host'),
  ('attendance.view', 'attendance', 'view', 'See attendance records'),
  ('attendance.record', 'attendance', 'record', 'Take attendance'),
  ('assignments.view', 'assignments', 'view', 'See homework assignments'),
  ('assignments.create', 'assignments', 'create', 'Create a homework assignment'),
  ('assignments.edit', 'assignments', 'edit', 'Edit a homework assignment'),
  ('submissions.create', 'submissions', 'create', 'Submit a homework answer'),
  ('submissions.view', 'submissions', 'view', 'See homework submissions'),
  ('submissions.review', 'submissions', 'review', 'Grade/give feedback on a submission'),
  ('settings.organization', 'settings', 'organization', 'Manage org-wide settings'),
  ('audit.view', 'audit', 'view', 'See the audit log'),
  ('data.export', 'data', 'export', 'Export data as CSV')
on conflict (key) do update set resource = excluded.resource, action = excluded.action, description = excluded.description;

-- Scope legend: 'own' = only rows where the actor is the subject. 'circle'
-- = for administrative, circles in circle_leaders (leadership required,
-- even for read-type permissions); for student, circles in circle_members
-- (membership is enough). 'all' = unrestricted. admin is 'all' on every row
-- below — it never uses 'circle' scope.
--
-- 'events.create' is the one 'circle'-scoped WRITE a student holds: any
-- member of a circle may schedule a meeting for it. Everything a student
-- then does to that meeting (edit, invite other circles, see its RSVP
-- headcount) runs through 'events.edit' at 'own' scope — keyed on
-- events.created_by, so it only ever covers meetings they created
-- themselves, never one a leader scheduled.
insert into public.role_permissions (role, permission_key, scope) values
  ('admin', 'members.view', 'all'),
  ('administrative', 'members.view', 'circle'),
  ('student', 'members.view', 'circle'),

  ('admin', 'members.view_contact', 'all'),
  ('administrative', 'members.view_contact', 'circle'),

  ('admin', 'members.invite', 'all'),
  ('administrative', 'members.invite', 'circle'),

  ('admin', 'members.edit', 'all'),
  ('student', 'members.edit', 'own'),

  ('admin', 'members.deactivate', 'all'),

  ('admin', 'members.delete', 'all'),

  ('admin', 'roles.assign_administrative', 'all'),
  ('admin', 'roles.assign_admin', 'all'),

  ('admin', 'circles.view', 'all'),
  ('administrative', 'circles.view', 'circle'),
  ('student', 'circles.view', 'circle'),

  ('admin', 'circles.create', 'all'),

  ('admin', 'circles.edit_settings', 'all'),
  ('administrative', 'circles.edit_settings', 'circle'),

  ('admin', 'events.view', 'all'),
  ('administrative', 'events.view', 'circle'),
  ('student', 'events.view', 'circle'),

  ('admin', 'events.create', 'all'),
  ('administrative', 'events.create', 'circle'),
  ('student', 'events.create', 'circle'),

  ('admin', 'events.edit', 'all'),
  ('administrative', 'events.edit', 'circle'),
  ('student', 'events.edit', 'own'),

  ('admin', 'events.delete', 'all'),
  ('administrative', 'events.delete', 'circle'),

  ('admin', 'events.rsvp', 'own'),
  ('administrative', 'events.rsvp', 'own'),
  ('student', 'events.rsvp', 'own'),

  -- Self-service: put YOURSELF forward as host on a meeting you're invited
  -- to. 'own' for every role — the claim_event_host() function does the
  -- membership/format checks; this key just gates the UI mirror + the
  -- Server Action guard.
  ('admin', 'events.host_self', 'own'),
  ('administrative', 'events.host_self', 'own'),
  ('student', 'events.host_self', 'own'),

  ('admin', 'attendance.view', 'all'),
  ('administrative', 'attendance.view', 'circle'),
  ('student', 'attendance.view', 'own'),

  ('admin', 'attendance.record', 'all'),
  ('administrative', 'attendance.record', 'circle'),
  ('student', 'attendance.record', 'own'),

  ('admin', 'assignments.view', 'all'),
  ('administrative', 'assignments.view', 'circle'),
  ('student', 'assignments.view', 'circle'),

  ('admin', 'assignments.create', 'all'),
  ('administrative', 'assignments.create', 'circle'),

  ('admin', 'assignments.edit', 'all'),
  ('administrative', 'assignments.edit', 'circle'),

  ('admin', 'submissions.create', 'own'),
  ('administrative', 'submissions.create', 'own'),
  ('student', 'submissions.create', 'own'),

  ('admin', 'submissions.view', 'all'),
  ('administrative', 'submissions.view', 'circle'),
  ('student', 'submissions.view', 'own'),

  ('admin', 'submissions.review', 'all'),
  ('administrative', 'submissions.review', 'circle'),

  ('admin', 'settings.organization', 'all'),

  ('admin', 'audit.view', 'all'),
  ('administrative', 'audit.view', 'circle'),

  ('admin', 'data.export', 'all'),
  ('administrative', 'data.export', 'circle')
on conflict (role, permission_key) do update set scope = excluded.scope;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid()
);

alter table public.events add column if not exists circle_id uuid references public.circles (id) on delete cascade;
alter table public.events add column if not exists title text not null default '';
alter table public.events alter column title drop default;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists starts_at timestamptz not null default now();
alter table public.events alter column starts_at drop default;
alter table public.events add column if not exists ends_at timestamptz;
alter table public.events add column if not exists host_id uuid references public.profiles (id) on delete set null;
alter table public.events add column if not exists address text;
alter table public.events add column if not exists lat double precision;
alter table public.events add column if not exists lng double precision;
alter table public.events add column if not exists recurrence public.event_recurrence not null default 'none';
alter table public.events add column if not exists parent_event_id uuid references public.events (id) on delete cascade;
alter table public.events add column if not exists status public.event_status not null default 'scheduled';
alter table public.events add column if not exists created_at timestamptz not null default now();
-- Who scheduled this meeting. Source of truth for 'events.edit' at 'own'
-- scope (a student may fully manage a meeting they created, nothing else).
-- Nullable + on delete set null like assignments.created_by: losing the
-- author reference when an account is hard-deleted is acceptable, and pre-
-- existing rows are backfilled to the owning circle's primary leader below.
alter table public.events add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.events alter column circle_id set not null;

update public.events e
set created_by = c.leader_id
from public.circles c
where c.id = e.circle_id and e.created_by is null and c.leader_id is not null;

-- Meeting formats: host_id/address/lat/lng stay nullable (an online-only
-- event has no host); format + meet_url instead determine what's required,
-- enforced below via CHECK rather than only in the form.
alter table public.events add column if not exists format public.event_format not null default 'in_person';
alter table public.events add column if not exists meet_url text;
alter table public.events add column if not exists meet_provider public.meet_provider;
alter table public.events add column if not exists meet_notes text;
-- Defaults from the host's profiles.host_capacity at creation time in the
-- Server Action, not a DB default — host_capacity can change later without
-- retroactively changing a past event's capacity.
alter table public.events add column if not exists in_person_capacity integer;
alter table public.events add column if not exists audience public.event_audience not null default 'circle';

-- Host/address used to be required at creation for in_person/hybrid; now
-- optional and addable later (same "fill in later" pattern as a circle's
-- advisors or an administrative's led circle) — a leaderless in-person
-- meeting is a real, if incomplete, state, not an error. Explicitly dropped
-- first since this file only ever ADDS constraints idempotently; without
-- the drop, re-running this script against a database that already has the
-- old (stricter) definition would silently keep enforcing it forever.
alter table public.events drop constraint if exists events_format_requirements_check;
do $$ begin
  alter table public.events add constraint events_format_requirements_check check (
    format not in ('online', 'hybrid') or meet_url is not null
  );
exception when duplicate_object or duplicate_table then null; end $$;

-- event_circles — every circle invited to an event. The owning circle stays
-- on events.circle_id for permissions (who may edit); this table is what
-- lets a meeting also be opened to a second circle, or organized by one
-- circle for a completely different one. public.is_event_member() below
-- falls back to events.circle_id directly, so a row here for the owning
-- circle isn't required for visibility — the schedule-event form inserts
-- one anyway so "circles invited" queries don't special-case the owner.
create table if not exists public.event_circles (
  event_id uuid not null references public.events (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  primary key (event_id, circle_id)
);

create index if not exists idx_event_circles_circle on public.event_circles (circle_id);

-- event_invitees — ad-hoc individuals added to an event outside any invited
-- circle.
create table if not exists public.event_invitees (
  id uuid primary key default gen_random_uuid()
);

alter table public.event_invitees add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.event_invitees add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.event_invitees add column if not exists added_by uuid references public.profiles (id) on delete set null;
alter table public.event_invitees add column if not exists created_at timestamptz not null default now();
alter table public.event_invitees alter column event_id set not null;
alter table public.event_invitees alter column profile_id set not null;

do $$ begin
  alter table public.event_invitees add constraint event_invitees_event_id_profile_id_key unique (event_id, profile_id);
exception when duplicate_object or duplicate_table then null; end $$;

create index if not exists idx_event_invitees_profile on public.event_invitees (profile_id);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  primary key (event_id, profile_id)
);

alter table public.event_rsvps add column if not exists response public.rsvp_response not null default 'no_response';
alter table public.event_rsvps add column if not exists responded_at timestamptz;
-- Required when response = 'going' on a hybrid event, forced to the only
-- valid value on single-format events — a Postgres CHECK can't reach across
-- to the events table to know the format, so this is enforced in Zod +
-- the Server Action instead.
alter table public.event_rsvps add column if not exists attend_mode public.attend_mode;
alter table public.event_rsvps add column if not exists reason text;
-- Applies in both directions: a reason for attending online instead of in
-- person is as useful to the leader as a reason for not attending at all.
alter table public.event_rsvps add column if not exists reason_category public.reason_category;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid()
);

alter table public.attendance add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.attendance add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.attendance add column if not exists status public.attendance_status not null default 'present';
alter table public.attendance alter column status drop default;
alter table public.attendance add column if not exists note text;
alter table public.attendance add column if not exists marked_by uuid references public.profiles (id) on delete set null;
alter table public.attendance add column if not exists marked_at timestamptz not null default now();
-- How they ACTUALLY attended, which may differ from what they RSVP'd —
-- never copied in from the RSVP's attend_mode.
alter table public.attendance add column if not exists mode public.attend_mode;
alter table public.attendance alter column event_id set not null;
alter table public.attendance alter column profile_id set not null;

do $$ begin
  alter table public.attendance add constraint attendance_event_id_profile_id_key unique (event_id, profile_id);
-- A unique constraint is backed by an index, so a name collision raises
-- duplicate_table (42P07), not duplicate_object (42710) — catch both.
exception when duplicate_object or duplicate_table then null; end $$;

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid()
);

alter table public.assignments add column if not exists circle_id uuid references public.circles (id) on delete cascade;
alter table public.assignments add column if not exists title text not null default '';
alter table public.assignments alter column title drop default;
alter table public.assignments add column if not exists instructions text;
alter table public.assignments add column if not exists attachment_url text;
alter table public.assignments add column if not exists due_at timestamptz;
alter table public.assignments add column if not exists created_by uuid references public.profiles (id) on delete set null;
alter table public.assignments add column if not exists points integer;
alter table public.assignments add column if not exists published boolean not null default false;
alter table public.assignments add column if not exists created_at timestamptz not null default now();
alter table public.assignments alter column circle_id set not null;

-- A question is either free-text (answer_text on submissions holds
-- whatever the member wrote) or multiple-choice (answer_text holds the
-- exact text of the choice they picked, from this list) — reusing the same
-- column rather than adding a separate one on submissions, since "the
-- answer" is a single string either way.
alter table public.assignments add column if not exists question_type public.question_type not null default 'text';
alter table public.assignments add column if not exists choices jsonb;

do $$ begin
  alter table public.assignments add constraint assignments_choices_check check (
    question_type <> 'multiple_choice' or (choices is not null and jsonb_array_length(choices) >= 2)
  );
exception when duplicate_object or duplicate_table then null; end $$;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid()
);

alter table public.submissions add column if not exists assignment_id uuid references public.assignments (id) on delete cascade;
alter table public.submissions add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.submissions add column if not exists answer_text text;
alter table public.submissions add column if not exists attachment_url text;
alter table public.submissions add column if not exists status public.submission_status not null default 'draft';
alter table public.submissions add column if not exists submitted_at timestamptz;
alter table public.submissions add column if not exists reviewer_id uuid references public.profiles (id) on delete set null;
alter table public.submissions add column if not exists feedback text;
alter table public.submissions add column if not exists score integer;
alter table public.submissions add column if not exists reviewed_at timestamptz;
alter table public.submissions alter column assignment_id set not null;
alter table public.submissions alter column profile_id set not null;

do $$ begin
  alter table public.submissions add constraint submissions_assignment_id_profile_id_key unique (assignment_id, profile_id);
exception when duplicate_object or duplicate_table then null; end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid()
);

alter table public.notifications add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.notifications add column if not exists type text not null default '';
alter table public.notifications alter column type drop default;
alter table public.notifications add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.notifications add column if not exists read_at timestamptz;
alter table public.notifications add column if not exists created_at timestamptz not null default now();
alter table public.notifications alter column profile_id set not null;

-- ============================================================================
-- Indexes
-- ============================================================================

create index if not exists idx_circles_leader on public.circles (leader_id);
create index if not exists idx_circle_members_profile on public.circle_members (profile_id);
create index if not exists idx_events_circle_starts_at on public.events (circle_id, starts_at);
create index if not exists idx_events_parent on public.events (parent_event_id);
create index if not exists idx_event_rsvps_profile on public.event_rsvps (profile_id);
create index if not exists idx_events_format on public.events (format);
create index if not exists idx_attendance_profile on public.attendance (profile_id);
create index if not exists idx_assignments_circle on public.assignments (circle_id);
create index if not exists idx_submissions_profile on public.submissions (profile_id);
create index if not exists idx_submissions_assignment on public.submissions (assignment_id);
create index if not exists idx_notifications_profile_unread
  on public.notifications (profile_id, read_at);

-- ============================================================================
-- Role-check helpers (SECURITY DEFINER — read profiles/circles without
-- re-triggering RLS on those tables, which is what avoids the classic
-- "infinite recursion detected in policy for relation profiles" error).
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Backed by circle_leaders (an administrative may lead more than one
-- circle), not circles.leader_id — that column stays as the circle's
-- single primary/organizing leader for defaults, but leadership for
-- permission purposes is whoever has a circle_leaders row.
create or replace function public.is_circle_leader(target_circle_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.circle_leaders cl
    where cl.circle_id = target_circle_id and cl.profile_id = auth.uid()
  );
$$;

create or replace function public.is_circle_member(target_circle_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.circle_members cm
    where cm.circle_id = target_circle_id and cm.profile_id = auth.uid()
  );
$$;

-- True if the current user and `target` profile share a circle, in any
-- member/leader combination. Backs the members directory (Phase 2).
create or replace function public.shares_circle_with(target uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1
    from public.circle_members cm1
    join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
    where cm1.profile_id = auth.uid() and cm2.profile_id = target
  )
  or exists (
    select 1 from public.circles c
    join public.circle_members cm on cm.circle_id = c.id
    where (c.leader_id = auth.uid() and cm.profile_id = target)
       or (c.leader_id = target and cm.profile_id = auth.uid())
  );
$$;

-- Membership resolution for a single event: the set of people who may see
-- and RSVP to it = members of any circle in event_circles (plus the
-- owning circle itself, so events created before event_circles existed or
-- without an explicit row still resolve) ∪ individually-added
-- event_invitees. Written once here and used both in RLS (events_select,
-- event_rsvps) and in queries — never reimplemented per page.
create or replace function public.is_event_member(target_event_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event_id and public.is_circle_member(e.circle_id)
  )
  or exists (
    select 1 from public.event_circles ec
    where ec.event_id = target_event_id and public.is_circle_member(ec.circle_id)
  )
  or exists (
    select 1 from public.event_invitees ei
    where ei.event_id = target_event_id and ei.profile_id = auth.uid()
  );
$$;

-- ============================================================================
-- Permissions: the ONLY place permission logic lives. RLS policies call
-- this; the requirePermission() Server Action guard calls it too (via a
-- thin RPC-equivalent query); the client's usePermissions() is a cached
-- mirror for rendering only, never enforcement.
--
-- 'circle' scope resolution assumes `actor` is always auth.uid() — true for
-- every call site in this codebase (RLS policies pass auth.uid() directly;
-- Server Actions only ever check permissions for the caller, never on
-- someone else's behalf) — because it lets this reuse shares_circle_with(),
-- which is itself hardcoded to auth.uid().
-- ============================================================================

create or replace function public.has_permission(
  actor uuid,
  key text,
  target_circle uuid default null,
  target_profile uuid default null
)
returns boolean
language plpgsql security definer set search_path = public stable
as $$
declare
  v_role public.user_role;
  v_scope public.permission_scope;
begin
  select role into v_role from public.profiles where id = actor;
  if v_role is null then
    return false;
  end if;

  select scope into v_scope from public.role_permissions
  where role = v_role and permission_key = key;

  if v_scope is null then
    return false;
  end if;

  if v_scope = 'all' then
    return true;
  end if;

  if v_scope = 'own' then
    return target_profile is not null and target_profile = actor;
  end if;

  -- v_scope = 'circle'.
  if target_circle is not null then
    if v_role = 'administrative' then
      return exists (
        select 1 from public.circle_leaders cl
        where cl.circle_id = target_circle and cl.profile_id = actor
      );
    end if;
    return exists (
      select 1 from public.circle_members cm
      where cm.circle_id = target_circle and cm.profile_id = actor
    );
  end if;

  -- No specific circle named, but a target profile was — the "can I see
  -- THIS other person" case (members.view and friends). Evaluate over
  -- every circle in common instead of one.
  if target_profile is not null then
    if v_role = 'administrative' then
      return exists (
        select 1 from public.circle_leaders cl
        join public.circle_members cm on cm.circle_id = cl.circle_id
        where cl.profile_id = actor and cm.profile_id = target_profile
      );
    end if;
    return public.shares_circle_with(target_profile);
  end if;

  return false;
end;
$$;

-- Wraps a profiles.role UPDATE with the reason string audit_row() picks up
-- via app.reason (set_config's third arg `true` scopes it to this
-- transaction only, so it can't leak into any other request). Also where
-- the "no user may change their own role, ever" and admin-only rules live
-- at the database layer, not just in the calling Server Action — the RPC
-- checks is_admin() itself rather than trusting the caller already did.
-- Circle assignment/reassignment on promotion/demotion is handled by the
-- caller as separate circle_leaders writes right after this succeeds, not
-- inside this function — not perfectly atomic with the role change, but
-- keeping that branching (promote-needs-a-circle vs demote-needs-a-choice)
-- out of PL/pgSQL keeps this function auditable at a glance.
create or replace function public.change_member_role(
  target_profile uuid,
  new_role public.user_role,
  reason text
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can change roles.';
  end if;
  if target_profile = auth.uid() then
    raise exception 'You can''t change your own role.';
  end if;
  if reason is null or btrim(reason) = '' then
    raise exception 'A reason is required.';
  end if;

  perform set_config('app.reason', reason, true);
  update public.profiles set role = new_role where id = target_profile;
end;
$$;

-- Volunteer YOURSELF as the host of a meeting you're on the guest list for.
-- The narrow, self-service counterpart to events.edit: it only ever sets
-- host_id to the caller (never anyone else), plus copies the caller's own
-- saved home address / capacity onto the meeting and marks them
-- can_host = true so there's no detour through Settings > Hosting first.
-- SECURITY DEFINER because a plain member holds no events UPDATE grant —
-- the checks here (resolved membership via is_event_member, not an online
-- meeting) are the gate. Replacing an existing host is allowed by design.
create or replace function public.claim_event_host(target_event_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_format public.event_format;
  v_addr text;
  v_lat double precision;
  v_lng double precision;
  v_cap integer;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;

  select format into v_format from public.events where id = target_event_id;
  if v_format is null then
    raise exception 'That meeting no longer exists.';
  end if;
  if v_format = 'online' then
    raise exception 'An online meeting has no host.';
  end if;
  if not public.is_event_member(target_event_id) then
    raise exception 'You are not on this meeting''s guest list.';
  end if;

  select home_address, home_lat, home_lng, host_capacity
    into v_addr, v_lat, v_lng, v_cap
  from public.profiles where id = v_uid;

  update public.profiles
    set can_host = true
    where id = v_uid and can_host is distinct from true;

  update public.events set
    host_id = v_uid,
    address = coalesce(v_addr, address),
    lat = case when v_addr is not null then v_lat else lat end,
    lng = case when v_addr is not null then v_lng else lng end,
    in_person_capacity = coalesce(v_cap, in_person_capacity)
  where id = target_event_id;
end;
$$;

-- Step back down. Only the meeting's current host may, and it just clears
-- host_id — the address is left as-is for a leader to repoint.
create or replace function public.release_event_host(target_event_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_host uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;
  select host_id into v_host from public.events where id = target_event_id;
  if v_host is distinct from v_uid then
    raise exception 'You are not the host of this meeting.';
  end if;
  update public.events set host_id = null where id = target_event_id;
end;
$$;

grant execute on function public.claim_event_host(uuid) to authenticated;
grant execute on function public.release_event_host(uuid) to authenticated;

-- ============================================================================
-- Trigger: auto-create a profile row when a new auth user signs up
-- (email/password or Google, self-service or admin-invited). ALWAYS
-- hardcodes role = 'student' — the client can never influence this, and an
-- admin invite promotes it afterward via a separate UPDATE (see
-- features/members/actions.ts), which the role-assignment guards below
-- allow because it runs as an authenticated admin.
--
-- Status distinguishes the two onboarding paths: admin.inviteUserByEmail
-- sets auth.users.invited_at, which is the one reliable signal that this
-- row came from an admin invite rather than self-service /signup — so
-- 'invited' (admin already vouched for them) vs 'pending' (awaiting
-- approval) falls out of that column rather than being passed in.
-- Seeded demo accounts override this back to 'active' in seed.sql.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    'student',
    (case when new.invited_at is not null then 'invited' else 'pending' end)::public.profile_status
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Trigger: block self role/status escalation. RLS controls which *rows* a
-- user can update, not which *columns* change within an allowed row — a
-- student could otherwise set their own role to 'admin' via the self-update
-- policy below. This trigger silently reverts role/status unless the actor
-- is already an admin.
-- ============================================================================

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() is null for trusted server-side contexts with no user
  -- session attached — the SQL Editor (seed.sql), migrations, and the
  -- service-role admin client (inviteMember's role/status update). Those
  -- aren't a student escalating themselves; only block the change when
  -- there IS an authenticated actor and they aren't an admin.
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_self_role_escalation on public.profiles;
create trigger trg_prevent_self_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- ============================================================================
-- Trigger: the same guard, for INSERT. handle_new_user() above always
-- hardcodes role = 'student', so this is defense-in-depth against any
-- future code path that inserts a profiles row directly (RLS's
-- profiles_insert_self policy only checks id = auth.uid(), not role) —
-- belt-and-suspenders so "no INSERT into profiles can ever set role to
-- admin or administrative" holds even if that assumption breaks later.
-- ============================================================================

create or replace function public.prevent_role_escalation_on_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() and new.role in ('admin', 'administrative') then
    new.role := 'student';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation_on_insert on public.profiles;
create trigger trg_prevent_role_escalation_on_insert
  before insert on public.profiles
  for each row execute function public.prevent_role_escalation_on_insert();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.events enable row level security;
alter table public.event_circles enable row level security;
alter table public.event_invitees enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.attendance enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.notifications enable row level security;

-- ---------- profiles ----------
-- Read: members.view — yourself always, plus admin (all) or anyone sharing
-- a circle with you (circle, scoped to leadership for administrative,
-- membership for student).
-- Write: members.edit — yourself (own) or admin (all). Note administrative
-- does NOT hold members.edit per the matrix; the anti-escalation triggers
-- above separately stop role/status from changing outside the dedicated
-- role-assignment action regardless of who's writing.

-- Drop policies from the pre-existing narrower profiles table (from the
-- original Firebase→Supabase migration), which used different names than
-- the ones below and would otherwise be left stacking alongside them.
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.has_permission(auth.uid(), 'members.view', null, id));

create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or public.has_permission(auth.uid(), 'members.edit', null, id))
  with check (id = auth.uid() or public.has_permission(auth.uid(), 'members.edit', null, id));

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert
  with check (id = auth.uid());

-- ---------- circles ----------
-- Read: circles.view (all/circle/circle). Create: circles.create
-- (admin-only — leaders don't spin up new circles). Edit: circles.edit_settings
-- (admin=all, administrative=circle they lead). Delete: reuses
-- circles.create — deleting a circle is as destructive as creating one and
-- stays admin-only even though administrative can edit_settings.

drop policy if exists "circles_select" on public.circles;
create policy "circles_select" on public.circles for select
  using (public.has_permission(auth.uid(), 'circles.view', id, null));

drop policy if exists "circles_write_admin" on public.circles;
drop policy if exists "circles_insert" on public.circles;
drop policy if exists "circles_update" on public.circles;
drop policy if exists "circles_delete" on public.circles;

create policy "circles_insert" on public.circles for insert
  with check (public.has_permission(auth.uid(), 'circles.create', null, null));

create policy "circles_update" on public.circles for update
  using (public.has_permission(auth.uid(), 'circles.edit_settings', id, null))
  with check (public.has_permission(auth.uid(), 'circles.edit_settings', id, null));

create policy "circles_delete" on public.circles for delete
  using (public.has_permission(auth.uid(), 'circles.create', null, null));

-- ---------- circle_members ----------
-- Read: members.view. Write (add/remove members): members.invite.

drop policy if exists "circle_members_select" on public.circle_members;
create policy "circle_members_select" on public.circle_members for select
  using (
    profile_id = auth.uid()
    or public.has_permission(auth.uid(), 'members.view', circle_id, null)
  );

drop policy if exists "circle_members_write" on public.circle_members;
create policy "circle_members_write" on public.circle_members for all
  using (public.has_permission(auth.uid(), 'members.invite', circle_id, null))
  with check (public.has_permission(auth.uid(), 'members.invite', circle_id, null));

-- ---------- permissions / role_permissions ----------
-- Read-only reference data (what actions exist, what scope each role gets)
-- — not sensitive, readable by any authenticated user so the Roles matrix
-- page and any future client code can query it directly. Only the
-- role-assignment Server Action writes here (via the admin client), so no
-- write policy is needed for authenticated roles.

alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select" on public.permissions for select
  using (auth.uid() is not null);

drop policy if exists "role_permissions_select" on public.role_permissions;
create policy "role_permissions_select" on public.role_permissions for select
  using (auth.uid() is not null);

-- ---------- circle_leaders ----------
-- Read: members.view (same visibility as circle_members). Write: admin
-- only — leadership changes go through the role-assignment action, which
-- runs with admin permission already checked.

alter table public.circle_leaders enable row level security;

drop policy if exists "circle_leaders_select" on public.circle_leaders;
create policy "circle_leaders_select" on public.circle_leaders for select
  using (
    profile_id = auth.uid()
    or public.has_permission(auth.uid(), 'members.view', circle_id, null)
  );

drop policy if exists "circle_leaders_write_admin" on public.circle_leaders;
create policy "circle_leaders_write_admin" on public.circle_leaders for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- events ----------
-- Read: events.view (admin=all, administrative/student=circle) OR a
-- resolved event member (event_circles ∪ event_invitees — is_event_member
-- covers ad-hoc individual invitees and additional invited circles that
-- events.view's single target_circle can't express). Write: events.create/
-- edit/delete, kept as three separate policies so they can diverge without
-- a rewrite. events.edit/delete pass created_by as the target profile so
-- the student 'own' scope resolves against "did I schedule this meeting"
-- (admin 'all' and administrative 'circle' ignore it). events_insert
-- additionally pins created_by to the caller so a student can't file a
-- meeting under someone else's name.

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events for select
  using (
    public.has_permission(auth.uid(), 'events.view', circle_id, null)
    or public.is_event_member(id)
  );

drop policy if exists "events_write" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "events_insert" on public.events for insert
  with check (
    public.has_permission(auth.uid(), 'events.create', circle_id, null)
    and created_by = auth.uid()
  );

create policy "events_update" on public.events for update
  using (public.has_permission(auth.uid(), 'events.edit', circle_id, created_by))
  with check (public.has_permission(auth.uid(), 'events.edit', circle_id, created_by));

create policy "events_delete" on public.events for delete
  using (public.has_permission(auth.uid(), 'events.delete', circle_id, created_by));

-- ---------- event_circles ----------
-- Read: anyone who can already read the event. Write: events.edit on the
-- owning circle — inviting another circle is an act of the organizer, not
-- something the invited circle's own leader needs to approve. created_by is
-- passed through so a student may open their own meeting to another circle.

drop policy if exists "event_circles_select" on public.event_circles;
create policy "event_circles_select" on public.event_circles for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_circles.event_id
        and public.has_permission(auth.uid(), 'events.view', e.circle_id, null)
    )
    or public.is_event_member(event_circles.event_id)
  );

drop policy if exists "event_circles_write" on public.event_circles;
create policy "event_circles_write" on public.event_circles for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_circles.event_id
        and public.has_permission(auth.uid(), 'events.edit', e.circle_id, e.created_by)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_circles.event_id
        and public.has_permission(auth.uid(), 'events.edit', e.circle_id, e.created_by)
    )
  );

-- ---------- event_invitees ----------
-- Same shape as event_circles.

drop policy if exists "event_invitees_select" on public.event_invitees;
create policy "event_invitees_select" on public.event_invitees for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_invitees.event_id
        and public.has_permission(auth.uid(), 'events.view', e.circle_id, null)
    )
    or public.is_event_member(event_invitees.event_id)
  );

drop policy if exists "event_invitees_write" on public.event_invitees;
create policy "event_invitees_write" on public.event_invitees for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_invitees.event_id
        and public.has_permission(auth.uid(), 'events.edit', e.circle_id, e.created_by)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_invitees.event_id
        and public.has_permission(auth.uid(), 'events.edit', e.circle_id, e.created_by)
    )
  );

-- ---------- event_rsvps ----------
-- Read: your own row, or events.edit on the event's circle (the leader —
-- or the student who scheduled it, via created_by — managing headcount).
-- Write: events.rsvp, 'own' scope for every role — only your own RSVP, for
-- events you're a resolved member of.

drop policy if exists "event_rsvps_select" on public.event_rsvps;
create policy "event_rsvps_select" on public.event_rsvps for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_rsvps.event_id
        and public.has_permission(auth.uid(), 'events.edit', e.circle_id, e.created_by)
    )
  );

drop policy if exists "event_rsvps_write_self" on public.event_rsvps;
create policy "event_rsvps_write_self" on public.event_rsvps for all
  using (
    public.has_permission(auth.uid(), 'events.rsvp', null, profile_id)
    and public.is_event_member(event_rsvps.event_id)
  )
  with check (
    public.has_permission(auth.uid(), 'events.rsvp', null, profile_id)
    and public.is_event_member(event_rsvps.event_id)
  );

-- Row-level security above intentionally still lets a circle leader SELECT
-- an RSVP row for planning (headcount, who's going online vs in person) —
-- that's unchanged. But the free-text `reason`/`reason_category` are
-- admin-only, not leader-visible, even though the row itself is: RLS can
-- only grant or deny a whole row, never redact one column while exposing
-- the rest, so that split has to happen in a view instead. Every read of
-- reason/reason_category for display (not the caller's own row) should go
-- through this view, never the base table directly. security_invoker is
-- required here, not optional — without it, this view would run with the
-- privileges of whoever owns it (the role that ran this script), which on
-- some Postgres setups bypasses RLS entirely regardless of who's actually
-- querying.
drop view if exists public.event_rsvps_visible;
create view public.event_rsvps_visible
  with (security_invoker = true)
as
select
  event_id,
  profile_id,
  response,
  responded_at,
  attend_mode,
  case when public.is_admin() or profile_id = auth.uid() then reason else null end as reason,
  case when public.is_admin() or profile_id = auth.uid() then reason_category else null end as reason_category
from public.event_rsvps;

grant select on public.event_rsvps_visible to authenticated;

-- ---------- attendance ----------
-- Read: attendance.view (admin=all, administrative=circle, student=own).
-- Write: attendance.record (admin=all, administrative=circle, student=own —
-- a student may only ever write their OWN row, and only for an event they're
-- a resolved member of; the leader's/admin's circle-scoped write is
-- unrestricted by membership since taking attendance for the room is their
-- job). Self-recorded and leader-recorded attendance share the same row —
-- there's no separate "self-reported" column, so whichever was written last
-- wins; that's an accepted tradeoff of this scope, not an oversight.

drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select
  using (
    public.has_permission(auth.uid(), 'attendance.view', null, profile_id)
    or exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and public.has_permission(auth.uid(), 'attendance.view', e.circle_id, null)
    )
  );

drop policy if exists "attendance_write_leader" on public.attendance;
drop policy if exists "attendance_write" on public.attendance;
create policy "attendance_write" on public.attendance for all
  using (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and public.has_permission(auth.uid(), 'attendance.record', e.circle_id, null)
    )
    or (
      public.has_permission(auth.uid(), 'attendance.record', null, profile_id)
      and public.is_event_member(attendance.event_id)
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and public.has_permission(auth.uid(), 'attendance.record', e.circle_id, null)
    )
    or (
      public.has_permission(auth.uid(), 'attendance.record', null, profile_id)
      and public.is_event_member(attendance.event_id)
    )
  );

-- ---------- assignments ----------
-- Read: assignments.view (admin/leader see everything including drafts;
-- circle members only see published — the `published` clause stacks on
-- top of the permission check, it isn't part of has_permission itself).
-- Write: assignments.create/edit — one policy covering both, since they
-- share the same scope profile today.

drop policy if exists "assignments_select" on public.assignments;
create policy "assignments_select" on public.assignments for select
  using (
    public.has_permission(auth.uid(), 'assignments.view', circle_id, null)
    and (published or public.has_permission(auth.uid(), 'assignments.edit', circle_id, null))
  );

drop policy if exists "assignments_write" on public.assignments;
create policy "assignments_write" on public.assignments for all
  using (
    public.has_permission(auth.uid(), 'assignments.create', circle_id, null)
    or public.has_permission(auth.uid(), 'assignments.edit', circle_id, null)
  )
  with check (
    public.has_permission(auth.uid(), 'assignments.create', circle_id, null)
    or public.has_permission(auth.uid(), 'assignments.edit', circle_id, null)
  );

-- ---------- submissions ----------
-- This is where the "administrative is both author and answerer" rule
-- lives: submissions.create is 'own' scope for ALL THREE roles, including
-- admin and administrative, so it falls out of has_permission() itself
-- rather than needing special role branching here:
--   - `submissions_select` / `submissions_update_self`: submissions.view's
--     'own' fallback (via profile_id = auth.uid()) covers YOUR OWN
--     submission, regardless of role.
--   - `submissions_update_review`: submissions.review covers reviewing
--     OTHERS' submissions in circles you lead (or all, for admin).
-- An `administrative` user leading a circle they're also a member of
-- matches both policies simultaneously (Postgres OR's them together), so
-- one query naturally returns "my submission" + "my review queue".

drop policy if exists "submissions_select" on public.submissions;
create policy "submissions_select" on public.submissions for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and public.has_permission(auth.uid(), 'submissions.view', a.circle_id, null)
    )
  );

drop policy if exists "submissions_insert_self" on public.submissions;
create policy "submissions_insert_self" on public.submissions for insert
  with check (
    public.has_permission(auth.uid(), 'submissions.create', null, profile_id)
    and exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and a.published
        and public.has_permission(auth.uid(), 'assignments.view', a.circle_id, null)
    )
  );

drop policy if exists "submissions_update_self" on public.submissions;
create policy "submissions_update_self" on public.submissions for update
  using (public.has_permission(auth.uid(), 'submissions.create', null, profile_id))
  with check (public.has_permission(auth.uid(), 'submissions.create', null, profile_id));

drop policy if exists "submissions_update_review" on public.submissions;
create policy "submissions_update_review" on public.submissions for update
  using (
    exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and public.has_permission(auth.uid(), 'submissions.review', a.circle_id, null)
    )
  )
  with check (
    exists (
      select 1 from public.assignments a
      where a.id = submissions.assignment_id
        and public.has_permission(auth.uid(), 'submissions.review', a.circle_id, null)
    )
  );

-- ---------- notifications ----------
-- Strictly personal. Inserts are expected to come from trusted server-side
-- code using the service role key (which bypasses RLS) — the insert policy
-- here only covers what an authenticated client could do directly.

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications for select
  using (public.is_admin() or profile_id = auth.uid());

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self" on public.notifications for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "notifications_delete_self" on public.notifications;
create policy "notifications_delete_self" on public.notifications for delete
  using (public.is_admin() or profile_id = auth.uid());

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications for insert
  with check (public.is_admin());

-- ---------- host_blackout_dates ----------
-- Self-managed (Settings > Hosting). Circle leaders can read — not write —
-- blackout ranges for members of circles they lead, so the host picker can
-- skip someone who's away without exposing why to anyone but the owner.

alter table public.host_blackout_dates enable row level security;

drop policy if exists "host_blackout_dates_select" on public.host_blackout_dates;
create policy "host_blackout_dates_select" on public.host_blackout_dates for select
  using (
    public.is_admin()
    or profile_id = auth.uid()
    or exists (
      select 1 from public.circle_members cm
      where cm.profile_id = host_blackout_dates.profile_id
        and public.is_circle_leader(cm.circle_id)
    )
  );

drop policy if exists "host_blackout_dates_write_self" on public.host_blackout_dates;
create policy "host_blackout_dates_write_self" on public.host_blackout_dates for all
  using (public.is_admin() or profile_id = auth.uid())
  with check (public.is_admin() or profile_id = auth.uid());

-- ---------- join_requests ----------
-- Admin only. Rows are created by a Server Action using the service-role
-- client (the requester isn't authenticated yet, so there's no RLS-safe way
-- to let them insert directly) — this policy only covers admin review.

alter table public.join_requests enable row level security;

drop policy if exists "join_requests_admin" on public.join_requests;
create policy "join_requests_admin" on public.join_requests for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- org_settings ----------
-- Admin only, both read and write.

alter table public.org_settings enable row level security;

drop policy if exists "org_settings_admin" on public.org_settings;
create policy "org_settings_admin" on public.org_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Audit trail
--
-- Trigger-based at the database layer per CLAUDE.md, so it catches changes
-- made from the Supabase dashboard or by hand in SQL, not just through the
-- app. One generic trigger function, attached to every application table.
--
-- Actor resolution note: the CLAUDE.md spec describes resolving the actor
-- via set_config('app.actor_id', ...) set at the start of every request,
-- with auth.uid() as a fallback. That assumes a persistent session spanning
-- multiple statements — but Supabase's REST architecture (PostgREST) gives
-- each request its own connection/transaction, so a set_config() call from
-- one request would not persist into a later, separate .update() call the
-- way it would with a traditional long-lived DB session. auth.uid() is
-- already correct per-request (it reads the caller's JWT), which covers
-- every normal user-initiated write. It resolves to NULL for service-role
-- calls (invites, the deactivation-request notification) — which matches
-- the spec's own intent that a job should show a null actor, not masquerade
-- as a user. The coalesce is kept so a real set_config-based mechanism can
-- be layered in later without changing this function.
-- ============================================================================

create table if not exists public.audit_log (
  id bigserial,
  occurred_at timestamptz not null default now(),
  table_name text not null,
  record_id uuid,
  -- 'insert'/'update'/'delete' for trigger-generated rows; free text for the
  -- explicitly-logged app events in CLAUDE.md's "not covered by triggers"
  -- list (sign_in, data_export, etc.) — not CHECK-constrained to an enum
  -- since that second category isn't a fixed, enumerable set.
  action text not null,
  actor_id uuid,
  actor_role text,
  actor_email text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  context jsonb,
  reason text,
  primary key (id, occurred_at)
) partition by range (occurred_at);

-- A single default (catch-all) partition rather than a full rolling
-- 24-month partition-creation job — declarative partitioning requires every
-- row to land in some partition, and building the actual monthly
-- create/archive automation (pg_cron or pg_partman) is real, separate ops
-- work beyond this schema file's scope. This gives the partitioned
-- structure the spec asks for without pretending the automation exists.
create table if not exists public.audit_log_default partition of public.audit_log default;

create index if not exists idx_audit_log_table_record
  on public.audit_log (table_name, record_id, occurred_at desc);
create index if not exists idx_audit_log_actor on public.audit_log (actor_id, occurred_at desc);

create table if not exists public.audit_exclusions (
  table_name text not null,
  column_name text not null,
  primary key (table_name, column_name)
);

insert into public.audit_exclusions (table_name, column_name) values
  ('submissions', 'answer_text'),
  ('submissions', 'feedback'),
  ('profiles', 'home_address'),
  ('profiles', 'home_lat'),
  ('profiles', 'home_lng'),
  ('profiles', 'phone'),
  ('events', 'meet_url')
on conflict (table_name, column_name) do nothing;

create or replace function public.audit_row()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_actor_id uuid;
  v_actor_role text;
  v_actor_email text;
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_record_id uuid;
  v_excluded text[];
  v_reason text;
begin
  v_actor_id := coalesce(nullif(current_setting('app.actor_id', true), '')::uuid, auth.uid());
  -- Transaction-scoped (the `true` arg to set_config), set by RPCs like
  -- change_member_role() right before the write they wrap — see that
  -- function for why a reason can't just be passed as a normal column.
  v_reason := nullif(current_setting('app.reason', true), '');

  if v_actor_id is not null then
    select role::text, email into v_actor_role, v_actor_email
    from public.profiles where id = v_actor_id;
  end if;

  if TG_OP = 'INSERT' then
    v_new := to_jsonb(NEW);
    v_record_id := nullif(v_new ->> 'id', '')::uuid;
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := nullif(v_new ->> 'id', '')::uuid;

    select array_agg(n.key) into v_changed
    from jsonb_each(v_new) as n(key, value)
    where n.value is distinct from (v_old -> n.key);

    -- Nothing actually changed (e.g. a no-op update) — don't log a
    -- meaningless row.
    if v_changed is null then
      return NEW;
    end if;
  elsif TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_record_id := nullif(v_old ->> 'id', '')::uuid;
  end if;

  select array_agg(column_name) into v_excluded
  from public.audit_exclusions where table_name = TG_TABLE_NAME::text;

  if v_excluded is not null then
    if v_old is not null then
      v_old := v_old - v_excluded;
    end if;
    if v_new is not null then
      v_new := v_new - v_excluded;
    end if;
  end if;

  insert into public.audit_log (
    table_name, record_id, action, actor_id, actor_role, actor_email,
    old_data, new_data, changed_fields, context, reason
  ) values (
    TG_TABLE_NAME::text, v_record_id, lower(TG_OP), v_actor_id, v_actor_role, v_actor_email,
    v_old, v_new, v_changed,
    jsonb_build_object('source', case when v_actor_id is null then 'job' else 'app' end),
    v_reason
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'circles', 'circle_members', 'circle_leaders',
    'role_permissions', 'events', 'event_circles', 'event_invitees',
    'event_rsvps', 'attendance', 'assignments', 'submissions',
    'notifications', 'host_blackout_dates', 'join_requests', 'org_settings'
  ]
  loop
    execute format('drop trigger if exists audit_row_trigger on public.%I', t);
    execute format(
      'create trigger audit_row_trigger after insert or update or delete on public.%I ' ||
      'for each row execute function public.audit_row()',
      t
    );
  end loop;
end $$;

-- Append-only: nobody, including admins, can UPDATE or DELETE audit rows
-- directly — only the SECURITY DEFINER trigger function above may insert.
revoke update, delete on public.audit_log from authenticated, anon;

alter table public.audit_log enable row level security;
alter table public.audit_exclusions enable row level security;

-- Resolves which circle (if any) an audited row belongs to, so audit.view's
-- 'circle' scope (administrative) can be checked per-row without RLS
-- policies needing to know every table's shape. Tables with no circle
-- association (profiles, notifications, org_settings, join_requests,
-- host_blackout_dates) return null — has_permission() then denies
-- administrative on those rows (only admin's 'all' scope reaches them),
-- which matches audit.view's intent: circle-scoped access, not "anything
-- touching a member".
create or replace function public.audit_row_circle_id(p_table_name text, p_record_id uuid)
returns uuid
language sql security definer set search_path = public stable
as $$
  select case p_table_name
    when 'circles' then p_record_id
    when 'circle_leaders' then (select circle_id from public.circle_leaders where circle_id = p_record_id limit 1)
    when 'events' then (select circle_id from public.events where id = p_record_id)
    when 'event_circles' then (select circle_id from public.event_circles where event_id = p_record_id limit 1)
    when 'event_invitees' then (select e.circle_id from public.event_invitees ei join public.events e on e.id = ei.event_id where ei.id = p_record_id)
    when 'event_rsvps' then (select e.circle_id from public.events e where e.id = p_record_id)
    when 'attendance' then (select e.circle_id from public.attendance att join public.events e on e.id = att.event_id where att.id = p_record_id)
    when 'assignments' then (select circle_id from public.assignments where id = p_record_id)
    when 'submissions' then (select a.circle_id from public.submissions s join public.assignments a on a.id = s.assignment_id where s.id = p_record_id)
    else null
  end;
$$;

-- audit.view: admin sees everything ('all' scope short-circuits before
-- audit_row_circle_id is even needed); administrative sees rows belonging
-- to a circle they lead.
drop policy if exists "audit_log_select_admin" on public.audit_log;
drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select" on public.audit_log for select
  using (
    public.has_permission(auth.uid(), 'audit.view', public.audit_row_circle_id(table_name, record_id), null)
  );

drop policy if exists "audit_exclusions_select_admin" on public.audit_exclusions;
create policy "audit_exclusions_select_admin" on public.audit_exclusions for select
  using (public.is_admin());
