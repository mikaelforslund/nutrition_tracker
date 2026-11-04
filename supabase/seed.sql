-- Demo data for local development. Dates are relative to the moment the
-- database was seeded, so run `pnpm db:reset` to refresh a stale demo.

insert into auth.users (id, email)
values ('00000000-0000-4000-8000-000000000001', 'demo@trackerx.local')
on conflict (id) do nothing;

insert into app_nutrition.user_profiles (
  user_id, display_name, target_calories, target_protein_g, target_carbs_g, target_fat_g,
  current_weight_kg, goal_weight_kg, timezone
)
values (
  '00000000-0000-4000-8000-000000000001', 'Demo User', 2100, 150, 220, 70,
  84.5, 78.0, 'UTC'
)
on conflict (user_id) do nothing;

-- Three meals on each of the previous seven days.
insert into app_nutrition.food_logs (
  user_id, food_name, protein_g, carbs_g, fat_g, logged_at
)
select
  '00000000-0000-4000-8000-000000000001',
  meal.food_name,
  meal.protein_g,
  meal.carbs_g + (day_offset * 3) % 10,
  meal.fat_g,
  date_trunc('day', now()) - make_interval(days => day_offset) + meal.eaten_at
from generate_series(1, 7) as day_offset
cross join (
  values
    ('Greek Yogurt with Berries', 24.0, 38.0, 8.0, interval '8 hours'),
    ('Chicken Burrito Bowl', 46.0, 72.0, 21.0, interval '13 hours'),
    ('Grilled Salmon with Quinoa', 45.0, 40.0, 23.0, interval '19 hours')
) as meal (food_name, protein_g, carbs_g, fat_g, eaten_at);

-- Today so far. Logged relative to now so it never lands in the future.
insert into app_nutrition.food_logs (
  user_id, food_name, protein_g, carbs_g, fat_g, logged_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'Oatmeal with Banana', 14.0, 72.0, 8.0, now());

-- A week of weigh-ins for the progress chart.
insert into app_nutrition.weight_logs (user_id, logged_on, weight_kg)
select
  '00000000-0000-4000-8000-000000000001',
  current_date - day_offset,
  84.5 + day_offset * 0.15
from generate_series(0, 7) as day_offset;
