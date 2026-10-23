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

create or replace function public.is_oms_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid() and role = 'ceo'
  );
$$;

revoke all on function public.is_oms_admin() from public;
grant execute on function public.is_oms_admin() to authenticated;

-- ------------------------------------------------------------
-- 2. Account profiles and public reviews
--    Credentials live only in Supabase Auth, never in browser tables.
-- ------------------------------------------------------------
create table if not exists public.customer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null check (char_length(trim(full_name)) between 2 and 60),
  mobile     text not null unique check (mobile ~ '^03[0-9]{9}$'),
  email      text not null unique check (char_length(email) <= 254),
  city       text not null check (char_length(trim(city)) between 2 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null check (char_length(trim(full_name)) between 3 and 60),
  mobile     text not null unique check (mobile ~ '^03[0-9]{9}$'),
  age        integer not null check (age between 18 and 100),
  city       text not null check (char_length(trim(city)) between 2 and 40),
  categories text[] not null check (
    cardinality(categories) between 1 and 8
    and categories <@ array[
      'clinic', 'academy', 'restaurant', 'generalstore',
      'beautysalon', 'petrolpump', 'medicalstore', 'laboratory'
    ]::text[]
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
alter table public.owner_profiles enable row level security;

revoke all on table public.customer_profiles, public.owner_profiles from anon, authenticated, public;
grant select, insert on table public.customer_profiles to authenticated;
grant update (full_name, email, city, updated_at) on table public.customer_profiles to authenticated;
grant select, insert on table public.owner_profiles to authenticated;
grant update (full_name, age, city, updated_at) on table public.owner_profiles to authenticated;

drop policy if exists "customer_profiles_read_own_or_admin" on public.customer_profiles;
create policy "customer_profiles_read_own_or_admin" on public.customer_profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_oms_admin());

drop policy if exists "customer_profiles_insert_own" on public.customer_profiles;
create policy "customer_profiles_insert_own" on public.customer_profiles
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'email') = (mobile || '@bms.app')
  );

drop policy if exists "customer_profiles_update_own" on public.customer_profiles;
create policy "customer_profiles_update_own" on public.customer_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner_profiles_read_own_or_admin" on public.owner_profiles;
create policy "owner_profiles_read_own_or_admin" on public.owner_profiles
  for select to authenticated
  using (auth.uid() = user_id or public.is_oms_admin());

drop policy if exists "owner_profiles_insert_own" on public.owner_profiles;
create policy "owner_profiles_insert_own" on public.owner_profiles
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() ->> 'email') = (mobile || '@bms.app')
    and cardinality(categories) = 1
  );

drop policy if exists "owner_profiles_update_own" on public.owner_profiles;
create policy "owner_profiles_update_own" on public.owner_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner_profiles_admin_update" on public.owner_profiles;
create policy "owner_profiles_admin_update" on public.owner_profiles
  for update to authenticated
  using (public.is_oms_admin())
  with check (public.is_oms_admin());

grant delete on table public.owner_profiles to authenticated;
drop policy if exists "owner_profiles_admin_delete" on public.owner_profiles;
create policy "owner_profiles_admin_delete" on public.owner_profiles
  for delete to authenticated
  using (public.is_oms_admin());

create or replace function public.admin_set_owner_categories(p_user_id uuid, p_categories text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can change owner category access';
  end if;

  if p_categories is null
    or cardinality(p_categories) < 1
    or cardinality(p_categories) > 8
    or not (p_categories <@ array[
      'clinic', 'academy', 'restaurant', 'generalstore',
      'beautysalon', 'petrolpump', 'medicalstore', 'laboratory'
    ]::text[])
  then
    raise exception 'Invalid owner category access list';
  end if;

  update public.owner_profiles
  set categories = p_categories, updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'Owner profile not found';
  end if;
end;
$$;

revoke all on function public.admin_set_owner_categories(uuid, text[]) from public;
grant execute on function public.admin_set_owner_categories(uuid, text[]) to authenticated;

create table if not exists public.site_reviews (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(trim(author_name)) between 2 and 60),
  rating      integer not null check (rating between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 500),
  legacy_id   text unique,
  created_at  timestamptz not null default now()
);

