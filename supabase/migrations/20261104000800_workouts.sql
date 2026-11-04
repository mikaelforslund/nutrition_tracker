create table app_nutrition.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  worked_out_on date not null,
  workout_type text not null check (char_length(workout_type) between 1 and 60),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  -- As reported by the person's watch or fitness app.
  calories_burned integer not null check (calories_burned between 0 and 10000),
  created_at timestamptz not null default now()
);

create index workouts_user_id_worked_out_on_idx
  on app_nutrition.workouts (user_id, worked_out_on desc);

alter table app_nutrition.workouts enable row level security;

create policy workouts_select_own on app_nutrition.workouts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy workouts_insert_own on app_nutrition.workouts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy workouts_update_own on app_nutrition.workouts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy workouts_delete_own on app_nutrition.workouts
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on app_nutrition.workouts to authenticated;
grant all on app_nutrition.workouts to service_role;
