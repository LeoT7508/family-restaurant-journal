-- Family Table Journal: initial schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- It is safe to run again (it only creates what is missing and replaces policies).
--
-- Security model: every row belongs to a household. A signed-in user can only see and change rows
-- of the household they are a member of (row-level security on every table). The public "anon" key
-- in the front end can do nothing without a signed-in user.

-- ---------------------------------------------------------------------------------------------
-- Households and who belongs to them
-- ---------------------------------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  home_zip text not null default '60601' check (home_zip ~ '^[0-9]{5}$'),
  home_label text not null default 'Chicago, IL 60601',
  drive_radius_minutes integer not null default 20 check (drive_radius_minutes between 5 and 120),
  travel_destination text,
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'child')),
  age integer check (age between 0 and 25),
  allergies text[] not null default '{}',
  is_parent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per signed-in person. Links a login to a household and to "which parent am I".
create table if not exists public.household_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  family_member_id uuid references public.family_members (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists household_memberships_member_key
  on public.household_memberships (household_id, family_member_id)
  where family_member_id is not null;

-- ---------------------------------------------------------------------------------------------
-- Journal data
-- ---------------------------------------------------------------------------------------------
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  place_id text not null,
  name text not null,
  address text not null default '',
  cuisine text not null,
  price_level integer not null check (price_level between 1 and 4),
  drive_minutes integer not null default 0 check (drive_minutes >= 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, place_id)
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  date date not null,
  logged_by uuid references public.family_members (id) on delete set null,
  occasions text[] not null default '{}',
  go_again text check (go_again in ('yes', 'maybe', 'never')),
  ratings jsonb not null default '{}'::jsonb,
  family_rating integer check (family_rating between 1 and 5),
  amount_spent numeric(10, 2) check (amount_spent >= 0),
  subtotal numeric(10, 2) check (subtotal >= 0),
  tip numeric(10, 2) check (tip >= 0),
  party_size integer check (party_size between 1 and 30),
  notes text not null default '',
  photos text[] not null default '{}',
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  visit_id uuid not null references public.visits (id) on delete cascade,
  name text not null,
  eaten_by text[] not null default '{}',
  verdicts jsonb not null default '{}'::jsonb,
  safe_for_allergy text not null default 'unknown' check (safe_for_allergy in ('safe', 'avoid', 'unknown')),
  photo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  visit_id uuid not null references public.visits (id) on delete cascade,
  name text not null,
  producer text not null default '',
  grape_or_region text not null default '',
  serving_type text not null default 'glass' check (serving_type in ('glass', 'bottle')),
  price numeric(10, 2) check (price >= 0),
  ratings jsonb not null default '{}'::jsonb,
  tasting_note text not null default '',
  label_photo text,
  paired_dish_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kid_info (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  visit_id uuid references public.visits (id) on delete cascade,
  kids_menu boolean not null default false,
  high_chair boolean not null default false,
  room_for_stroller boolean not null default false,
  quick_service boolean not null default false,
  favorite_dish_by_child jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.allergy_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  member_id text not null,
  note text not null,
  asked_who text not null default '',
  date_asked date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  added_by text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, restaurant_id)
);

create index if not exists family_members_household_idx on public.family_members (household_id);
create index if not exists restaurants_household_idx on public.restaurants (household_id);
create index if not exists visits_household_date_idx on public.visits (household_id, date desc);
create index if not exists visits_restaurant_idx on public.visits (restaurant_id);
create index if not exists dishes_visit_idx on public.dishes (visit_id);
create index if not exists wines_visit_idx on public.wines (visit_id);
create index if not exists kid_info_restaurant_idx on public.kid_info (restaurant_id);
create index if not exists allergy_notes_restaurant_idx on public.allergy_notes (restaurant_id);
create index if not exists wishlist_household_idx on public.wishlist_items (household_id);

-- ---------------------------------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'households', 'family_members', 'restaurants', 'visits', 'dishes', 'wines',
    'kid_info', 'allergy_notes', 'wishlist_items'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------
-- "Is the signed-in user a member of this household?" Runs as the table owner so the policies below
-- can call it without recursion. It only ever answers about auth.uid().
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_memberships m
    where m.household_id = hid and m.user_id = (select auth.uid())
  );
$$;

alter table public.households enable row level security;
alter table public.family_members enable row level security;
alter table public.household_memberships enable row level security;
alter table public.restaurants enable row level security;
alter table public.visits enable row level security;
alter table public.dishes enable row level security;
alter table public.wines enable row level security;
alter table public.kid_info enable row level security;
alter table public.allergy_notes enable row level security;
alter table public.wishlist_items enable row level security;