create index if not exists site_reviews_created_idx on public.site_reviews (created_at desc);
alter table public.site_reviews enable row level security;

revoke all on table public.site_reviews from anon, authenticated, public;
grant select on table public.site_reviews to anon, authenticated;
grant insert, delete on table public.site_reviews to authenticated;

drop policy if exists "site_reviews_read_public" on public.site_reviews;
create policy "site_reviews_read_public" on public.site_reviews
  for select to anon, authenticated using (true);

drop policy if exists "site_reviews_insert_own_or_legacy_admin" on public.site_reviews;
create policy "site_reviews_insert_own_or_legacy_admin" on public.site_reviews
  for insert to authenticated
  with check (
    (author_id = auth.uid() and legacy_id is null
      and exists (
        select 1 from public.customer_profiles p
        where p.user_id = auth.uid() and p.full_name = author_name
      ))
    or (author_id is null and legacy_id is not null and public.is_oms_admin())
  );

drop policy if exists "site_reviews_delete_own_or_admin" on public.site_reviews;
create policy "site_reviews_delete_own_or_admin" on public.site_reviews
  for delete to authenticated
  using (author_id = auth.uid() or public.is_oms_admin());

-- ------------------------------------------------------------
-- 3. Category subscriptions and manual JazzCash payment requests
-- ------------------------------------------------------------
create table if not exists public.category_subscriptions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null check (category in (
    'clinic', 'academy', 'restaurant', 'generalstore',
    'beautysalon', 'petrolpump', 'medicalstore', 'laboratory'
  )),
  plan        text not null check (plan in ('1-month', '3-month', '6-month')),
  status      text not null default 'active' check (status in ('active', 'revoked')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, category)
);

create table if not exists public.subscription_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  category          text not null check (category in (
    'clinic', 'academy', 'restaurant', 'generalstore',
    'beautysalon', 'petrolpump', 'medicalstore', 'laboratory'
  )),
  plan              text not null check (plan in ('1-month', '3-month', '6-month')),
  amount            integer not null check (
    (plan = '1-month' and amount = 3000) or
    (plan = '3-month' and amount = 9000) or
    (plan = '6-month' and amount = 12000)
  ),
  account_name      text not null,
  account_mobile    text not null,
  payment_reference text not null unique,
  payer_mobile      text not null,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note        text,
  created_at        timestamptz not null default now(),
  reviewed_at       timestamptz
);

create index if not exists subscription_requests_recent_idx
  on public.subscription_requests (created_at desc);

alter table public.category_subscriptions enable row level security;
alter table public.subscription_requests enable row level security;

revoke all on table public.category_subscriptions, public.subscription_requests from anon, authenticated, public;
grant select on table public.category_subscriptions to authenticated;
grant select, insert on table public.subscription_requests to authenticated;

drop policy if exists "category_subscriptions_read_own_or_admin" on public.category_subscriptions;
create policy "category_subscriptions_read_own_or_admin" on public.category_subscriptions
  for select to authenticated
  using (auth.uid() = user_id or public.is_oms_admin());

drop policy if exists "category_subscriptions_admin_write" on public.category_subscriptions;

drop policy if exists "subscription_requests_read_own_or_admin" on public.subscription_requests;
create policy "subscription_requests_read_own_or_admin" on public.subscription_requests
  for select to authenticated
  using (auth.uid() = user_id or public.is_oms_admin());

drop policy if exists "subscription_requests_insert_own" on public.subscription_requests;
create policy "subscription_requests_insert_own" on public.subscription_requests
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "subscription_requests_admin_update" on public.subscription_requests;

