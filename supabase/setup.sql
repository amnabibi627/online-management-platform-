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
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  mobile     text,
  role       text not null default 'ceo',
  created_at timestamptz not null default now()
);

alter table public.admins add column if not exists full_name text;
alter table public.admins add column if not exists mobile text;

create unique index if not exists admins_single_ceo
  on public.admins (role) where role = 'ceo';

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
grant execute on function public.is_oms_admin() to anon, authenticated;

create table if not exists public.oms_account_access (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  blocked     boolean not null default false,
  reason      text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

alter table public.oms_account_access enable row level security;
revoke all on table public.oms_account_access from public, anon, authenticated;

create or replace function public.oms_current_account_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    public.is_oms_admin()
    or not exists (
      select 1 from public.oms_account_access
      where user_id = auth.uid() and blocked
    )
  );
$$;

create or replace function public.oms_current_account_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then jsonb_build_object('active', false, 'reason', 'Sign in is required.')
    when public.is_oms_admin() then jsonb_build_object('active', true, 'reason', null)
    else coalesce((
      select jsonb_build_object('active', not access.blocked, 'reason', access.reason)
      from public.oms_account_access access
      where access.user_id = auth.uid()
    ), jsonb_build_object('active', true, 'reason', null))
  end;
$$;

revoke all on function public.oms_current_account_is_active() from public, anon;
revoke all on function public.oms_current_account_status() from public, anon;
grant execute on function public.oms_current_account_is_active() to authenticated;
grant execute on function public.oms_current_account_status() to authenticated;

create table if not exists public.oms_ceo_bootstrap_state (
  singleton       boolean primary key default true check (singleton),
  expected_email  text,
  expected_name   text,
  expected_mobile text,
  secret_hash     text,
  consumed_at     timestamptz
);

alter table public.oms_ceo_bootstrap_state add column if not exists expected_email text;
alter table public.oms_ceo_bootstrap_state add column if not exists expected_name text;
alter table public.oms_ceo_bootstrap_state add column if not exists expected_mobile text;
alter table public.oms_ceo_bootstrap_state add column if not exists secret_hash text;

insert into public.oms_ceo_bootstrap_state (singleton, consumed_at)
values (true, null)
on conflict (singleton) do nothing;

alter table public.oms_ceo_bootstrap_state enable row level security;
revoke all on table public.oms_ceo_bootstrap_state from public, anon, authenticated;
grant all on table public.oms_ceo_bootstrap_state to service_role;

create or replace function public.configure_oms_ceo_bootstrap(
  p_email text,
  p_name text,
  p_mobile text,
  p_secret text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  setup_state public.oms_ceo_bootstrap_state%rowtype;
begin
  select * into setup_state
  from public.oms_ceo_bootstrap_state
  where singleton
  for update;

  if not found then
    raise exception 'CEO setup state is missing';
  end if;
  if setup_state.consumed_at is not null
    or exists (select 1 from public.admins where role = 'ceo')
  then
    raise exception 'The one-time CEO setup has already been used';
  end if;
  if p_email is null or length(trim(p_email)) > 254
    or position('@' in p_email) < 2
    or p_name is null or char_length(trim(p_name)) not between 3 and 80
    or p_mobile is null or p_mobile !~ '^03[0-9]{9}$'
    or p_secret is null or char_length(p_secret) not between 32 and 256
  then
    raise exception 'Provide valid CEO details and a setup secret between 32 and 256 characters';
  end if;

  update public.oms_ceo_bootstrap_state
  set expected_email = lower(trim(p_email)),
      expected_name = trim(p_name),
      expected_mobile = p_mobile,
      secret_hash = extensions.crypt(p_secret, extensions.gen_salt('bf'))
  where singleton;
end;
$$;

revoke all on function public.configure_oms_ceo_bootstrap(text, text, text, text) from public, anon, authenticated;
grant execute on function public.configure_oms_ceo_bootstrap(text, text, text, text) to service_role;

create or replace function public.oms_ceo_setup_available()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.oms_ceo_bootstrap_state s
    where s.singleton and s.consumed_at is null
      and s.expected_email is not null and s.expected_name is not null
      and s.expected_mobile is not null and s.secret_hash is not null
      and not exists (select 1 from public.admins a where a.role = 'ceo')
  );
$$;

revoke all on function public.oms_ceo_setup_available() from public;
grant execute on function public.oms_ceo_setup_available() to anon, authenticated, service_role;

drop function if exists public.complete_oms_ceo_bootstrap(uuid, text, text, text);

