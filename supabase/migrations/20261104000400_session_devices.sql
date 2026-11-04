-- A session is one person on one device, so returning to it reopens the same row.
alter table app_nutrition.device_sessions add column device_id uuid;

create unique index device_sessions_user_id_device_id_idx
  on app_nutrition.device_sessions (user_id, device_id);
