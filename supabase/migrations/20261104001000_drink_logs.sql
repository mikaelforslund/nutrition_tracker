-- Glasses drunk per person, day, and drink. Drinks carry no calories here:
-- anything with milk, sugar, or juice is logged as a meal as well.
create table app_nutrition.drink_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  drunk_on date not null,
  drink_type text not null check (drink_type in ('water', 'coffee', 'tea', 'other')),
  glasses integer not null check (glasses between 1 and 50),
  created_at timestamptz not null default now(),
  unique (user_id, drunk_on, drink_type)
);

alter table app_nutrition.drink_logs enable row level security;

create policy drink_logs_select_own on app_nutrition.drink_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy drink_logs_insert_own on app_nutrition.drink_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy drink_logs_update_own on app_nutrition.drink_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy drink_logs_delete_own on app_nutrition.drink_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on app_nutrition.drink_logs to authenticated;
grant all on app_nutrition.drink_logs to service_role;
