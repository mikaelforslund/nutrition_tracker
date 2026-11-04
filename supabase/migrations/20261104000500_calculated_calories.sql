-- Calories are always worked out from the macros, at 4 kcal per gram of protein and
-- carbs and 9 per gram of fat, so the two can never disagree. Replaces any value
-- that was entered by hand.
alter table app_nutrition.food_logs drop column calories;

alter table app_nutrition.food_logs
  add column calories integer not null
  generated always as (round(protein_g * 4 + carbs_g * 4 + fat_g * 9)::integer) stored;
