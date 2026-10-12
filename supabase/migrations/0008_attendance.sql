-- Staff attendance.
--
-- One row per employee per day. Staff with a login check themselves in/out
-- (attendance_check_in/out); owner/manager keep the daily register for
-- everyone (mark_attendance, mark_attendance_bulk) and can correct any day.
-- A past working day with no row counts as absent in reports — absences are
-- never typed in one by one.

create table if not exists attendance_settings (
  id             smallint primary key default 1 check (id = 1),
  shift_start    time     not null default '10:00',
  grace_minutes  smallint not null default 15 check (grace_minutes between 0 and 180),
  half_day_hours numeric(4,2) not null default 4 check (half_day_hours between 0 and 12),
  weekly_off     smallint not null default 0 check (weekly_off between -1 and 6)  -- 0=Sunday … 6=Saturday, -1 = none
);
insert into attendance_settings (id) values (1) on conflict (id) do nothing;

create table if not exists attendance (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references employees on delete cascade,
  day          date not null,
  status       text not null check (status in ('present','late','half_day','leave','absent','holiday')),
  check_in     timestamptz,
  check_out    timestamptz,
  in_lat       double precision,
  in_lng       double precision,
  out_lat      double precision,
  out_lng      double precision,
  note         text,
  source       text not null default 'office' check (source in ('self','office')),
  marked_by    uuid references profiles on delete set null,
  updated_at   timestamptz not null default now(),
  unique (employee_id, day)
);
create index if not exists attendance_day_idx on attendance (day);

alter table attendance_settings enable row level security;
alter table attendance          enable row level security;

-- Everyone on staff reads the settings (the check-in button needs the shift
-- time); owner/manager change them.
create policy staff_read on attendance_settings for select using (my_role() is not null);
create policy admin_write on attendance_settings for update
  using (my_role() in ('owner','manager')) with check (my_role() in ('owner','manager'));

-- Owner/manager/accountant (payroll) see everyone; staff see their own record.
-- No write policies: all writes go through the functions below.
-- security definer: staff can't read the employees table (payroll data), so
-- the lookup of "which employee am I" must not go through its RLS
create or replace function my_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select e.id from employees e join profiles p on p.id = e.profile_id
   where e.profile_id = auth.uid() and e.active and p.active
   limit 1
$$;

create policy office_read on attendance for select using (my_role() in ('owner','manager','accountant'));
create policy own_read on attendance for select using (employee_id = my_employee_id());

