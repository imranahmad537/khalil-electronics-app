-- Staff logins managed inside the app, plus a hidden super user (the developer).
--
-- * profiles.username — what staff type to log in. Supabase Auth still needs
--   an email, so the app creates <username>@staff.khalil.local behind the scenes.
-- * profiles.is_super — the developer's account. It has the owner role (so it
--   passes every owner check in RLS), and on top of that:
--     - it is invisible to everyone else (not in any staff list),
--     - nobody else can edit, deactivate, reset or delete it,
--     - only it can create, edit or remove owner accounts.
--   It can only be created with the service-role key (scripts/create-superuser.mjs).

alter table profiles add column if not exists username text;
alter table profiles add column if not exists is_super boolean not null default false;
create unique index if not exists profiles_username_key on profiles (lower(username));
alter table profiles add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$') not valid;

create or replace function is_super_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_super from profiles where id = auth.uid() and active), false)
$$;

-- Hide the super user from everyone but themselves / other super users.
drop policy if exists staff_read  on profiles;
drop policy if exists self_update on profiles;
drop policy if exists admin_write on profiles;

create policy staff_read on profiles for select
  using ((id = auth.uid() or my_role() is not null) and (not is_super or is_super_user() or id = auth.uid()));
create policy self_update on profiles for update
  using (id = auth.uid() and my_role() is not null) with check (id = auth.uid());
create policy admin_write on profiles for all
  using (my_role() in ('owner','manager') and (not is_super or is_super_user()))
  with check (my_role() in ('owner','manager') and (not is_super or is_super_user()));

-- Column guard, extended: the super flag, and anything touching an owner or
-- the super user, is reserved for the super user (or trusted server code).
create or replace function guard_profile_privileges() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_me user_role := my_role(); v_super boolean := is_super_user();
begin
  if is_system() then return new; end if;

  if tg_op = 'INSERT' then
    if new.is_super then
      raise exception 'A super user can only be created by the developer.' using errcode = '42501';
    end if;
    if new.role = 'owner' and not v_super then
      raise exception 'Only the developer account can create an owner.' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.is_super is distinct from old.is_super then
    raise exception 'The super-user flag can''t be changed from the app.' using errcode = '42501';
  end if;
  if old.is_super and not v_super then
    raise exception 'This account can''t be changed.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if new.id = auth.uid() then
      raise exception 'You can''t change your own role.' using errcode = '42501';
    end if;
    if (new.role = 'owner' or old.role = 'owner') and not v_super then
      raise exception 'Only the developer account can grant or remove the owner role.' using errcode = '42501';
    end if;
    if v_me is distinct from 'owner' then
      raise exception 'Only the owner can change roles.' using errcode = '42501';
    end if;
  end if;

  if new.active is distinct from old.active then
    if new.id = auth.uid() then
      raise exception 'You can''t deactivate your own login.' using errcode = '42501';
    end if;
    if old.role = 'owner' and not v_super then
      raise exception 'Only the developer account can deactivate an owner.' using errcode = '42501';
    end if;
    if coalesce(v_me in ('owner','manager'), false) = false then
      raise exception 'Only an owner or manager can activate/deactivate logins.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Who may manage a given login from the app (create/reset/deactivate).
-- Server actions check this before using the service-role key.
create or replace function can_manage_login(p_target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not coalesce(my_role() = 'owner', false) then false                -- owner (incl. super) only
    when p_target = auth.uid() then false                                   -- not yourself
    when is_super_user() then true                                          -- developer: anyone
    else coalesce((select not is_super and role <> 'owner' from profiles where id = p_target), false)
  end
$$;

revoke execute on function is_super_user() from public, anon;
revoke execute on function can_manage_login(uuid) from public, anon;
grant execute on function is_super_user() to authenticated, service_role;
grant execute on function can_manage_login(uuid) to authenticated, service_role;
