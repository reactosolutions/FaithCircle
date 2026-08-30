@AGENTS.md

# Rewaa (رواء)

A web app for a faith community group that meets on a recurring schedule at members'
homes for faith-oriented discussion. Members are organized into circles; each circle has
a leader, a meeting schedule, homework assignments, and an attendance record.

## Stack
- Next.js 16 (App Router) + TypeScript, strict mode
- Tailwind CSS v4 + shadcn/ui
- Supabase: Postgres, Auth (email/password + Google), Row Level Security, Storage
- Server Components for reads; Server Actions for writes. No separate API server.
- Zod for all input validation, shared between client and server
- date-fns for dates. Store all timestamps as timestamptz in UTC; render in Asia/Riyadh.

## Roles
- `admin` — full access to every circle, member, event, assignment. Manages roles.
- `administrative` — leads one or more circles. Creates assignments, schedules events,
  takes attendance, reviews submissions. ALSO submits answers to homework like a student.
- `student` — answers homework, RSVPs, views own attendance and history. May host meetings.

Key rule: `administrative` is both an author and an answerer. Any homework query must
return their own submission alongside their review queue. Do not model this as two
mutually exclusive states.

## Signup

A self-service `/signup` page in `(auth)`, distinct from the existing admin-invite flow
(`inviteMember`), which stays as-is for admin-initiated onboarding.

Fields: full name, email, password with the eye toggle, confirm password, phone
(optional), and an optional circle invite code. Google sign-up uses the same
`/auth/callback` handler already built.

SECURITY — non-negotiable:
- The signup form NEVER sends a role. The client cannot influence it.
- Profile creation happens in a Postgres trigger on `auth.users` insert that hardcodes
  `role = 'student'`. Status is `'pending'` for a self-service signup, `'invited'` for an
  admin-initiated one (distinguished by `auth.users.invited_at`, which only
  `admin.inviteUserByEmail` sets). Do not create the profile from client or Server Action
  code.
- A trigger guard on `profiles` blocks any INSERT or UPDATE from setting `role` to
  `admin` or `administrative` unless the actor is already an admin (or the call has no
  authenticated actor at all — a trusted server-side context). Those values are reachable
  only through the role-assignment action below.

Flow:
1. Submit → Supabase `signUp` with email confirmation required.
2. "Check your email" screen with a resend button on a 60s cooldown.
3. On confirmation, land on a short complete-your-profile step (phone, hosting
   availability) — the same step an admin-invited user completes, gated by
   `profiles.profile_completed_at is null`. Then a "Waiting for approval" state — the app
   shell renders (nav, header) with the main content area replaced by an explanatory
   card, for status `'pending'` with `profile_completed_at` set.
4. If a valid circle invite code was given and that circle's `join_policy` is
   `'open_invite'`, skip approval: set status `'active'` and insert the `circle_members`
   row. Circles carry their own `invite_code` and `join_policy` — separate from the
   org-wide invite link already in `org_settings`, which is for when no circle is named.
5. Otherwise the account sits at status `'pending'` in Settings > Organization > Roles'
   approval queue until an admin approves (assigns a circle, sets `'active'`) or rejects
   (`'inactive'`).

