-- Rewaa (رواء) seed data
-- Run AFTER schema.sql, in the Supabase SQL Editor. Idempotent: re-running
-- it will not create duplicates. All seed users share the password:
-- FaithCircle123!

create extension if not exists pgcrypto;

-- Temporary helper: creates an auth.users + auth.identities row the way
-- Supabase Auth expects, so the seeded accounts can actually sign in.
-- public.handle_new_user() (see schema.sql) fires on insert and creates
-- the matching profiles row automatically. Dropped at the end of this file.
create or replace function public.seed_user(
  p_email text,
  p_password text,
  p_full_name text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      p_email, crypt(p_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email', now(), now(), now()
    );
  end if;

  return v_user_id;
end;
$$;

do $$
declare
  v_admin_id uuid;
  v_lead1_id uuid;
  v_lead2_id uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid;
  v_circle_id uuid;
  v_ev1 uuid; v_ev2 uuid; v_ev3 uuid;
  v_a1 uuid; v_a2 uuid;
begin
  -- 1 admin, 2 administrative (circle leaders), 6 students
  v_admin_id := public.seed_user('admin@faithcircle.test', 'FaithCircle123!', 'Amina Haddad');
  v_lead1_id := public.seed_user('leader.omar@faithcircle.test', 'FaithCircle123!', 'Omar Rasheed');
  v_lead2_id := public.seed_user('leader.sara@faithcircle.test', 'FaithCircle123!', 'Sara Youssef');
  v_s1 := public.seed_user('student.layla@faithcircle.test', 'FaithCircle123!', 'Layla Nasser');
  v_s2 := public.seed_user('student.karim@faithcircle.test', 'FaithCircle123!', 'Karim Aziz');
  v_s3 := public.seed_user('student.huda@faithcircle.test', 'FaithCircle123!', 'Huda Saleh');
  v_s4 := public.seed_user('student.yusuf@faithcircle.test', 'FaithCircle123!', 'Yusuf Mansour');
  v_s5 := public.seed_user('student.rania@faithcircle.test', 'FaithCircle123!', 'Rania Kassem');
  v_s6 := public.seed_user('student.tariq@faithcircle.test', 'FaithCircle123!', 'Tariq Fadel');

  -- handle_new_user() now defaults new profiles to status 'invited' (see
  -- schema.sql) so a self-service Google sign-in lands in onboarding; these
  -- seeded demo accounts should start fully active instead.
  update public.profiles set role = 'admin', status = 'active' where id = v_admin_id;
  update public.profiles set role = 'administrative', can_host = true, status = 'active',
    home_address = '14 Olive St', host_capacity = 10 where id = v_lead1_id;
  update public.profiles set role = 'administrative', can_host = true, status = 'active',
    home_address = '22 Cedar Ave', host_capacity = 8 where id = v_lead2_id;
  update public.profiles set can_host = true, status = 'active', home_address = '5 Palm Rd',
    host_capacity = 6 where id = v_s1;
  update public.profiles set status = 'active' where id in (v_s2, v_s3, v_s4, v_s5, v_s6);

  -- One circle, led by Omar, with everyone above as members
  select id into v_circle_id from public.circles where name = 'Thursday Night Circle';
  if v_circle_id is null then
    insert into public.circles (name, description, leader_id)
    values ('Thursday Night Circle', 'Weekly discussion group meeting Thursday evenings.', v_lead1_id)
    returning id into v_circle_id;
  end if;

  insert into public.circle_members (circle_id, profile_id)
  values
    (v_circle_id, v_lead1_id), (v_circle_id, v_lead2_id),
    (v_circle_id, v_s1), (v_circle_id, v_s2), (v_circle_id, v_s3),
    (v_circle_id, v_s4), (v_circle_id, v_s5), (v_circle_id, v_s6)
  on conflict do nothing;

  -- Three past events, hosted by Omar, each with a full attendance sheet
  select id into v_ev1 from public.events where circle_id = v_circle_id and title = 'Week 1: Foundations';
  if v_ev1 is null then
    insert into public.events (circle_id, title, starts_at, ends_at, host_id, address, status, created_by)
    values (v_circle_id, 'Week 1: Foundations', now() - interval '21 days',
      now() - interval '21 days' + interval '90 minutes', v_lead1_id, '14 Olive St', 'completed', v_lead1_id)
    returning id into v_ev1;
  end if;

  select id into v_ev2 from public.events where circle_id = v_circle_id and title = 'Week 2: Community';
  if v_ev2 is null then
    insert into public.events (circle_id, title, starts_at, ends_at, host_id, address, status, created_by)
    values (v_circle_id, 'Week 2: Community', now() - interval '14 days',
      now() - interval '14 days' + interval '90 minutes', v_lead1_id, '14 Olive St', 'completed', v_lead1_id)
    returning id into v_ev2;
  end if;

  select id into v_ev3 from public.events where circle_id = v_circle_id and title = 'Week 3: Service';
  if v_ev3 is null then
    insert into public.events (circle_id, title, starts_at, ends_at, host_id, address, status, created_by)
    values (v_circle_id, 'Week 3: Service', now() - interval '7 days',
      now() - interval '7 days' + interval '90 minutes', v_lead1_id, '14 Olive St', 'completed', v_lead1_id)
    returning id into v_ev3;
  end if;

  insert into public.attendance (event_id, profile_id, status, marked_by)
  values
    (v_ev1, v_s1, 'present', v_lead1_id), (v_ev1, v_s2, 'present', v_lead1_id),
    (v_ev1, v_s3, 'absent', v_lead1_id), (v_ev1, v_s4, 'present', v_lead1_id),
    (v_ev1, v_s5, 'excused', v_lead1_id), (v_ev1, v_s6, 'present', v_lead1_id),
    (v_ev2, v_s1, 'present', v_lead1_id), (v_ev2, v_s2, 'absent', v_lead1_id),
    (v_ev2, v_s3, 'present', v_lead1_id), (v_ev2, v_s4, 'present', v_lead1_id),
    (v_ev2, v_s5, 'present', v_lead1_id), (v_ev2, v_s6, 'present', v_lead1_id),
    (v_ev3, v_s1, 'present', v_lead1_id), (v_ev3, v_s2, 'present', v_lead1_id),
    (v_ev3, v_s3, 'present', v_lead1_id), (v_ev3, v_s4, 'excused', v_lead1_id),
    (v_ev3, v_s5, 'present', v_lead1_id), (v_ev3, v_s6, 'absent', v_lead1_id)
  on conflict (event_id, profile_id) do nothing;

  -- Two published assignments
  select id into v_a1 from public.assignments where circle_id = v_circle_id and title = 'Reflection: Week 1';
  if v_a1 is null then
    insert into public.assignments (circle_id, title, instructions, due_at, created_by, points, published)
    values (v_circle_id, 'Reflection: Week 1', 'Write a short reflection on tonight''s discussion.',
      now() + interval '3 days', v_lead1_id, 10, true)
    returning id into v_a1;
  end if;

  select id into v_a2 from public.assignments where circle_id = v_circle_id and title = 'Reflection: Week 2';
  if v_a2 is null then
    insert into public.assignments (circle_id, title, instructions, due_at, created_by, points, published)
    values (v_circle_id, 'Reflection: Week 2', 'What does community mean to you? 200 words.',
      now() + interval '10 days', v_lead1_id, 10, true)
    returning id into v_a2;
  end if;

  insert into public.submissions (assignment_id, profile_id, answer_text, status, submitted_at)
  values (v_a1, v_s1, 'My reflection on week one...', 'submitted', now() - interval '1 day')
  on conflict (assignment_id, profile_id) do nothing;
end $$;

drop function if exists public.seed_user(text, text, text);
