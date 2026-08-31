-- 1. Create the high-performance composite index for strict EXISTS checks
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_members_fast ON public.workspace_members (workspace_id, user_id);

-- 2. Drop existing policies to replace with Asymmetric RLS
DO $$
DECLARE
    tbl text;
    pol text;
BEGIN
    FOR tbl, pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('tasks', 'projects', 'sections', 'comments', 'attachments', 'tags', 'habits', 'habit_logs', 'saved_filters', 'task_tags')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, tbl);
    END LOOP;
END $$;

-- 3. Apply Asymmetric RLS
-- We use auth.jwt()->'app_metadata'->'workspace_ids' for SELECT (lightning fast, edge cacheable)
-- We use EXISTS (SELECT 1 FROM workspace_members...) for INSERT/UPDATE/DELETE (immediate revocation)

-- Helper macro function for the JWT check to keep policies clean (inlined by Postgres)
CREATE OR REPLACE FUNCTION auth_user_workspace_ids()
RETURNS uuid[] AS $$
  SELECT ARRAY(SELECT jsonb_array_elements_text(coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'workspace_ids', '[]'::jsonb)))::uuid[];
$$ LANGUAGE sql STABLE;

-- PROJECTS
CREATE POLICY "Asymmetric SELECT projects" ON projects FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT projects" ON projects FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE projects" ON projects FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE projects" ON projects FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid()));

-- SECTIONS
CREATE POLICY "Asymmetric SELECT sections" ON sections FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT sections" ON sections FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sections.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE sections" ON sections FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sections.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE sections" ON sections FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = sections.workspace_id AND user_id = auth.uid()));

-- TASKS
CREATE POLICY "Asymmetric SELECT tasks" ON tasks FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT tasks" ON tasks FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE tasks" ON tasks FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE tasks" ON tasks FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));

-- COMMENTS
CREATE POLICY "Asymmetric SELECT comments" ON comments FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT comments" ON comments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = comments.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE comments" ON comments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = comments.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE comments" ON comments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = comments.workspace_id AND user_id = auth.uid()));

-- ATTACHMENTS
CREATE POLICY "Asymmetric SELECT attachments" ON attachments FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT attachments" ON attachments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = attachments.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE attachments" ON attachments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = attachments.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE attachments" ON attachments FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = attachments.workspace_id AND user_id = auth.uid()));

-- TAGS
CREATE POLICY "Asymmetric SELECT tags" ON tags FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT tags" ON tags FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE tags" ON tags FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE tags" ON tags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid()));

-- TASK_TAGS
CREATE POLICY "Asymmetric SELECT task_tags" ON task_tags FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT task_tags" ON task_tags FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = task_tags.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE task_tags" ON task_tags FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = task_tags.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE task_tags" ON task_tags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = task_tags.workspace_id AND user_id = auth.uid()));

-- HABITS
CREATE POLICY "Asymmetric SELECT habits" ON habits FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT habits" ON habits FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habits.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE habits" ON habits FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habits.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE habits" ON habits FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habits.workspace_id AND user_id = auth.uid()));

-- HABIT_LOGS
CREATE POLICY "Asymmetric SELECT habit_logs" ON habit_logs FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT habit_logs" ON habit_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habit_logs.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE habit_logs" ON habit_logs FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habit_logs.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE habit_logs" ON habit_logs FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = habit_logs.workspace_id AND user_id = auth.uid()));

-- SAVED_FILTERS
CREATE POLICY "Asymmetric SELECT saved_filters" ON saved_filters FOR SELECT TO authenticated
USING (workspace_id = ANY (auth_user_workspace_ids()));

CREATE POLICY "Asymmetric INSERT saved_filters" ON saved_filters FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = saved_filters.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric UPDATE saved_filters" ON saved_filters FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = saved_filters.workspace_id AND user_id = auth.uid()));

CREATE POLICY "Asymmetric DELETE saved_filters" ON saved_filters FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = saved_filters.workspace_id AND user_id = auth.uid()));
