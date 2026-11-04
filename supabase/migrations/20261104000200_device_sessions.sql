-- Local stand-in for accounts: people pick a profile, and each device they use
-- gets a session. Only used with AUTH_MODE=mock.

alter table app_nutrition.user_profiles
  add column display_name text check (char_length(display_name) between 1 and 40);

create unique index user_profiles_display_name_idx
  on app_nutrition.user_profiles (lower(display_name));

update app_nutrition.user_profiles
set display_name = 'Demo User'
where user_id = '00000000-0000-4000-8000-000000000001';

create table app_nutrition.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_label text not null check (char_length(device_label) between 1 and 100),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index device_sessions_last_seen_at_idx
  on app_nutrition.device_sessions (last_seen_at desc);

-- No policies and no grants: only trusted server code may touch this table.
alter table app_nutrition.device_sessions enable row level security;