-- The staff list for the register/report: names, roles and joining dates
-- only. The accountant (payroll) may view attendance but has no access to the
-- employees table itself (salaries, CNICs).
create or replace function attendance_staff()
returns table (id uuid, full_name text, role user_role, joined_on date, has_login boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.full_name, e.role, e.joined_on, e.profile_id is not null
    from employees e
   where e.active and coalesce(my_role() in ('owner','manager','accountant'), false)
   order by e.full_name
$$;

-- ---------- self service ----------

create or replace function attendance_check_in(p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := my_employee_id();
  v_s attendance_settings;
  v_now_local timestamp := now() at time zone 'Asia/Karachi';
  v_status text;
  v_row attendance;
begin
  if v_emp is null then
    raise exception 'Your login isn''t linked to an employee record — ask the owner to link it in Users & logins.';
  end if;
  select * into v_s from attendance_settings where id = 1;

  select * into v_row from attendance where employee_id = v_emp and day = shop_today() for update;
  if found and v_row.check_in is not null then
    raise exception 'You already checked in today at %.', to_char(v_row.check_in at time zone 'Asia/Karachi', 'HH12:MI AM');
  end if;

  v_status := case when v_now_local::time > v_s.shift_start + make_interval(mins => v_s.grace_minutes)
                   then 'late' else 'present' end;

  insert into attendance (employee_id, day, status, check_in, in_lat, in_lng, source, marked_by, updated_at)
  values (v_emp, shop_today(), v_status, now(), p_lat, p_lng, 'self', auth.uid(), now())
  on conflict (employee_id, day) do update
    set status = excluded.status, check_in = excluded.check_in, in_lat = excluded.in_lat, in_lng = excluded.in_lng,
        source = 'self', marked_by = excluded.marked_by, updated_at = now();

  return jsonb_build_object('status', v_status, 'check_in', now());
end $$;

create or replace function attendance_check_out(p_lat double precision default null, p_lng double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_emp uuid := my_employee_id();
  v_s attendance_settings;
  v_row attendance;
  v_hours numeric;
  v_status text;
begin
  if v_emp is null then
    raise exception 'Your login isn''t linked to an employee record — ask the owner to link it in Users & logins.';
  end if;
  select * into v_s from attendance_settings where id = 1;
  select * into v_row from attendance where employee_id = v_emp and day = shop_today() for update;
  if not found or v_row.check_in is null then raise exception 'Check in first.'; end if;
  if v_row.check_out is not null then
    raise exception 'You already checked out today at %.', to_char(v_row.check_out at time zone 'Asia/Karachi', 'HH12:MI AM');
  end if;

  v_hours := extract(epoch from now() - v_row.check_in) / 3600;
  -- leaving well before a full day turns the day into a half day
  v_status := case when v_row.status in ('present','late') and v_hours < v_s.half_day_hours then 'half_day' else v_row.status end;

  update attendance
     set check_out = now(), out_lat = p_lat, out_lng = p_lng, status = v_status, updated_at = now()
   where id = v_row.id;

  return jsonb_build_object('status', v_status, 'check_out', now(), 'hours', round(v_hours, 1));
end $$;

-- ---------- office register ----------

create or replace function mark_attendance(p_employee uuid, p_day date, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can mark attendance.' using errcode = '42501';
  end if;
  if p_day > shop_today() and coalesce(p_status, '') not in ('leave','holiday') then
    raise exception 'Only leave or a holiday can be marked for a future day.';
  end if;
  if not exists (select 1 from employees where id = p_employee) then raise exception 'Employee not found.'; end if;

  if p_status is null then   -- clear the day (falls back to "absent" if it's a past working day)
    delete from attendance where employee_id = p_employee and day = p_day;
    return;
  end if;
  if p_status not in ('present','late','half_day','leave','absent','holiday') then
    raise exception 'Unknown attendance status.';
  end if;

  insert into attendance (employee_id, day, status, note, source, marked_by, updated_at)
  values (p_employee, p_day, p_status, nullif(trim(p_note), ''), 'office', auth.uid(), now())
  on conflict (employee_id, day) do update
    set status = excluded.status, note = coalesce(excluded.note, attendance.note),
        source = 'office', marked_by = excluded.marked_by, updated_at = now();
end $$;

-- Mark every active employee for a day. p_only_unmarked keeps anything
-- already recorded (e.g. "mark the rest present"); otherwise overwrites
-- (e.g. a public holiday for everyone).
create or replace function mark_attendance_bulk(p_day date, p_status text, p_only_unmarked boolean default true)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if coalesce(my_role() in ('owner','manager'), false) = false then
    raise exception 'Only the owner or manager can mark attendance.' using errcode = '42501';
  end if;
  if p_status not in ('present','leave','absent','holiday') then raise exception 'Unknown attendance status.'; end if;
  if p_day > shop_today() and p_status not in ('leave','holiday') then
    raise exception 'Only leave or a holiday can be marked for a future day.';
  end if;

  with targets as (
    select e.id from employees e
     where e.active and (e.joined_on is null or e.joined_on <= p_day)
       and (not p_only_unmarked or not exists (select 1 from attendance a where a.employee_id = e.id and a.day = p_day))
  ), written as (
    insert into attendance (employee_id, day, status, source, marked_by, updated_at)
    select id, p_day, p_status, 'office', auth.uid(), now() from targets
    on conflict (employee_id, day) do update
      set status = excluded.status, source = 'office', marked_by = excluded.marked_by, updated_at = now()
    returning 1
  )
  select count(*) into v_count from written;
  return v_count;
end $$;

revoke execute on function my_employee_id() from public, anon;
revoke execute on function attendance_check_in(double precision, double precision) from public, anon;
revoke execute on function attendance_check_out(double precision, double precision) from public, anon;
revoke execute on function mark_attendance(uuid, date, text, text) from public, anon;
revoke execute on function mark_attendance_bulk(date, text, boolean) from public, anon;
grant execute on function my_employee_id() to authenticated, service_role;
grant execute on function attendance_check_in(double precision, double precision) to authenticated, service_role;
grant execute on function attendance_check_out(double precision, double precision) to authenticated, service_role;
grant execute on function mark_attendance(uuid, date, text, text) to authenticated, service_role;
grant execute on function mark_attendance_bulk(date, text, boolean) to authenticated, service_role;
revoke execute on function attendance_staff() from public, anon;
grant execute on function attendance_staff() to authenticated, service_role;
