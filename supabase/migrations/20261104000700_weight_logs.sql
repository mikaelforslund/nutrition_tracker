-- One weight per person per day, so a second entry corrects the first.
create table app_nutrition.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 500),
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

alter table app_nutrition.weight_logs enable row level security;

create policy weight_logs_select_own on app_nutrition.weight_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy weight_logs_insert_own on app_nutrition.weight_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy weight_logs_update_own on app_nutrition.weight_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy weight_logs_delete_own on app_nutrition.weight_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on app_nutrition.weight_logs to authenticated;
grant all on app_nutrition.weight_logs to service_role;

-- Starts each chart from the weight people have already entered.
insert into app_nutrition.weight_logs (user_id, logged_on, weight_kg)
select user_id, (now() at time zone timezone)::date, current_weight_kg
from app_nutrition.user_profiles
where current_weight_kg is not null;