create or replace function public.claim_oms_ceo(p_name text, p_mobile text, p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  setup_state public.oms_ceo_bootstrap_state%rowtype;
  auth_email text;
begin
  if auth.uid() is null then
    raise exception 'Sign in before claiming the CEO account';
  end if;

  select * into setup_state
  from public.oms_ceo_bootstrap_state
  where singleton
  for update;

  if not found or setup_state.consumed_at is not null
    or setup_state.expected_email is null or setup_state.secret_hash is null
    or exists (select 1 from public.admins where role = 'ceo')
  then
    raise exception 'One-time CEO setup has already been used';
  end if;

  select lower(u.email) into auth_email
  from auth.users u
  where u.id = auth.uid();

  if auth_email is distinct from setup_state.expected_email
    or trim(coalesce(p_name, '')) is distinct from setup_state.expected_name
    or p_mobile is distinct from setup_state.expected_mobile
    or p_secret is null or char_length(p_secret) not between 32 and 256
    or extensions.crypt(p_secret, setup_state.secret_hash) is distinct from setup_state.secret_hash
  then
    raise exception 'The supplied CEO details could not be verified';
  end if;

  insert into public.admins (user_id, email, full_name, mobile, role)
  values (auth.uid(), auth_email, setup_state.expected_name, setup_state.expected_mobile, 'ceo');

  update public.oms_ceo_bootstrap_state
  set consumed_at = now(), secret_hash = null
  where singleton;
end;
$$;

revoke all on function public.claim_oms_ceo(text, text, text) from public, anon;
grant execute on function public.claim_oms_ceo(text, text, text) to authenticated;

create or replace function public.update_oms_ceo_profile(p_name text, p_mobile text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_oms_admin() then
    raise exception 'Only the signed-in CEO can update this profile';
  end if;
  if p_name is null or char_length(trim(p_name)) not between 3 and 80
    or p_mobile is null or p_mobile !~ '^03[0-9]{9}$'
  then
    raise exception 'Enter a valid name and Pakistani mobile number';
  end if;

  update public.admins
  set full_name = trim(p_name), mobile = p_mobile
  where user_id = auth.uid() and role = 'ceo';
end;
$$;

revoke all on function public.update_oms_ceo_profile(text, text) from public;
grant execute on function public.update_oms_ceo_profile(text, text) to authenticated;

create or replace function public.sync_oms_ceo_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.admins set email = new.email
    where user_id = new.id and role = 'ceo';
  end if;
  return new;
end;
$$;

revoke all on function public.sync_oms_ceo_email() from public, anon, authenticated;

drop trigger if exists sync_oms_ceo_email on auth.users;
create trigger sync_oms_ceo_email
  after update of email on auth.users
  for each row execute function public.sync_oms_ceo_email();

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

drop policy if exists "owner_profiles_active_account_guard" on public.owner_profiles;
create policy "owner_profiles_active_account_guard" on public.owner_profiles
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

drop policy if exists "customer_profiles_active_account_guard" on public.customer_profiles;
create policy "customer_profiles_active_account_guard" on public.customer_profiles
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

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

-- The site owner (CEO) can reply to any public review. Replies are readable by everyone.
alter table public.site_reviews add column if not exists owner_reply text;
alter table public.site_reviews add column if not exists owner_reply_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.site_reviews'::regclass
      and conname = 'site_reviews_owner_reply_len'
  ) then
    alter table public.site_reviews
      add constraint site_reviews_owner_reply_len
      check (owner_reply is null or char_length(owner_reply) <= 500);
  end if;
end $$;

create index if not exists site_reviews_created_idx on public.site_reviews (created_at desc);
alter table public.site_reviews enable row level security;

revoke all on table public.site_reviews from anon, authenticated, public;
grant select on table public.site_reviews to anon, authenticated;
grant insert, delete on table public.site_reviews to authenticated;
grant update (owner_reply, owner_reply_at) on table public.site_reviews to authenticated;

drop policy if exists "site_reviews_read_public" on public.site_reviews;
create policy "site_reviews_read_public" on public.site_reviews
  for select to anon, authenticated using (true);

-- Reviewers choose the public display name they type in the form (it is not
-- forced to match the account profile name).
drop policy if exists "site_reviews_insert_own_or_legacy_admin" on public.site_reviews;
create policy "site_reviews_insert_own_or_legacy_admin" on public.site_reviews
  for insert to authenticated
  with check (
    (author_id = auth.uid() and legacy_id is null)
    or (author_id is null and legacy_id is not null and public.is_oms_admin())
  );

drop policy if exists "site_reviews_delete_own_or_admin" on public.site_reviews;
create policy "site_reviews_delete_own_or_admin" on public.site_reviews
  for delete to authenticated
  using (author_id = auth.uid() or public.is_oms_admin());

-- Only the CEO can add, edit or remove an owner reply.
drop policy if exists "site_reviews_owner_reply_admin" on public.site_reviews;
create policy "site_reviews_owner_reply_admin" on public.site_reviews
  for update to authenticated
  using (public.is_oms_admin())
  with check (public.is_oms_admin());

drop policy if exists "site_reviews_active_account_guard" on public.site_reviews;
create policy "site_reviews_active_account_guard" on public.site_reviews
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

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
  with check (auth.uid() = user_id and status = 'pending' and public.oms_current_account_is_active());

drop policy if exists "subscription_requests_admin_update" on public.subscription_requests;

drop policy if exists "category_subscriptions_active_account_guard" on public.category_subscriptions;
create policy "category_subscriptions_active_account_guard" on public.category_subscriptions
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

drop policy if exists "subscription_requests_active_account_guard" on public.subscription_requests;
create policy "subscription_requests_active_account_guard" on public.subscription_requests
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

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

drop function if exists public.admin_list_accounts();
create function public.admin_list_accounts()
returns table (
  user_id uuid,
  email text,
  contact_email text,
  full_name text,
  mobile text,
  city text,
  age integer,
  account_types text[],
  created_at timestamptz,
  blocked boolean,
  block_reason text,
  owner_categories text[],
  active_categories text[],
  pending_categories text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site CEO can view account details';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(cp.email, u.email)::text,
    coalesce(cp.full_name, op.full_name, latest.account_name, u.raw_user_meta_data ->> 'name', 'Account holder')::text,
    coalesce(cp.mobile, op.mobile, latest.account_mobile, u.raw_user_meta_data ->> 'mobile', '')::text,
    coalesce(cp.city, op.city, '')::text,
    op.age,
    case
      when cardinality(type_info.types) = 0 then array['Other']::text[]
      else type_info.types
    end,
    u.created_at,
    coalesce(account_state.blocked, false),
    account_state.reason,
    coalesce(op.categories, array[]::text[]),
    coalesce(active_subscriptions.categories, array[]::text[]),
    coalesce(pending_requests.categories, array[]::text[])
  from auth.users u
  left join public.customer_profiles cp on cp.user_id = u.id
  left join public.owner_profiles op on op.user_id = u.id
  left join public.oms_account_access account_state on account_state.user_id = u.id
  left join lateral (
    select r.account_name, r.account_mobile
    from public.subscription_requests r
    where r.user_id = u.id
    order by r.created_at desc
    limit 1
  ) latest on true
  left join lateral (
    select array_remove(array[
      case when op.user_id is not null then 'Owner'::text end,
      case when cp.user_id is not null then 'Site customer'::text end,
      case when exists (
        select 1 from public.subscription_requests r where r.user_id = u.id
      ) then 'Category subscription'::text end
    ], null::text) as types
  ) type_info on true
  left join lateral (
    select array_agg(s.category order by s.category) as categories
    from public.category_subscriptions s
    where s.user_id = u.id and s.status = 'active' and s.expires_at > now()
  ) active_subscriptions on true
  left join lateral (
    select array_agg(distinct r.category order by r.category) as categories
    from public.subscription_requests r
    where r.user_id = u.id and r.status = 'pending'
  ) pending_requests on true
  where not exists (select 1 from public.admins a where a.user_id = u.id)
  order by u.created_at desc;
end;
$$;

create or replace function public.admin_set_account_blocked(
  p_user_id uuid,
  p_blocked boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site CEO can manage account access';
  end if;
  if p_blocked is null or p_user_id is null or p_user_id = auth.uid()
    or exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'The CEO account cannot be changed from this control';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Account not found';
  end if;

  insert into public.oms_account_access (user_id, blocked, reason, updated_at, updated_by)
  values (
    p_user_id,
    coalesce(p_blocked, false),
    case when p_blocked then nullif(left(trim(coalesce(p_reason, '')), 500), '') else null end,
    now(),
    auth.uid()
  )
  on conflict (user_id) do update
    set blocked = excluded.blocked,
        reason = excluded.reason,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

create or replace function public.admin_delete_account(p_user_id uuid, p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site CEO can permanently delete accounts';
  end if;
  if p_user_id is null or p_user_id = auth.uid()
    or exists (select 1 from public.admins where user_id = p_user_id) then
    raise exception 'The CEO account cannot be deleted from this control';
  end if;

  select email into v_email from auth.users where id = p_user_id for update;
  if not found then
    raise exception 'Account not found';
  end if;
  if lower(trim(coalesce(p_confirmation, ''))) <> lower(v_email) then
    raise exception 'Confirmation must exactly match the account email';
  end if;

  delete from public.app_data where user_id = p_user_id;
  delete from public.site_reviews where author_id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_list_accounts() from public, anon;
revoke all on function public.admin_set_account_blocked(uuid, boolean, text) from public, anon;
revoke all on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_list_accounts() to authenticated;
grant execute on function public.admin_set_account_blocked(uuid, boolean, text) to authenticated;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

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

drop policy if exists "app_data_active_account_guard" on public.app_data;
create policy "app_data_active_account_guard" on public.app_data
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

create or replace function public.admin_category_data_summary()
returns table (
  category text,
  active_subscribers bigint,
  data_accounts bigint,
  feature_count bigint,
  entry_count bigint,
  last_updated timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site CEO can view business data summaries';
  end if;

  return query
  with categories(category) as (
    values
      ('clinic'), ('academy'), ('restaurant'), ('generalstore'),
      ('beautysalon'), ('petrolpump'), ('medicalstore'), ('laboratory')
  ),
  data_rows as (
    select
      split_part(a.key, ':', 1) as category,
      a.user_id,
      a.updated_at,
      case when jsonb_typeof(a.value -> 'features') = 'object'
        then a.value -> 'features' else '{}'::jsonb end as features
    from public.app_data a
    where a.key in (
      'clinic:data', 'academy:data', 'restaurant:data', 'generalstore:data',
      'beautysalon:data', 'petrolpump:data', 'medicalstore:data', 'laboratory:data'
    )
  ),
  data_metrics as (
    select
      d.category,
      count(distinct d.user_id) as data_accounts,
      coalesce(sum(metrics.feature_count), 0)::bigint as feature_count,
      coalesce(sum(metrics.entry_count), 0)::bigint as entry_count,
      max(d.updated_at) as last_updated
    from data_rows d
    cross join lateral (
      select
        count(*) filter (
            where case
              when jsonb_typeof(feature.value) = 'array' then jsonb_array_length(feature.value) > 0
              else false
            end
          ) as feature_count,
        coalesce(sum(case
          when jsonb_typeof(feature.value) = 'array' then jsonb_array_length(feature.value)
          else 0
        end), 0) as entry_count
      from jsonb_each(d.features) feature
    ) metrics
    group by d.category
  ),
  subscription_metrics as (
    select s.category, count(distinct s.user_id) as active_subscribers
    from public.category_subscriptions s
    where s.status = 'active' and s.expires_at > now()
    group by s.category
  )
  select
    c.category,
    coalesce(s.active_subscribers, 0),
    coalesce(d.data_accounts, 0),
    coalesce(d.feature_count, 0),
    coalesce(d.entry_count, 0),
    d.last_updated
  from categories c
  left join subscription_metrics s on s.category = c.category
  left join data_metrics d on d.category = c.category
  order by c.category;
end;
$$;

create or replace function public.admin_get_category_data(p_user_id uuid, p_category text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site CEO can inspect business records';
  end if;
  if p_user_id is null or p_category is null or p_category not in (
    'clinic', 'academy', 'restaurant', 'generalstore',
    'beautysalon', 'petrolpump', 'medicalstore', 'laboratory'
  ) then
    raise exception 'Choose a valid account and category';
  end if;

  select jsonb_build_object('value', a.value, 'updated_at', a.updated_at)
  into v_result
  from public.app_data a
  where a.user_id = p_user_id and a.key = p_category || ':data';

  return coalesce(v_result, jsonb_build_object(
    'value', jsonb_build_object('features', '{}'::jsonb),
    'updated_at', null
  ));
end;
$$;

revoke all on function public.admin_category_data_summary() from public, anon;
revoke all on function public.admin_get_category_data(uuid, text) from public, anon;
grant execute on function public.admin_category_data_summary() to authenticated;
grant execute on function public.admin_get_category_data(uuid, text) to authenticated;

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
-- 6. Public business ad listings and private registration requests
-- ------------------------------------------------------------
create or replace function public.business_ad_media_manifest_valid(
  p_media_files jsonb,
  p_photo_count integer,
  p_video_count integer
)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_item jsonb;
  v_path text;
  v_kind text;
  v_photos integer := 0;
  v_videos integer := 0;
  v_seen text[] := array[]::text[];
begin
  if p_media_files is null
    or pg_catalog.jsonb_typeof(p_media_files) <> 'array'
    or pg_catalog.jsonb_array_length(p_media_files) > 35 then
    return false;
  end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_media_files) loop
    v_path := v_item ->> 'path';
    v_kind := v_item ->> 'kind';
    if v_path is null or v_kind is null or v_kind not in ('photo', 'video')
      or v_path = any(v_seen)
      or v_path !~ '^[0-9a-f-]{36}/(photos|videos)/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$'
      or (v_kind = 'photo' and pg_catalog.split_part(v_path, '/', 2) <> 'photos')
      or (v_kind = 'video' and pg_catalog.split_part(v_path, '/', 2) <> 'videos') then
      return false;
    end if;

    v_seen := pg_catalog.array_append(v_seen, v_path);
    if v_kind = 'photo' then
      v_photos := v_photos + 1;
    else
      v_videos := v_videos + 1;
    end if;
  end loop;

  return p_photo_count between 0 and 30
    and p_video_count between 0 and 5
    and v_photos = p_photo_count
    and v_videos = p_video_count;
end;
$$;

revoke all on function public.business_ad_media_manifest_valid(jsonb, integer, integer) from public;
grant execute on function public.business_ad_media_manifest_valid(jsonb, integer, integer) to anon, authenticated;

create or replace function public.business_ad_media_paths_match_request(p_request_id uuid, p_media_files jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_item jsonb;
  v_path text;
begin
  if p_request_id is null or p_media_files is null
    or pg_catalog.jsonb_typeof(p_media_files) <> 'array' then
    return false;
  end if;
  for v_item in select value from pg_catalog.jsonb_array_elements(p_media_files) loop
    v_path := v_item ->> 'path';
    if v_path is null or pg_catalog.split_part(v_path, '/', 1) <> p_request_id::text then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.business_ad_media_paths_match_request(uuid, jsonb) from public;
grant execute on function public.business_ad_media_paths_match_request(uuid, jsonb) to anon, authenticated;

create table if not exists public.business_ad_requests (
  id                  uuid primary key default gen_random_uuid(),
  legacy_id           text unique,
  business_name       text not null check (char_length(trim(business_name)) between 3 and 100),
  owner_name          text not null check (char_length(trim(owner_name)) between 3 and 80),
  mobile              text not null check (mobile ~ '^03[0-9]{9}$'),
  whatsapp            text not null check (whatsapp ~ '^03[0-9]{9}$'),
  category            text not null check (char_length(trim(category)) between 2 and 60),
  city                text not null check (char_length(trim(city)) between 2 and 40),
  address             text not null check (char_length(trim(address)) between 5 and 160),
  about               text not null check (char_length(trim(about)) between 10 and 300),
  timing              text not null check (char_length(trim(timing)) between 3 and 80),
  website             text not null default '' check (char_length(website) <= 200),
  facebook            text not null default '' check (char_length(facebook) <= 200),
  instagram           text not null default '' check (char_length(instagram) <= 200),
  tiktok              text not null default '' check (char_length(tiktok) <= 200),
  media_files         jsonb not null default '[]'::jsonb,
  photo_count         integer not null default 0,
  video_count         integer not null default 0,
  plan                text not null check (plan in ('15days', '30days', '1year')),
  amount              integer not null check (
    (plan = '15days' and amount = 2500) or
    (plan = '30days' and amount = 5000) or
    (plan = '1year' and amount = 60000)
  ),
  status              text not null default 'pending' check (status in ('pending', 'paid', 'live', 'stopped')),
  payment_received_at timestamptz,
  started_at          timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.business_ad_requests
  add column if not exists media_files jsonb not null default '[]'::jsonb;
update public.business_ad_requests
set photo_count = 0, video_count = 0
where media_files = '[]'::jsonb and (photo_count <> 0 or video_count <> 0);
alter table public.business_ad_requests
  drop constraint if exists business_ad_requests_photo_count_check,
  drop constraint if exists business_ad_requests_video_count_check,
  drop constraint if exists business_ad_requests_media_manifest_check;
alter table public.business_ad_requests
  add constraint business_ad_requests_photo_count_check check (photo_count between 0 and 30),
  add constraint business_ad_requests_video_count_check check (video_count between 0 and 5),
  add constraint business_ad_requests_media_manifest_check
    check (
      public.business_ad_media_manifest_valid(media_files, photo_count, video_count)
      and public.business_ad_media_paths_match_request(id, media_files)
    );

create or replace function public.set_business_ad_request_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists business_ad_requests_set_timestamps on public.business_ad_requests;
create trigger business_ad_requests_set_timestamps
  before insert or update on public.business_ad_requests
  for each row execute function public.set_business_ad_request_timestamps();

create index if not exists business_ad_requests_recent_idx
  on public.business_ad_requests (created_at desc);

alter table public.business_ad_requests enable row level security;
revoke all on table public.business_ad_requests from public, anon, authenticated;
grant insert on table public.business_ad_requests to anon, authenticated;
grant select, update, delete on table public.business_ad_requests to authenticated;

drop policy if exists "business_ad_requests_insert_pending" on public.business_ad_requests;
create policy "business_ad_requests_insert_pending" on public.business_ad_requests
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and payment_received_at is null
    and started_at is null
    and expires_at is null
    and legacy_id is null
    and public.business_ad_media_manifest_valid(media_files, photo_count, video_count)
    and public.business_ad_media_paths_match_request(id, media_files)
  );

drop policy if exists "business_ad_requests_admin_legacy_insert" on public.business_ad_requests;
create policy "business_ad_requests_admin_legacy_insert" on public.business_ad_requests
  for insert to authenticated
  with check (
    public.is_oms_admin()
    and legacy_id is not null
    and status = 'pending'
    and payment_received_at is null
    and started_at is null
    and expires_at is null
    and public.business_ad_media_manifest_valid(media_files, photo_count, video_count)
    and public.business_ad_media_paths_match_request(id, media_files)
  );

drop policy if exists "business_ad_requests_admin_select" on public.business_ad_requests;
create policy "business_ad_requests_admin_select" on public.business_ad_requests
  for select to authenticated using (public.is_oms_admin());

drop policy if exists "business_ad_requests_admin_update" on public.business_ad_requests;
create policy "business_ad_requests_admin_update" on public.business_ad_requests
  for update to authenticated
  using (public.is_oms_admin())
  with check (public.is_oms_admin());

drop policy if exists "business_ad_requests_admin_delete" on public.business_ad_requests;
create policy "business_ad_requests_admin_delete" on public.business_ad_requests
  for delete to authenticated using (public.is_oms_admin());

create table if not exists public.business_ads (
  request_id  uuid primary key references public.business_ad_requests(id) on delete cascade,
  business_name text not null,
  category    text not null,
  city        text not null,
  address     text not null,
  about       text not null,
  timing      text not null,
  whatsapp    text not null,
  website     text not null default '',
  facebook    text not null default '',
  instagram   text not null default '',
  tiktok      text not null default '',
  media_files jsonb not null default '[]'::jsonb,
  plan        text not null check (plan in ('15days', '30days', '1year')),
  amount      integer not null,
  started_at  timestamptz not null,
  expires_at  timestamptz not null
);

alter table public.business_ads add column if not exists media_files jsonb not null default '[]'::jsonb;
create index if not exists business_ads_expiry_idx on public.business_ads (expires_at desc);
alter table public.business_ads enable row level security;
revoke all on table public.business_ads from public, anon, authenticated;
grant select on table public.business_ads to anon, authenticated;

drop policy if exists "business_ads_read_active" on public.business_ads;
create policy "business_ads_read_active" on public.business_ads
  for select to anon, authenticated
  using (expires_at > now());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-ad-media',
  'business-ad-media',
  false,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant select, insert on storage.objects to anon, authenticated;
grant delete on storage.objects to authenticated;
revoke update on storage.objects from anon;
revoke update on storage.objects from authenticated;

create or replace function public.can_upload_business_ad_media(p_name text, p_metadata jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.business_ad_requests%rowtype;
  v_kind text;
  v_mime text;
  v_size bigint;
begin
  if p_name !~ '^[0-9a-f-]{36}/(photos|videos)/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm)$' then
    return false;
  end if;
  v_kind := case pg_catalog.split_part(p_name, '/', 2) when 'photos' then 'photo' else 'video' end;
  v_mime := p_metadata ->> 'mimetype';
  v_size := nullif(p_metadata ->> 'size', '')::bigint;
  if v_mime is null or v_size is null then return false; end if;
  if v_kind = 'photo' and (v_mime not in ('image/jpeg', 'image/png', 'image/webp') or v_size > 5242880) then
    return false;
  end if;
  if v_kind = 'video' and (v_mime not in ('video/mp4', 'video/webm') or v_size > 26214400) then
    return false;
  end if;

  select * into v_request
  from public.business_ad_requests
  where id::text = pg_catalog.split_part(p_name, '/', 1)
    and status = 'pending'
    and legacy_id is null;
  if not found
    or not public.business_ad_media_manifest_valid(
      v_request.media_files, v_request.photo_count, v_request.video_count
    )
    or not (v_request.media_files @> pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('path', p_name, 'kind', v_kind)
    )) then
    return false;
  end if;
  return true;
exception
  when invalid_text_representation then return false;
end;
$$;

revoke all on function public.can_upload_business_ad_media(text, jsonb) from public;
grant execute on function public.can_upload_business_ad_media(text, jsonb) to anon, authenticated;

drop policy if exists "business_ad_media_upload_manifest" on storage.objects;
create policy "business_ad_media_upload_manifest" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'business-ad-media'
    and public.can_upload_business_ad_media(name, metadata)
  );

drop policy if exists "business_ad_media_read_active_or_admin" on storage.objects;
create policy "business_ad_media_read_active_or_admin" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'business-ad-media'
    and (
      exists (
        select 1 from public.business_ads ad
        where ad.request_id::text = pg_catalog.split_part(name, '/', 1)
          and ad.expires_at > now()
          and ad.media_files @> pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('path', name)
          )
      )
      or (
        auth.role() = 'authenticated'
        and public.is_oms_admin()
        and exists (
          select 1 from public.business_ad_requests request
          where request.id::text = pg_catalog.split_part(name, '/', 1)
            and request.media_files @> pg_catalog.jsonb_build_array(
              pg_catalog.jsonb_build_object('path', name)
            )
        )
      )
    )
  );

drop policy if exists "business_ad_media_delete_pending_or_admin" on storage.objects;
drop policy if exists "business_ad_media_delete_admin" on storage.objects;
drop policy if exists "business_ad_media_delete_pending" on storage.objects;
create policy "business_ad_media_delete_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-ad-media'
    and public.is_oms_admin()
  );

drop policy if exists "business_ad_media_select_boundary" on storage.objects;
create policy "business_ad_media_select_boundary" on storage.objects
  as restrictive for select to anon, authenticated
  using (
    bucket_id <> 'business-ad-media'
    or (
      exists (
        select 1 from public.business_ads ad
        where ad.request_id::text = pg_catalog.split_part(name, '/', 1)
          and ad.expires_at > now()
          and ad.media_files @> pg_catalog.jsonb_build_array(
            pg_catalog.jsonb_build_object('path', name)
          )
      )
      or (
        auth.role() = 'authenticated'
        and public.is_oms_admin()
        and exists (
          select 1 from public.business_ad_requests request
          where request.id::text = pg_catalog.split_part(name, '/', 1)
            and request.media_files @> pg_catalog.jsonb_build_array(
              pg_catalog.jsonb_build_object('path', name)
            )
        )
      )
    )
  );

drop policy if exists "business_ad_media_insert_boundary" on storage.objects;
create policy "business_ad_media_insert_boundary" on storage.objects
  as restrictive for insert to anon, authenticated
  with check (
    bucket_id <> 'business-ad-media'
    or (
      bucket_id = 'business-ad-media'
      and public.can_upload_business_ad_media(name, metadata)
    )
  );

drop policy if exists "business_ad_media_delete_boundary" on storage.objects;
create policy "business_ad_media_delete_boundary" on storage.objects
  as restrictive for delete to anon, authenticated
  using (bucket_id <> 'business-ad-media' or public.is_oms_admin());

create or replace function public.finalize_business_ad_media(p_request_id uuid, p_media_files jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.business_ad_requests%rowtype;
  v_item jsonb;
  v_path text;
  v_kind text;
  v_mime text;
  v_size bigint;
  v_photos integer := 0;
  v_videos integer := 0;
begin
  select * into v_request
  from public.business_ad_requests
  where id = p_request_id and status = 'pending' and legacy_id is null
  for update;
  if not found then raise exception 'Pending business ad request not found'; end if;

  for v_item in select value from pg_catalog.jsonb_array_elements(p_media_files) loop
    v_path := v_item ->> 'path';
    v_kind := v_item ->> 'kind';
    if pg_catalog.split_part(v_path, '/', 1) <> p_request_id::text then
      raise exception 'Uploaded media does not belong to this ad request';
    end if;
    if not (v_request.media_files @> pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('path', v_path, 'kind', v_kind)
    )) then
      raise exception 'Uploaded media was not included in this ad request';
    end if;
    select metadata ->> 'mimetype', nullif(metadata ->> 'size', '')::bigint
      into v_mime, v_size
    from storage.objects
    where bucket_id = 'business-ad-media' and name = v_path;
    if not found then raise exception 'An uploaded media file is missing'; end if;
    if v_kind = 'photo' and v_mime in ('image/jpeg', 'image/png', 'image/webp')
      and v_size <= 5242880 then
      v_photos := v_photos + 1;
    elsif v_kind = 'video' and v_mime in ('video/mp4', 'video/webm')
      and v_size <= 26214400 then
      v_videos := v_videos + 1;
    else
      raise exception 'An uploaded media file has an invalid type or size';
    end if;
  end loop;

  if not public.business_ad_media_manifest_valid(p_media_files, v_photos, v_videos) then
    raise exception 'The uploaded media list is invalid';
  end if;

  update public.business_ad_requests
  set media_files = p_media_files, photo_count = v_photos, video_count = v_videos
  where id = p_request_id;
end;
$$;

revoke all on function public.finalize_business_ad_media(uuid, jsonb) from public;
grant execute on function public.finalize_business_ad_media(uuid, jsonb) to anon, authenticated;

create or replace function public.cleanup_pending_business_ad_media(p_request_id uuid, p_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.business_ad_requests%rowtype;
  v_path text;
begin
  if p_paths is null or pg_catalog.cardinality(p_paths) > 35 then
    raise exception 'Invalid media cleanup request';
  end if;
  select * into v_request
  from public.business_ad_requests
  where id = p_request_id and status = 'pending' and legacy_id is null
  for update;
  if not found then raise exception 'Pending business ad request not found'; end if;

  foreach v_path in array p_paths loop
    if not (v_request.media_files @> pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('path', v_path)
    )) then
      raise exception 'Media path does not belong to this pending request';
    end if;
    delete from storage.objects
    where bucket_id = 'business-ad-media' and name = v_path;
  end loop;
end;
$$;

revoke all on function public.cleanup_pending_business_ad_media(uuid, text[]) from public;
grant execute on function public.cleanup_pending_business_ad_media(uuid, text[]) to anon, authenticated;

create or replace function public.delete_business_ad_media_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from storage.objects
  where bucket_id = 'business-ad-media'
    and pg_catalog.split_part(name, '/', 1) = old.id::text;
  return old;
end;
$$;

drop trigger if exists business_ad_requests_delete_media on public.business_ad_requests;
create trigger business_ad_requests_delete_media
  before delete on public.business_ad_requests
  for each row execute function public.delete_business_ad_media_objects();

create or replace function public.admin_business_ad_mark_paid(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can verify ad payments';
  end if;

  update public.business_ad_requests
  set status = 'paid', payment_received_at = now(), updated_at = now()
  where id = p_request_id and status = 'pending';

  if not found then
    raise exception 'Pending business ad request not found';
  end if;
end;
$$;

create or replace function public.admin_business_ad_publish(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.business_ad_requests%rowtype;
  v_days integer;
  v_started_at timestamptz := now();
  v_expires_at timestamptz;
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can publish business ads';
  end if;

  select * into v_request
  from public.business_ad_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Business ad request not found';
  end if;

  if v_request.payment_received_at is null
    or not (
      v_request.status = 'paid'
      or v_request.status = 'stopped'
      or (v_request.status = 'live' and v_request.expires_at <= now())
    ) then
    raise exception 'Verify payment before activating this business ad';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_request.media_files) as media(item)
    left join storage.objects object_file
      on object_file.bucket_id = 'business-ad-media'
      and object_file.name = media.item ->> 'path'
    where object_file.name is null
  ) then
    raise exception 'Some uploaded media files are missing; do not activate this ad yet';
  end if;

  v_days := case v_request.plan
    when '15days' then 15
    when '30days' then 30
    when '1year' then 365
  end;
  v_expires_at := v_started_at + make_interval(days => v_days);

  insert into public.business_ads (
    request_id, business_name, category, city, address, about, timing, whatsapp,
    website, facebook, instagram, tiktok, media_files, plan, amount, started_at, expires_at
  ) values (
    v_request.id, v_request.business_name, v_request.category, v_request.city,
    v_request.address, v_request.about, v_request.timing, v_request.whatsapp,
    v_request.website, v_request.facebook, v_request.instagram, v_request.tiktok, v_request.media_files,
    v_request.plan, v_request.amount, v_started_at, v_expires_at
  )
  on conflict (request_id) do update set
    business_name = excluded.business_name,
    category = excluded.category,
    city = excluded.city,
    address = excluded.address,
    about = excluded.about,
    timing = excluded.timing,
    whatsapp = excluded.whatsapp,
    website = excluded.website,
    facebook = excluded.facebook,
    instagram = excluded.instagram,
    tiktok = excluded.tiktok,
    media_files = excluded.media_files,
    plan = excluded.plan,
    amount = excluded.amount,
    started_at = excluded.started_at,
    expires_at = excluded.expires_at;

  update public.business_ad_requests
  set status = 'live', started_at = v_started_at, expires_at = v_expires_at, updated_at = now()
  where id = v_request.id;
end;
$$;

create or replace function public.admin_business_ad_extend(p_request_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.business_ad_requests%rowtype;
  v_days integer;
  v_expires_at timestamptz;
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can extend business ads';
  end if;

  select * into v_request
  from public.business_ad_requests
  where id = p_request_id and status = 'live' and expires_at > now()
  for update;

  if not found then
    raise exception 'Active business ad not found';
  end if;

  v_days := case v_request.plan
    when '15days' then 15
    when '30days' then 30
    when '1year' then 365
  end;
  v_expires_at := v_request.expires_at + make_interval(days => v_days);

  update public.business_ad_requests
  set expires_at = v_expires_at, updated_at = now()
  where id = v_request.id;
  update public.business_ads set expires_at = v_expires_at where request_id = v_request.id;
  return v_expires_at;
end;
$$;

create or replace function public.admin_business_ad_stop(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can stop business ads';
  end if;

  update public.business_ad_requests
  set status = 'stopped', expires_at = now(), updated_at = now()
  where id = p_request_id and status = 'live';

  if not found then
    raise exception 'Active business ad not found';
  end if;

  delete from public.business_ads where request_id = p_request_id;
end;
$$;

create or replace function public.admin_business_ad_delete(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_oms_admin() then
    raise exception 'Only the site admin can delete business ad requests';
  end if;

  delete from public.business_ad_requests where id = p_request_id;
  if not found then
    raise exception 'Business ad request not found';
  end if;
end;
$$;

revoke all on function public.admin_business_ad_mark_paid(uuid) from public;
revoke all on function public.admin_business_ad_publish(uuid) from public;
revoke all on function public.admin_business_ad_extend(uuid) from public;
revoke all on function public.admin_business_ad_stop(uuid) from public;
revoke all on function public.admin_business_ad_delete(uuid) from public;
grant execute on function public.admin_business_ad_mark_paid(uuid) to authenticated;
grant execute on function public.admin_business_ad_publish(uuid) to authenticated;
grant execute on function public.admin_business_ad_extend(uuid) to authenticated;
grant execute on function public.admin_business_ad_stop(uuid) to authenticated;
grant execute on function public.admin_business_ad_delete(uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. Explicit owner cashbook entries
--    Feature records are operational data, not accounting transactions.
-- ------------------------------------------------------------
create or replace function public.oms_can_access_category(p_category text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_oms_admin() or (
    public.oms_current_account_is_active() and exists (
    select 1
    from public.owner_profiles op
    where op.user_id = auth.uid()
      and p_category = any(op.categories)
    )
  );
$$;

revoke all on function public.oms_can_access_category(text) from public;
grant execute on function public.oms_can_access_category(text) to authenticated;

create table if not exists public.financial_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category         text not null check (char_length(trim(category)) between 1 and 80),
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('income', 'expense')),
  payment_status   text not null check (payment_status in ('settled', 'pending')),
  amount           numeric(14, 2) not null check (amount > 0),
  description      text not null check (char_length(trim(description)) between 3 and 160),
  created_at       timestamptz not null default now()
);

create index if not exists financial_transactions_owner_date_idx
  on public.financial_transactions (user_id, transaction_date desc);
create index if not exists financial_transactions_owner_category_idx
  on public.financial_transactions (user_id, category);

alter table public.financial_transactions enable row level security;
revoke all on table public.financial_transactions from public, anon, authenticated;
grant select, insert, update, delete on table public.financial_transactions to authenticated;

drop policy if exists "financial_transactions_select_own" on public.financial_transactions;
create policy "financial_transactions_select_own" on public.financial_transactions
  for select to authenticated using (
    auth.uid() = user_id and public.oms_can_access_category(category)
  );

drop policy if exists "financial_transactions_insert_own" on public.financial_transactions;
create policy "financial_transactions_insert_own" on public.financial_transactions
  for insert to authenticated with check (
    auth.uid() = user_id and public.oms_can_access_category(category)
  );

drop policy if exists "financial_transactions_update_own" on public.financial_transactions;
create policy "financial_transactions_update_own" on public.financial_transactions
  for update to authenticated
  using (auth.uid() = user_id and public.oms_can_access_category(category))
  with check (auth.uid() = user_id and public.oms_can_access_category(category));

drop policy if exists "financial_transactions_delete_own" on public.financial_transactions;
create policy "financial_transactions_delete_own" on public.financial_transactions
  for delete to authenticated using (
    auth.uid() = user_id and public.oms_can_access_category(category)
  );

drop policy if exists "financial_transactions_active_account_guard" on public.financial_transactions;
create policy "financial_transactions_active_account_guard" on public.financial_transactions
  as restrictive for all to authenticated
  using (public.oms_current_account_is_active())
  with check (public.oms_current_account_is_active());

-- ------------------------------------------------------------
-- 8. Make your own account the CEO
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
-- 9. Extra hardening
-- ------------------------------------------------------------
-- Block anon sign-ups (run only if you do NOT want random visitors
-- to create accounts). Owners/CEO still sign in with their account.
-- update auth.config set enable_signup = false;
