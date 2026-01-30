create extension if not exists "pgcrypto";

create table if not exists public.morning_routine_actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists morning_routine_actions_position_idx
  on public.morning_routine_actions (position);

create table if not exists public.morning_routine_completions (
  completed_on date primary key,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.morning_routine_action_records (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.morning_routine_actions(id) on delete cascade,
  completed_on date not null,
  completed boolean not null default true,
  actual_minutes integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (action_id, completed_on)
);

create index if not exists morning_routine_action_records_completed_on_idx
  on public.morning_routine_action_records (completed_on);

create index if not exists morning_routine_action_records_action_id_idx
  on public.morning_routine_action_records (action_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_morning_routine_actions_updated_at
before update on public.morning_routine_actions
for each row execute function public.set_updated_at();

create trigger set_morning_routine_completions_updated_at
before update on public.morning_routine_completions
for each row execute function public.set_updated_at();

create trigger set_morning_routine_action_records_updated_at
before update on public.morning_routine_action_records
for each row execute function public.set_updated_at();

alter table public.morning_routine_actions enable row level security;
alter table public.morning_routine_completions enable row level security;
alter table public.morning_routine_action_records enable row level security;

create policy "public_read_morning_routine_actions" on public.morning_routine_actions
  for select using (true);
create policy "public_write_morning_routine_actions" on public.morning_routine_actions
  for insert with check (true);
create policy "public_update_morning_routine_actions" on public.morning_routine_actions
  for update using (true) with check (true);
create policy "public_delete_morning_routine_actions" on public.morning_routine_actions
  for delete using (true);

create policy "public_read_morning_routine_completions" on public.morning_routine_completions
  for select using (true);
create policy "public_write_morning_routine_completions" on public.morning_routine_completions
  for insert with check (true);
create policy "public_update_morning_routine_completions" on public.morning_routine_completions
  for update using (true) with check (true);
create policy "public_delete_morning_routine_completions" on public.morning_routine_completions
  for delete using (true);

create policy "public_read_morning_routine_action_records" on public.morning_routine_action_records
  for select using (true);
create policy "public_write_morning_routine_action_records" on public.morning_routine_action_records
  for insert with check (true);
create policy "public_update_morning_routine_action_records" on public.morning_routine_action_records
  for update using (true) with check (true);
create policy "public_delete_morning_routine_action_records" on public.morning_routine_action_records
  for delete using (true);
