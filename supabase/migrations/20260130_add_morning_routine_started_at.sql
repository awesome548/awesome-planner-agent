alter table public.morning_routine_completions
  add column if not exists started_at timestamptz,
  add column if not exists started_at_tz text;
