create extension if not exists pg_cron;

alter table public.morning_routine_action_records
  drop column if exists notes;

create or replace function public.prune_morning_routine_actual_minutes(
  retention_days integer default 7
) returns void
language plpgsql as $$
begin
  update public.morning_routine_action_records
  set actual_minutes = null
  where completed_on < (current_date - retention_days)
    and actual_minutes is not null;
end;
$$;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'prune_morning_routine_actual_minutes'
  ) then
    perform cron.unschedule(
      (select jobid from cron.job where jobname = 'prune_morning_routine_actual_minutes' limit 1)
    );
  end if;

  perform cron.schedule(
    'prune_morning_routine_actual_minutes',
    '0 3 * * *',
    $job$select public.prune_morning_routine_actual_minutes(7);$job$
  );
end;
$$;