Also: rate-limit signup by IP, use the same generic response for an already-registered
email as for a new one, and write a `signup` event to the audit log (not trigger-covered,
per the Audit trail section's "log these explicitly from the app" list).

## Permissions

Three tables, one function, no hardcoded role checks in components, Server Actions, or
RLS policies.

- `permissions` — `key` text PK (e.g. `'events.edit'`), `resource`, `action`,
  `description`.
- `role_permissions` — `role`, `permission_key`, `scope` (`'own'` | `'circle'` | `'all'`).
  `'own'` = only rows where the actor is the subject. `'circle'` = rows in circles the
  actor is involved with — for `administrative` this means circles in `circle_leaders`
  (leadership required, including for every write permission); for `student` it means
  circles in `circle_members` (membership is enough). The one `'circle'`-scoped *write*
  a student holds is `events.create` — any member may schedule a meeting for their
  circle; everything they do to that meeting afterwards runs through `events.edit` at
  `'own'` scope (keyed on `events.created_by`). `admin` never uses `'circle'` scope —
  every admin row in the matrix is `'all'`. `'all'` = unrestricted.
- `circle_leaders` — `circle_id`, `profile_id`. An `administrative` may lead more than one
  circle. `circles.leader_id` remains the circle's single primary/organizing leader (used
  for defaults like the events form's owning circle); `circle_leaders` is the source of
  truth for permission scope and is seeded with one row per circle from its `leader_id`.

`has_permission(actor uuid, key text, target_circle uuid default null, target_profile
uuid default null) returns boolean` — `SECURITY DEFINER`. Resolves the actor's role,
looks up scope for `(role, key)`, evaluates it against the target. This function is the
ONLY place permission logic lives. RLS policies call it. Server Actions call it via the
`requirePermission()` guard below. The UI calls a cached client-side mirror
(`usePermissions()`) for rendering only — never for enforcement.

Permission matrix (seeded into `role_permissions`):

| Permission | admin | administrative | student |
|---|---|---|---|
| `members.view` | all | circle | circle |
| `members.view_contact` | all | circle | — |
| `members.invite` | all | circle | — |
| `members.edit` | all | — | own |
| `members.deactivate` | all | — | — |
| `members.delete` | all | — | — |
| `roles.assign_administrative` | all | — | — |
| `roles.assign_admin` | all | — | — |
| `circles.create` | all | — | — |
| `circles.edit_settings` | all | circle | — |
| `events.view` | all | circle | circle |
| `events.create` | all | circle | circle |
| `events.edit` | all | circle | own |
| `events.delete` | all | circle | — |
| `events.host_self` | own | own | own |
| `attendance.view` | all | circle | own |
| `attendance.record` | all | circle | own |
| `assignments.create` | all | circle | — |
| `assignments.edit` | all | circle | — |
| `submissions.create` | own | own | own |
| `submissions.view` | all | circle | own |
| `submissions.review` | all | circle | — |
| `settings.organization` | all | — | — |
| `audit.view` | all | circle | — |
| `data.export` | all | circle | — |

`submissions.create` is `own` for all three roles — that's what makes `administrative`
both an author and an answerer. `roles.assign_admin` is admin-only, so an `administrative`
can never manufacture a peer or a superior.

`events.create`/`events.edit` let any member run their own meetings: a `student` may
schedule a meeting for a circle they belong to, then fully edit it, invite other
circles/people to it, and see its RSVP headcount — all gated by `events.created_by`
matching them (`events.edit`'s `own` scope). They cannot touch a meeting a leader
scheduled, and there is no student `events.delete`. Pre-existing meetings are backfilled
so `created_by` is the owning circle's primary leader.

`events.host_self` (`own` for every role) is the separate, narrower path for hosting a
meeting you did NOT create. The "I'll host" control (event detail page's host card, and
a shortcut on the dashboard's upcoming-meetings list / hero for hostless meetings) calls
`claim_event_host(event_id)` — a `SECURITY DEFINER` function that sets `host_id` to the
caller and only the caller, copies their saved `home_address`/`home_lat`/`home_lng`/
`host_capacity` onto the meeting, and flips their `can_host` on so there's no detour
through Settings > Hosting first. It requires the caller be a resolved member
(`is_event_member`) of a non-online meeting; replacing an existing host is allowed. The
UI gate always shows a confirm step naming the exact date. `release_event_host(event_id)`
(current host only) clears `host_id`. Marking yourself available in Settings > Hosting +
picking yourself in an edit form still works for meetings you own.

RSVP and attendance are ONE record (`event_rsvps`, one row per event+person) — "are you
coming" and "did you come" are the same field. `response` doubles as the attendance
status: `going` = present, `not_going` = absent, `not_going` + a reason = excused;
`tentative`/`no_response` = no mark. `attend_mode` is intent before the meeting, actual
after. The old `attendance` table is now a read-only compatibility VIEW over `event_rsvps`
in the present/absent/excused shape (so existing readers — the attendance sheet, member
history, dashboards, CSV export — are untouched); writes go through `event_rsvps` via the
attendance Server Actions. Consequences of the merge, all accepted: no separate no-show
signal ("said going, marked absent" collapses to `not_going`), no distinct `excused`
value, one timestamp (`responded_at`) instead of separate respond/mark times, and no
date lock — the record is editable any time, last write wins.

`attendance.record` is the single write permission for that record (`events.rsvp` was
retired into it). `own` scope for every role covers your own row for a meeting you're a
resolved member of (`event_circles` ∪ `event_invitees`) — self-RSVP and self-check-in
both. `circle`/`all` scope (leaders/admin) covers anyone's row in their circle. On the
event page the member sees `RsvpControl` before the meeting day and `SelfAttendanceControl`
from the meeting day on; both write the same row. `marked_by` is null for a plain
self-RSVP, set once someone records attendance — that's what "recent attendance" and
`deleteMember`'s history check key on.

`members.delete` is a genuine hard delete (`auth.users`, cascading to `profiles` and
everything keyed off it) — distinct from `members.deactivate`, which only ever flips a
status flag. `deleteMember`/`bulkDeleteMembers` (`features/members/actions.ts`) refuse to
run it against anyone with real history: any `attendance` or `submissions` row, any
`events.host_id` or `assignments.created_by` reference, or current circle leadership
(`circle_leaders` or `circles.leader_id`) all block deletion with a specific reason —
`updateMemberStatus`'s deactivate path is what those accounts need instead. Circle
membership, RSVPs, notifications, and "who marked/reviewed this" references are not
treated as history (the schema's own `on delete cascade`/`set null` choices already agree
that losing those is fine) — safe to delete over.

## Role assignment

- Only `admin` may change any role. `administrative` can invite students to their own
  circle (via `members.invite`, `'circle'` scope) and nothing more.
- No user may change their own role, ever — including an admin. Enforced in
  `has_permission`'s caller (the role-change Server Action), not the UI.
- The last remaining active admin cannot be demoted or deactivated. Checked with a count
  query inside the same transaction as the change, not a pre-flight check that could race.
- Promoting to `administrative` requires assigning at least one circle in the same action
  — an `administrative` with no circle has `'circle'` scope over nothing and looks broken.
- Demoting from `administrative` requires choosing what happens to their circles: reassign
  to another leader, or leave leaderless (admin-managed, `circle_leaders` row removed with
  no replacement). Never silently orphan a circle.
- Every role change requires a reason string, written to `audit_log` via the same
  `reason` column destructive actions already use.
- Role changes send a notification (`notifyUsers`) to the affected user.

## Schema (Supabase)
- profiles — id (= auth.users.id), full_name, email, phone, role, avatar_url,
  can_host, home_address, home_lat, home_lng, host_capacity, status
- circles — id, name, description, leader_id, created_at
- circle_members — circle_id, profile_id, joined_at  (composite PK)
- events — id, circle_id, title, description, starts_at, ends_at, host_id,
  address, lat, lng, recurrence, parent_event_id, status
- event_rsvps — event_id, profile_id, response ('going'|'not_going'|'tentative'|'no_response'),
  responded_at, attend_mode, reason, reason_category, note, marked_by  (composite PK) —
  the single participation record (RSVP + attendance merged)
- attendance — read-only VIEW over event_rsvps (id, event_id, profile_id,
  status 'present'|'absent'|'excused', note, marked_by, marked_at, mode); no base table
- assignments — id, circle_id, title, instructions, attachment_url, due_at,
  created_by, points, published
- submissions — id, assignment_id, profile_id, answer_text, attachment_url,
  status ('draft'|'submitted'|'reviewed'), submitted_at, reviewer_id, feedback,
  score, reviewed_at  (unique on assignment_id + profile_id)
- notifications — id, profile_id, type, payload jsonb, read_at

## Meeting formats

Events are `in_person`, `online`, or `hybrid`. The model must not assume a host or an
address exists.

events — changed and added columns:
- format enum ('in_person' | 'online' | 'hybrid')  NOT NULL
- host_id, address, lat, lng  → NULLABLE (an online-only event has no host)
- meet_url text, meet_provider ('google_meet'|'zoom'|'teams'|'other'), meet_notes
- in_person_capacity int — defaults from the host's host_capacity, overridable
- audience ('circle' | 'multi_circle' | 'custom')
Constraint: format in ('online','hybrid') requires meet_url — enforced as a CHECK
constraint, not only in the form. host_id/address are NOT required at creation for
in_person/hybrid, even though the format implies a physical meeting: same "optional now,
addable later" pattern as a circle's advisors — an in-person meeting with no host yet is
an incomplete-but-real state, not an error. The UI should still nudge toward filling
them in (e.g. flagging a hostless in-person meeting), just never block scheduling on it.

event_circles — event_id, circle_id (composite PK). The owning circle stays on
events.circle_id for permissions; this table holds every circle invited. A meeting can
therefore be for one group, two groups combined, or a different group than the organizer's.

event_invitees — event_id, profile_id, added_by. For ad-hoc individuals outside the
invited circles.

event_rsvps — added columns:
- response gains a fourth value: 'tentative' — no attend_mode, no reason; a placeholder
  for "maybe," not a commitment to either direction.
- attend_mode ('in_person' | 'online' | null) — required when response = 'going' on a
  hybrid event, forced to the only valid value on single-format events
- reason text
- reason_category ('travel'|'illness'|'work'|'family'|'distance'|'other'|null)
  Required (one of reason/reason_category, not necessarily both), not optional, in both
  directions this applies: declining outright (response = 'not_going'), and attending
  online instead of in person on a hybrid meeting (response = 'going', attend_mode =
  'online', format = 'hybrid'). Enforced in the Zod schema for the not_going case; the
  online-instead-of-in-person case depends on the event's format, which isn't part of
  that input, so it's checked in the Server Action instead, right where attend_mode
  is resolved.

  reason/reason_category are narrower to READ than the rest of the row: an admin, the
  row's own owner, and a leader who can record attendance for that circle
  (`attendance.record`) see them; a leader still sees response/attend_mode/note for
  headcount and room planning. RLS can only grant or deny a whole row, never redact one
  column, so this is enforced via a view instead: `event_rsvps_visible` (declared
  `security_invoker = true`, required rather than optional — without it the view would
  run with the privileges of whoever owns it, bypassing RLS regardless of who's actually
  querying) nulls out reason/reason_category for anyone outside that set. Every read of
  another profile's reason for DISPLAY must go through this view, never the event_rsvps
  table directly — querying the base table instead is the mistake that would silently
  leak reasons.

attend_mode on event_rsvps carries double duty: how they *expect* to attend before the
meeting, how they *actually* did after. The attendance write paths set it explicitly;
it's never silently copied from one meaning to the other.

Membership resolution: the set of people who may see and RSVP to an event =
members of any circle in event_circles ∪ rows in event_invitees. Write this once as a
SQL function and use it in RLS policies and queries alike — do not reimplement it per page.

## Calendar

Gregorian is the ONLY calendar the system operates on. All storage, comparison,
sorting, recurrence generation, due-date math, and queries use Gregorian timestamptz
in UTC. There is no Hijri column anywhere in the schema.

Hijri is display-only, rendered at the last moment from the Gregorian value:
- Use Intl.DateTimeFormat with the 'islamic-umalqura' calendar — the Umm al-Qura
  variant, which is the Saudi civil standard. Do not use plain 'islamic' or
  'islamic-civil'; they drift by a day or more.
- Conversion lives in src/lib/format.ts as hijri(date, locale). Nothing calls Intl
  for a Hijri date anywhere else.
- Never parse a Hijri string back into a date. Never do arithmetic on Hijri values —
  no adding days or months, no comparing two Hijri strings. Convert Gregorian, render,
  discard.

Where Hijri appears (secondary, smaller, muted, in parentheses or on a second line):
- Calendar header for the visible month
- Event detail page header
- Event cards in the agenda list
Where it does NOT appear: tables, dense lists, form inputs, date pickers, filter
chips, exports, or anything a user types into. Date pickers stay Gregorian only.

Controlled by a per-user setting: Preferences > "Show Hijri dates", default ON for the
Arabic locale and OFF for English. When off, no Hijri is rendered anywhere.

Week starts on Sunday by default (Saudi convention), overridable in Preferences.
Pass weekStartsOn through to the calendar grid — do not rely on the date-fns default.

Civil (midnight-based) Hijri conversion, not sunset-based — matches what members see
on their phones and in Saudi official documents everywhere else, and avoids a meeting
showing two different Hijri dates depending on whether an attendee is local or joining
online from another timezone.

## Audit trail

Trigger-based, at the database layer. Every table gets the same generic trigger; no
per-table audit code. Application-level logging misses anything changed from the
Supabase dashboard, any SQL run by hand, and any code path someone forgets to
instrument — which defeats the purpose.

audit_log
- id bigserial, occurred_at timestamptz default now()
- table_name text, record_id uuid, action ('insert'|'update'|'delete')
- actor_id uuid, actor_role text, actor_email text (denormalized — the actor may be
  deactivated later and you still need to know who acted)
- old_data jsonb, new_data jsonb, changed_fields text[]
- context jsonb (ip, user_agent, request_id, source: 'app'|'dashboard'|'job')
- reason text (nullable, set explicitly for destructive actions)

Actor resolution
- The trigger reads coalesce(current_setting('app.actor_id', true)::uuid, auth.uid()).
- The Supabase server client sets app.actor_id, app.actor_role, and app.context via
  set_config at the start of every request. Service-role and cron calls set
  source='job' with a null actor — never let a job masquerade as a user.

Append-only, enforced in SQL
- REVOKE UPDATE, DELETE on audit_log FROM every role including admins.
- Only the SECURITY DEFINER trigger function may INSERT.
- RLS: SELECT for admin only. Circle leaders may read rows scoped to their own circles
  via a view, not the base table.

Column redaction — CRITICAL
The audit table becomes a second copy of every row in the database, including home
addresses, phone numbers, meeting links, homework answers, and private feedback. Maintain
an exclusion list per table in a config table, and have the trigger strip those keys from
old_data/new_data while still recording the field name in changed_fields. At minimum
exclude: submissions.answer_text, submissions.feedback, profiles.home_address,
profiles.home_lat, profiles.home_lng, profiles.phone, events.meet_url.
The audit records THAT a field changed and by whom — not always WHAT it changed to.

Not covered by triggers — log these explicitly from the app
- sign-in, sign-out, failed sign-in, password reset requested and completed
- OAuth account linked
- data export generated (who, which table, row count)
- home address or meeting link revealed to a user
Do NOT audit ordinary reads. Only the sensitive reveals above.

Retention: partition audit_log by month. Keep 24 months hot, archive older to storage.

## Database conventions
- Schema lives in `supabase/schema.sql` as ONE idempotent, re-runnable script
  (drop-if-exists / create-or-replace throughout). I paste it into the Supabase SQL Editor.
  Do not generate versioned migration files.
- RLS enabled on every table. Never rely on client-side role checks alone.
- Role checks in policies go through a `SECURITY DEFINER` helper function reading
  `profiles.role` — never a subquery on `profiles` inside a `profiles` policy, or
  you'll create infinite recursion.
- Policy intent:
  - students read events/assignments only for circles they belong to, and may create
    events in those circles — then edit/manage only the ones they created
    (`events.created_by`)
  - students read/write only their own participation row (`event_rsvps` — RSVP and
    attendance merged; `attendance.record`'s `own` scope, see above) and submissions
  - administrative read/write everything inside circles they lead, plus their own submissions
  - admin bypasses via the helper function
- Seed script `supabase/seed.sql` with one circle, one admin, two administrative,
  six students, three past events with participation rows (`event_rsvps`), and two
  assignments.

## Design system

Mint-teal token palette, repainted around the رواء logo's brand mint (a ~169° hue teal,
logo mint = #89D2C5) — replaces the earlier Material 3 dark-forest/gold palette. The
logo carries no second brand color, so the whole system was regenerated from that one
hue rather than just swapping the primary value; gold is gone. Fonts: Plus Jakarta Sans
for headings, Inter for body (replacing Geist). Icons: Material Symbols Outlined via a
`<link>` in the root layout + `src/components/ui/icon.tsx`'s `<Icon name="..." />`
wrapper — never lucide-react, which has been fully removed.

Light: primary #15473E, accent #89D2C5 (accent-foreground #112C27, the logo's mint used
directly), background #F3FCFA, surface/card #FFFFFF, foreground #112C27,
muted-foreground #536A66, success #2E7D5B, warning #A06308 (warning-foreground
#FFFFFF), destructive #BA1A1A, border #D6E0DE.
Dark: primary #A1D9CE (dark-mode primary stays the light "inverse-primary" tint —
close to the logo's own mint — rather than a darkened version of the light primary),
accent #5EBAA9, background #121C1A, card #1B2725, foreground #E4ECEA, success #6FCF9E,
warning #F3C068 (warning-foreground #3A2400), destructive #FFB4A9.

`warning` is a deliberately off-hue amber, kept separate from the mint brand family —
same role gold used to fill (see Motion section's status-color list below) — needed so
"today" and "excused" chips stay visually distinct from the teal-family
upcoming/in-person/primary colors, now that accent itself is a teal tint.

Radius: 4px default / 8px `lg` / 12px `xl` / pill `full` — matches the mockups' own
Tailwind radius scale. Soft low shadows, generous whitespace. Every value above is
defined as a CSS variable in globals.css and mapped to Tailwind theme tokens — never
hardcode a hex value or an icon-library import in a component.

## Motion and visual language

This is a calm, community app. Motion should feel unhurried and purposeful — never
bouncy, never attention-seeking. If an animation makes someone wait, it's wrong.

Library: motion (framer-motion). Tailwind's animate utilities for simple cases.

Timing
- Micro-interactions (hover, press, toggle): 120–150ms
- Element enter/exit, sheets, dropdowns: 200–250ms
- Page transitions: 250–300ms
- Easing: ease-out for entering, ease-in for leaving. Never linear. No spring bounce
  above stiffness 300.
- Nothing animates longer than 400ms. Nothing loops except loading indicators.

Required patterns
- List items stagger in at 30ms intervals, max 8 items staggered, rest appear instantly.
- Numbers count up on first paint only (600ms), never on refetch.
- Progress rings and bars animate from 0 to value once on mount.
- Skeleton loaders, not spinners, for anything that loads with a known shape.
- Optimistic UI: the attendance toggle, RSVP, and homework draft-save respond instantly
  with a subtle state change, then reconcile.
- Success confirmations: a brief checkmark draw, then fade. No confetti.

Mandatory
- Respect prefers-reduced-motion: wrap everything in a useReducedMotion check that
  reduces to opacity-only fades. This is not optional.
- Under RTL, slide directions mirror — use logical x values driven by the locale
  direction, never hardcoded negative x.
- Never animate layout-affecting properties (width, height, top, left). Transform and
  opacity only.

Resisted on purpose: animated page-load progress bars on every navigation (Next.js is
fast enough that it reads as artificial delay), and animating the attendance sheet rows
— that screen is used quickly on a phone and any motion there gets in the way.

Icons: Material Symbols Outlined via `<Icon name="..." />`
(`src/components/ui/icon.tsx`) — 20px in lists, 24px in headers. `filled` sets the
FILL axis for an active/selected state (nav items, toggled buttons) instead of
swapping to a different icon. Give every domain concept a consistent icon and never
vary it: circles=group, events=event, homework=menu_book, attendance=person_check,
online=videocam, in-person=location_on, hybrid=layers, host=door_open,
settings=settings, audit=history. Icons in empty states render at 48px in a tinted
circle, never bare.

Depth: cards use a 1px border plus a very soft shadow — not a heavy drop shadow. Elevate
on hover by 2px translate and a slightly stronger shadow, 150ms.

Hierarchy pass (applies to every existing page, not just new ones)
1. Every page gets ONE hero element — a large primary card or stat — that is visually
   dominant. Not every card carries equal weight.
2. Empty states get a 48px icon in a tinted circle, a one-line explanation, and a
   primary action. No page may show bare "No data" text.
3. Status gets color AND an icon, consistently: upcoming=teal, today=amber,
   present=green, absent=red, excused=amber, online=indigo, in-person=teal. "Today" and
   "excused" both use the `warning` token (see Design system) since accent is now a teal
   tint and can no longer double as the off-hue highlight gold used to provide.
4. A mint hairline accent (the `accent` token) on section headers and a subtle background
   texture or gradient wash behind the page header — flat off-white on every page is
   most of what reads as flat.
5. Vary card density: stat cards short and wide, list cards tall. Break the grid.

## Dashboards

Recharts, using the design tokens (`--chart-1`…`--chart-5`, `--info` for indigo). Chart
palette: primary teal #15473E, indigo #4C5FA8 (`--info`, also "online" status color),
logo mint #89D2C5 (`--accent`) for highlights only — never for a data series carrying
text labels, since the pastel mint is too light against a light background to pass
contrast for text.

Since RSVP and attendance are one record, every "attendance" figure below means
`event_rsvps.response = 'going'` on a meeting whose `starts_at` is in the past — a future
"going" RSVP is intent, not attendance, and must be filtered out. "Absence reasons"
counts `reason_category` on `not_going` rows and now reads for leaders too (they can see
reasons for their circle).

STUDENT
- Attendance rate: circular progress ring, animated 0→value on mount, with meetings
  attended / total beneath.
- My attendance timeline: last 12 meetings as a row of small squares, color-coded
  present/absent/excused, hoverable for the date. Compact and scannable.
- Homework completion: horizontal stacked bar — reviewed / submitted / pending / late.
- Current streak: consecutive meetings attended, with a flame or ring icon.

ADMINISTRATIVE (per circle they lead)
- Attendance trend: bar chart, last 8 meetings, with a dashed average line.
- Format mix: donut of in-person vs online attendance over the period — this is the
  chart that tells them whether the group is drifting online.
- Submission funnel: assigned → submitted → reviewed, as a horizontal funnel.
- Member engagement: scatter or simple two-column list plotting attendance % against
  homework completion %, so outliers in either direction are visible.
- Absence reasons: horizontal bar of reason_category counts. Leaders asked for reasons;
  this is what makes collecting them worthwhile.
- Host rotation: list of members by "last hosted" date, oldest first.

ADMIN — activity feed, not charts. An admin's dashboard need is "what needs my
attention right now," not org-wide trend analysis (that's what the Members, Circles,
and Audit log pages are for) — so this view stays chart-free by design:
- Needs your approval: always renders, even with nothing pending (an admin dashboard
  section that vanishes when empty reads as broken, not as "all clear") — a tinted
  card listing pending signups and join requests, each linking to where it's actually
  actioned (Members page or Settings > Organization). Empty state uses `EmptyState`.
- Upcoming meetings, Recently submitted homework, and Recent attendance: three
  equal-weight lists, org-wide (admin sees every circle unfiltered), each capped to a
  handful of rows and linking through to the relevant event/assignment. Recent
  attendance renders through `useAttendanceStatusMeta` for its status icon/color, same
  as every other attendance list in the app.

All charts (STUDENT and ADMINISTRATIVE dashboards)
- Animate on first render only (800ms ease-out), never on filter change — change should
  be instant so it feels responsive.
- Under RTL, reverse the x-axis and mirror the legend. Recharts does not do this itself.
- Numbers through the shared formatter so digit style follows the locale setting.
- Every chart has a skeleton state matching its final dimensions, and an empty state
  with an icon rather than an empty axis.
- Below md, charts go full-width single column and drop to a maximum of 6 x-axis labels.
- Tooltips must work on tap, not hover only.

## Responsive

Mobile-first. Write base styles for a 360px viewport, then add `md:` and `lg:` upward.
Never write desktop styles and walk them back down. Every phase in this file ships
responsive — it is not a separate task.

Breakpoints: base <640 (phone), md 768 (tablet), lg 1024+ (desktop).

Navigation
- Desktop: left sidebar, always visible.
- Phone: bottom tab bar — Home, Calendar, Homework, Attendance (admin/administrative
  only), Circles, More. The "More" tab opens a full-page list holding Members, Settings,
  and admin sections.
- Bottom bar respects env(safe-area-inset-bottom) so it clears the iOS home indicator.

Layout patterns that must change, not shrink
- Tables (members, circles, audit log) become stacked cards below md. Never allow
  horizontal scroll on a data table.
- Split panes (homework review) become a list that navigates to a full-screen detail
  with a back button. Prev/Next submission moves to a sticky footer.
- Calendar month grid stays but collapses to date + a dot indicator, with the day's
  events as an agenda list underneath. Week view is hidden below md — offer Day instead.
- Dialogs become bottom sheets below md (shadcn Drawer), not centered modals.
- Multi-column forms collapse to one column with a sticky bottom action bar.

Rules
- Minimum touch target 44x44px. No hover-only affordances — every hover action needs a
  tap equivalent.
- Use 100dvh, never 100vh, or mobile browser chrome will clip the layout.
- No fixed pixel widths on containers. Images and maps get aspect-ratio, not fixed height.
- Use logical spacing utilities (ps-/pe-/ms-/me-/text-start) instead of pl-/pr-/text-left.
  This costs nothing now and makes the Arabic RTL layout almost free later.
- Long names, emails, and addresses must truncate or wrap — never push the layout wide.

Verify every screen at 360px, 390px, 768px, and 1280px before calling it done.

## Conventions
- `src/app/(auth)` for sign-in, `src/app/(app)` for the authenticated shell.
- Feature folders: `src/features/{events,homework,attendance,members}` each holding
  `queries.ts`, `actions.ts`, `schema.ts`, and `components/`.
- Every Server Action: validate with Zod, re-check permission server-side, return
  `{ ok: true, data }` or `{ ok: false, error }`. Never throw raw Postgres errors to the UI.
- Generate Supabase types into `src/lib/database.types.ts`; no `any`.
- Loading and empty states are required for every list, not optional polish.
- Do not add features that aren't in this file or the task I gave you. Ask first.
