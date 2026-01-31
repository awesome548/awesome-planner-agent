do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'prune_morning_routine_actual_minutes'
  ) then
    perform cron.unschedule(
      (select jobid from cron.job where jobname = 'prune_morning_routine_actual_minutes' limit 1)
    );
  end if;
end;
$$;

drop function if exists public.prune_morning_routine_actual_minutes(integer);

alter table public.morning_routine_actions
  drop column if exists duration_minutes;

alter table public.morning_routine_action_records
  drop column if exists actual_minutes;

alter table public.morning_routine_completions
  drop column if exists started_at,
  drop column if exists started_at_tz;
