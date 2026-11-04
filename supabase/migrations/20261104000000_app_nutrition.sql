-- Nutrition Tracker schema.
--
-- Each app on the platform owns one `app_<name>` schema in the shared database
-- and references the shared identity table, auth.users.

create schema if not exists app_nutrition;

revoke all on schema app_nutrition from public;
grant usage on schema app_nutrition to authenticated, service_role;

create function app_nutrition.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table app_nutrition.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  target_calories integer not null default 2000
    check (target_calories between 800 and 10000),
  target_protein_g integer not null default 130
    check (target_protein_g between 0 and 1000),
  target_carbs_g integer not null default 220
    check (target_carbs_g between 0 and 2000),
  target_fat_g integer not null default 65
    check (target_fat_g between 0 and 1000),
  -- Inputs to the goal weight projection. Null until the user provides them.
  current_weight_kg numeric(5, 2)
    check (current_weight_kg between 20 and 500),
  goal_weight_kg numeric(5, 2)
    check (goal_weight_kg between 20 and 500),
  maintenance_calories integer
    check (maintenance_calories between 800 and 10000),
  -- IANA zone name. Decides where each user's "today" starts and ends.
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_profiles_set_updated_at
  before update on app_nutrition.user_profiles
  for each row execute function app_nutrition.set_updated_at();

create table app_nutrition.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  image_url text,
  food_name text not null check (char_length(food_name) between 1 and 200),
  calories integer not null check (calories between 0 and 20000),
  protein_g numeric(6, 1) not null check (protein_g between 0 and 2000),
  carbs_g numeric(6, 1) not null check (carbs_g between 0 and 2000),
  fat_g numeric(6, 1) not null check (fat_g between 0 and 2000),
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index food_logs_user_id_logged_at_idx
  on app_nutrition.food_logs (user_id, logged_at desc);

alter table app_nutrition.user_profiles enable row level security;
alter table app_nutrition.food_logs enable row level security;

-- `(select auth.uid())` is evaluated once per statement rather than per row.
create policy user_profiles_select_own on app_nutrition.user_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_profiles_insert_own on app_nutrition.user_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_profiles_update_own on app_nutrition.user_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy food_logs_select_own on app_nutrition.food_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy food_logs_insert_own on app_nutrition.food_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy food_logs_update_own on app_nutrition.food_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy food_logs_delete_own on app_nutrition.food_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update on app_nutrition.user_profiles to authenticated;
grant select, insert, update, delete on app_nutrition.food_logs to authenticated;
grant all on all tables in schema app_nutrition to service_role;
