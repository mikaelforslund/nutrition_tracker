-- Settings changed from the app's config page. Anything missing falls back to the
-- environment. Only used with AUTH_MODE=mock.
create table app_nutrition.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- No policies and no grants: only trusted server code may touch this table.
alter table app_nutrition.app_settings enable row level security;
