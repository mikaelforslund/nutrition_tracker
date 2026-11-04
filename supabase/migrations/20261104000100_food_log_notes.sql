alter table app_nutrition.food_logs
  add column notes text check (char_length(notes) <= 2000);