-- Households: members can read and update their own. Creating one goes through create_household().
drop policy if exists "members read household" on public.households;
create policy "members read household" on public.households
  for select to authenticated using (public.is_household_member(id));
drop policy if exists "members update household" on public.households;
create policy "members update household" on public.households
  for update to authenticated
  using (public.is_household_member(id)) with check (public.is_household_member(id));

-- Memberships: you can see your own row. Rows are created and changed only by the functions below.
drop policy if exists "read own membership" on public.household_memberships;
create policy "read own membership" on public.household_memberships
  for select to authenticated using (user_id = (select auth.uid()));

-- Every household-owned table: members can do everything within their household, nobody else can.
do $$
declare
  t text;
begin
  foreach t in array array[
    'family_members', 'restaurants', 'visits', 'dishes', 'wines',
    'kid_info', 'allergy_notes', 'wishlist_items'
  ]
  loop
    execute format('drop policy if exists "household members only" on public.%I', t);
    execute format(
      'create policy "household members only" on public.%I for all to authenticated
         using (public.is_household_member(household_id))
         with check (public.is_household_member(household_id))',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Setup functions the app calls
-- ---------------------------------------------------------------------------------------------
-- First parent: create the household and its family profiles, and join it.
create or replace function public.create_household(
  p_name text,
  p_zip text,
  p_label text,
  p_radius integer,
  p_members jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
  m jsonb;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;
  if exists (select 1 from public.household_memberships where user_id = uid) then
    raise exception 'You already belong to a household.';
  end if;

  insert into public.households (name, home_zip, home_label, drive_radius_minutes)
  values (p_name, p_zip, p_label, p_radius)
  returning id into hid;

  for m in select * from jsonb_array_elements(coalesce(p_members, '[]'::jsonb))
  loop
    insert into public.family_members (household_id, name, role, age, allergies, is_parent)
    values (
      hid,
      m ->> 'name',
      m ->> 'role',
      nullif(m ->> 'age', '')::integer,
      coalesce(array(select jsonb_array_elements_text(m -> 'allergies')), '{}'),
      (m ->> 'role') = 'parent'
    );
  end loop;

  insert into public.household_memberships (user_id, household_id) values (uid, hid);
  return hid;
end;
$$;

-- Second parent: join with the household's invite code (at most two people can join).
create or replace function public.join_household(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  if uid is null then
    raise exception 'You need to be signed in.';
  end if;
  if exists (select 1 from public.household_memberships where user_id = uid) then
    raise exception 'You already belong to a household.';
  end if;

  select id into hid from public.households where invite_code = lower(trim(p_code));
  if hid is null then
    raise exception 'That invite code was not found.';
  end if;
  if (select count(*) from public.household_memberships where household_id = hid) >= 2 then
    raise exception 'This household already has two parents.';
  end if;

  insert into public.household_memberships (user_id, household_id) values (uid, hid);
  return hid;
end;
$$;

-- Choose which family parent you are (Alex or Sam). Each parent can be claimed once.
create or replace function public.claim_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  hid uuid;
begin
  select household_id into hid from public.household_memberships where user_id = uid;
  if hid is null then
    raise exception 'Set up or join a household first.';
  end if;
  if not exists (
    select 1 from public.family_members
    where id = p_member_id and household_id = hid and is_parent
  ) then
    raise exception 'Pick one of the parents in your household.';
  end if;
  if exists (
    select 1 from public.household_memberships
    where household_id = hid and family_member_id = p_member_id and user_id <> uid
  ) then
    raise exception 'That parent has already been claimed by someone else.';
  end if;

  update public.household_memberships set family_member_id = p_member_id where user_id = uid;
end;
$$;

-- Only signed-in users may call the setup functions.
revoke all on function public.create_household(text, text, text, integer, jsonb) from public, anon;
revoke all on function public.join_household(text) from public, anon;
revoke all on function public.claim_member(uuid) from public, anon;
grant execute on function public.create_household(text, text, text, integer, jsonb) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.claim_member(uuid) to authenticated;
revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Photos: a private bucket, one folder per household
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "household photos read" on storage.objects;
create policy "household photos read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household photos insert" on storage.objects;
create policy "household photos insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "household photos delete" on storage.objects;
create policy "household photos delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
