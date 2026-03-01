-- Migration: add user_id scoping to all tables + create usage_records
-- Uses auth.jwt()->>'sub' (Google OAuth sub) for per-user RLS enforcement

-- ─── morning_routine_actions ────────────────────────────────────────────────

ALTER TABLE public.morning_routine_actions
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS morning_routine_actions_user_id_idx
  ON public.morning_routine_actions (user_id);

DROP POLICY IF EXISTS "public_read_morning_routine_actions"   ON public.morning_routine_actions;
DROP POLICY IF EXISTS "public_write_morning_routine_actions"  ON public.morning_routine_actions;
DROP POLICY IF EXISTS "public_update_morning_routine_actions" ON public.morning_routine_actions;
DROP POLICY IF EXISTS "public_delete_morning_routine_actions" ON public.morning_routine_actions;

CREATE POLICY "user_select_morning_routine_actions" ON public.morning_routine_actions
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_insert_morning_routine_actions" ON public.morning_routine_actions
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_update_morning_routine_actions" ON public.morning_routine_actions
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id)
  WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_delete_morning_routine_actions" ON public.morning_routine_actions
  FOR DELETE USING ((auth.jwt()->>'sub') = user_id);

-- ─── morning_routine_completions ────────────────────────────────────────────
-- PK changes from (completed_on) to (user_id, completed_on)

ALTER TABLE public.morning_routine_completions
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.morning_routine_completions
  DROP CONSTRAINT morning_routine_completions_pkey;

ALTER TABLE public.morning_routine_completions
  ADD PRIMARY KEY (user_id, completed_on);

CREATE INDEX IF NOT EXISTS morning_routine_completions_user_id_idx
  ON public.morning_routine_completions (user_id);

DROP POLICY IF EXISTS "public_read_morning_routine_completions"   ON public.morning_routine_completions;
DROP POLICY IF EXISTS "public_write_morning_routine_completions"  ON public.morning_routine_completions;
DROP POLICY IF EXISTS "public_update_morning_routine_completions" ON public.morning_routine_completions;
DROP POLICY IF EXISTS "public_delete_morning_routine_completions" ON public.morning_routine_completions;

CREATE POLICY "user_select_morning_routine_completions" ON public.morning_routine_completions
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_insert_morning_routine_completions" ON public.morning_routine_completions
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_update_morning_routine_completions" ON public.morning_routine_completions
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id)
  WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_delete_morning_routine_completions" ON public.morning_routine_completions
  FOR DELETE USING ((auth.jwt()->>'sub') = user_id);

-- ─── morning_routine_action_records ─────────────────────────────────────────
-- Unique constraint changes from (action_id, completed_on)
--                            to (user_id, action_id, completed_on)

ALTER TABLE public.morning_routine_action_records
  ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.morning_routine_action_records
  DROP CONSTRAINT IF EXISTS morning_routine_action_records_action_id_completed_on_key;

ALTER TABLE public.morning_routine_action_records
  ADD CONSTRAINT morning_routine_action_records_user_action_date_key
  UNIQUE (user_id, action_id, completed_on);

CREATE INDEX IF NOT EXISTS morning_routine_action_records_user_id_idx
  ON public.morning_routine_action_records (user_id);

DROP POLICY IF EXISTS "public_read_morning_routine_action_records"   ON public.morning_routine_action_records;
DROP POLICY IF EXISTS "public_write_morning_routine_action_records"  ON public.morning_routine_action_records;
DROP POLICY IF EXISTS "public_update_morning_routine_action_records" ON public.morning_routine_action_records;
DROP POLICY IF EXISTS "public_delete_morning_routine_action_records" ON public.morning_routine_action_records;

CREATE POLICY "user_select_morning_routine_action_records" ON public.morning_routine_action_records
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_insert_morning_routine_action_records" ON public.morning_routine_action_records
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_update_morning_routine_action_records" ON public.morning_routine_action_records
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id)
  WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_delete_morning_routine_action_records" ON public.morning_routine_action_records
  FOR DELETE USING ((auth.jwt()->>'sub') = user_id);

-- ─── usage_records (create from scratch — no prior migration) ───────────────

CREATE TABLE IF NOT EXISTS public.usage_records (
  user_id  TEXT NOT NULL,
  used_on  DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, used_on)
);

CREATE INDEX IF NOT EXISTS usage_records_user_id_idx
  ON public.usage_records (user_id);

ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_usage_records" ON public.usage_records
  FOR SELECT USING ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_insert_usage_records" ON public.usage_records
  FOR INSERT WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_update_usage_records" ON public.usage_records
  FOR UPDATE USING ((auth.jwt()->>'sub') = user_id)
  WITH CHECK ((auth.jwt()->>'sub') = user_id);

CREATE POLICY "user_delete_usage_records" ON public.usage_records
  FOR DELETE USING ((auth.jwt()->>'sub') = user_id);
