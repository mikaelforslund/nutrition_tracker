-- Groups on the sessions panel, such as Family or Employees. A person belongs to
-- at most one, so all their devices sit together. Only used with AUTH_MODE=mock.
create table app_nutrition.session_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now()
);

create unique index session_groups_name_idx on app_nutrition.session_groups (lower(name));

create table app_nutrition.person_groups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Deleting a group only ungroups its people.
  group_id uuid not null references app_nutrition.session_groups (id) on delete cascade
);

create index person_groups_group_id_idx on app_nutrition.person_groups (group_id);

-- No policies and no grants: only trusted server code may touch these tables.
alter table app_nutrition.session_groups enable row level security;
alter table app_nutrition.person_groups enable row level security;
