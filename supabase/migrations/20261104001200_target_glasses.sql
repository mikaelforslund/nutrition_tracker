alter table app_nutrition.user_profiles
  add column target_glasses integer not null default 8 check (target_glasses between 1 and 50);