create or replace function public.admin_approve_subscription_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.subscription_requests%rowtype;
  v_months integer;
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can approve payment requests';
  end if;

  select * into v_request
  from public.subscription_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending payment request not found';
  end if;

  v_months := case v_request.plan
    when '1-month' then 1
    when '3-month' then 3
    when '6-month' then 6
  end;

  insert into public.category_subscriptions
    (user_id, category, plan, status, started_at, expires_at, updated_at)
  values
    (v_request.user_id, v_request.category, v_request.plan, 'active', now(),
     now() + make_interval(months => v_months), now())
  on conflict (user_id, category) do update
    set plan = excluded.plan,
        status = 'active',
        started_at = case
          when category_subscriptions.expires_at > now() then category_subscriptions.started_at
          else now()
        end,
        expires_at = greatest(category_subscriptions.expires_at, now())
          + make_interval(months => v_months),
        updated_at = now();

  update public.subscription_requests
  set status = 'approved', reviewed_at = now()
  where id = v_request.id;
end;
$$;

create or replace function public.admin_reject_subscription_request(p_request_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can reject payment requests';
  end if;

  update public.subscription_requests
  set status = 'rejected',
      admin_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
      reviewed_at = now()
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'Pending payment request not found';
  end if;
end;
$$;

revoke all on function public.admin_approve_subscription_request(uuid) from public;
revoke all on function public.admin_reject_subscription_request(uuid, text) from public;
grant execute on function public.admin_approve_subscription_request(uuid) to authenticated;
grant execute on function public.admin_reject_subscription_request(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 4. Lock down the sync table (app_data)
--    Category data requires an active subscription for that category.
-- ------------------------------------------------------------
alter table public.app_data enable row level security;

drop policy if exists "app_data_own_all" on public.app_data;
create policy "app_data_own_all" on public.app_data
  for all to authenticated
  using (
    auth.uid() = user_id
    and (
      public.is_oms_admin()
      or key not in (
        'clinic:data', 'academy:data', 'restaurant:data', 'generalstore:data',
        'beautysalon:data', 'petrolpump:data', 'medicalstore:data', 'laboratory:data'
      )
      or exists (
        select 1 from public.category_subscriptions s
        where s.user_id = auth.uid()
          and s.category = split_part(key, ':', 1)
          and s.status = 'active'
          and s.expires_at > now()
      )
    )
  )
  with check (
    auth.uid() = user_id
    and (
      public.is_oms_admin()
      or key not in (
        'clinic:data', 'academy:data', 'restaurant:data', 'generalstore:data',
        'beautysalon:data', 'petrolpump:data', 'medicalstore:data', 'laboratory:data'
      )
      or exists (
        select 1 from public.category_subscriptions s
        where s.user_id = auth.uid()
          and s.category = split_part(key, ':', 1)
          and s.status = 'active'
          and s.expires_at > now()
      )
    )
  );

-- Remove legacy browser-side password hashes without deleting profile data.
update public.app_data as a
set value = case
  when a.key in ('ownerAccount', 'ceoAccount') and jsonb_typeof(a.value) = 'object'
    then a.value - 'passHash' - 'codeHash'
  when a.key in ('owners', 'siteUsers') and jsonb_typeof(a.value) = 'array'
    then (
      select coalesce(jsonb_agg(entry - 'passHash' - 'codeHash'), '[]'::jsonb)
      from jsonb_array_elements(a.value) as items(entry)
    )
  else a.value
end,
updated_at = now()
where a.key in ('ownerAccount', 'ceoAccount', 'owners', 'siteUsers')
  and a.value is not null;

-- Nobody may create rows as the anonymous role.
drop policy if exists "app_data_anon_all" on public.app_data;

-- ------------------------------------------------------------
-- 5. Public site profile (the owner's photo shown to everyone)
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
-- 6. Make your own account the CEO
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
-- 7. Extra hardening
-- ------------------------------------------------------------
-- Block anon sign-ups (run only if you do NOT want random visitors
-- to create accounts). Owners/CEO still sign in with their account.
-- update auth.config set enable_signup = false;
