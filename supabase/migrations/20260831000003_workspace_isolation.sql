-- 1. Clear any orphaned rows to satisfy the NOT NULL constraint on workspace_id
-- Since these lacked workspace isolation, we wipe them to ensure a clean slate for the multi-tenant architecture.
TRUNCATE TABLE time_blocks CASCADE;
TRUNCATE TABLE focus_sessions CASCADE;

-- 2. Add workspace_id isolation columns
ALTER TABLE time_blocks ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE focus_sessions ADD COLUMN workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE;

-- 3. Enforce Strict Asymmetric RLS on time_blocks
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asymmetric SELECT time_blocks" ON time_blocks FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT time_blocks" ON time_blocks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = time_blocks.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE time_blocks" ON time_blocks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = time_blocks.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE time_blocks" ON time_blocks FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = time_blocks.workspace_id AND user_id = auth.uid()));

-- 4. Enforce Strict Asymmetric RLS on focus_sessions
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Asymmetric SELECT focus_sessions" ON focus_sessions FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT focus_sessions" ON focus_sessions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = focus_sessions.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE focus_sessions" ON focus_sessions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = focus_sessions.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE focus_sessions" ON focus_sessions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = focus_sessions.workspace_id AND user_id = auth.uid()));

-- 5. Cast logical date strings to strict Postgres DATE
-- Note: schema.ts uses log_date for habit_logs, date for time_blocks
ALTER TABLE time_blocks ALTER COLUMN date TYPE DATE USING date::DATE;
ALTER TABLE habit_logs ALTER COLUMN log_date TYPE DATE USING log_date::DATE;
