-- ============================================================
-- Online Management Site - Security setup
-- Run this once in Supabase -> SQL Editor -> New query -> Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. Admin (CEO) table
--    RLS lets a signed-in user read ONLY their own row, so the
--    browser can ask "am I the CEO?" without the answer being
--    spoofable. Only the service role can insert rows.
-- ------------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'ceo',
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "admins_insert_service" on public.admins;
create policy "admins_insert_service" on public.admins
  for insert to service_role with check (true);

drop policy if exists "admins_update_service" on public.admins;
create policy "admins_update_service" on public.admins
  for update to service_role using (true) with check (true);

drop policy if exists "admins_delete_service" on public.admins;
create policy "admins_delete_service" on public.admins
  for delete to service_role using (true);

-- ------------------------------------------------------------
-- 2. Lock down the sync table (app_data)
--    A user can only read/write their own rows. Nothing else.
-- ------------------------------------------------------------
alter table public.app_data enable row level security;

drop policy if exists "app_data_own_all" on public.app_data;
create policy "app_data_own_all" on public.app_data
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Nobody may create rows as the anonymous role.
drop policy if exists "app_data_anon_all" on public.app_data;

-- ------------------------------------------------------------
-- 3. Public site profile (the owner's photo shown to everyone)
--    Anyone may read it, only an admin may write it.
-- ------------------------------------------------------------
create table if not exists public.site_profile (
  id         text primary key,
  photo      text not null,
  saved_at   bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.site_profile enable row level security;

drop policy if exists "site_profile_read_all" on public.site_profile;
create policy "site_profile_read_all" on public.site_profile
  for select to public using (true);

drop policy if exists "site_profile_write_admin" on public.site_profile;
create policy "site_profile_write_admin" on public.site_profile
  for all to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ------------------------------------------------------------
-- 4. Make your own account the CEO
--    Put YOUR email below (this is the email you used in the
--    app: your mobile number + @bms.app, e.g. 03042954627@bms.app)
-- ------------------------------------------------------------
-- Replace the email below with your own, then run this:
insert into public.admins (user_id, email, role)
select id, email, 'ceo' from auth.users where email = '03042954627@bms.app'
on conflict (user_id) do nothing;

-- Check it worked (should return one row with your email):
-- select user_id, email, role from public.admins;

-- ------------------------------------------------------------
-- 5. Extra hardening
-- ------------------------------------------------------------
-- Block anon sign-ups (run only if you do NOT want random visitors
-- to create accounts). Owners/CEO still sign in with their account.
-- update auth.config set enable_signup = false;
