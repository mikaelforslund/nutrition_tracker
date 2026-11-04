-- Ended sessions are kept, so the dashboard can show history and durations.
alter table app_nutrition.device_sessions add column ended_at timestamptz;
