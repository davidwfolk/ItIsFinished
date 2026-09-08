-- 1. Update JWT claims function to split admin vs member workspaces
CREATE OR REPLACE FUNCTION update_user_workspace_claims()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _admin_workspace_ids UUID[];
  _member_workspace_ids UUID[];
BEGIN
  -- Determine which user's claims need updating based on the operation
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
  ELSE
    _user_id := NEW.user_id;
  END IF;

  -- Aggregate workspaces where user is owner or admin
  SELECT array_agg(workspace_id) INTO _admin_workspace_ids
  FROM public.workspace_members
  WHERE user_id = _user_id AND role IN ('owner', 'admin');

  -- Aggregate workspaces where user is just a member
  SELECT array_agg(workspace_id) INTO _member_workspace_ids
  FROM public.workspace_members
  WHERE user_id = _user_id AND role = 'member';

  -- Default to empty arrays if null
  IF _admin_workspace_ids IS NULL THEN _admin_workspace_ids := ARRAY[]::UUID[]; END IF;
  IF _member_workspace_ids IS NULL THEN _member_workspace_ids := ARRAY[]::UUID[]; END IF;

  -- Update auth.users directly. Security Definer ensures permission.
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'admin_workspace_ids', _admin_workspace_ids,
      'member_workspace_ids', _member_workspace_ids,
      'workspace_ids', _admin_workspace_ids || _member_workspace_ids
    )
  WHERE id = _user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. Create accessor macros
CREATE OR REPLACE FUNCTION auth_admin_workspace_ids()
RETURNS uuid[] AS $$
  SELECT ARRAY(SELECT jsonb_array_elements_text(coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'admin_workspace_ids', '[]'::jsonb)))::uuid[];
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth_member_workspace_ids()
RETURNS uuid[] AS $$
  SELECT ARRAY(SELECT jsonb_array_elements_text(coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' -> 'member_workspace_ids', '[]'::jsonb)))::uuid[];
$$ LANGUAGE sql STABLE;

-- 3. Trigger a manual sync to populate the new arrays for all existing users
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT DISTINCT user_id FROM public.workspace_members LOOP
    -- Dummy update to fire the trigger
    UPDATE public.workspace_members 
    SET updated_at = NOW() 
    WHERE user_id = rec.user_id AND workspace_id = (SELECT workspace_id FROM public.workspace_members WHERE user_id = rec.user_id LIMIT 1);
  END LOOP;
END $$;

-- 4. Update Asymmetric RLS for projects
DROP POLICY IF EXISTS "Asymmetric SELECT projects" ON projects;
CREATE POLICY "Asymmetric SELECT projects" ON projects FOR SELECT TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric INSERT projects" ON projects;
CREATE POLICY "Asymmetric INSERT projects" ON projects FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE projects" ON projects;
CREATE POLICY "Asymmetric UPDATE projects" ON projects FOR UPDATE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric DELETE projects" ON projects;
CREATE POLICY "Asymmetric DELETE projects" ON projects FOR DELETE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = projects.id AND pm.user_id = auth.uid() AND pm.role = 'admin')
    )
  )
);

-- 5. Update Asymmetric RLS for sections
DROP POLICY IF EXISTS "Asymmetric SELECT sections" ON sections;
CREATE POLICY "Asymmetric SELECT sections" ON sections FOR SELECT TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = sections.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric INSERT sections" ON sections;
CREATE POLICY "Asymmetric INSERT sections" ON sections FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = sections.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE sections" ON sections;
CREATE POLICY "Asymmetric UPDATE sections" ON sections FOR UPDATE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = sections.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric DELETE sections" ON sections;
CREATE POLICY "Asymmetric DELETE sections" ON sections FOR DELETE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = sections.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

-- 6. Update Asymmetric RLS for tasks
DROP POLICY IF EXISTS "Asymmetric SELECT tasks" ON tasks;
CREATE POLICY "Asymmetric SELECT tasks" ON tasks FOR SELECT TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric INSERT tasks" ON tasks;
CREATE POLICY "Asymmetric INSERT tasks" ON tasks FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE tasks" ON tasks;
CREATE POLICY "Asymmetric UPDATE tasks" ON tasks FOR UPDATE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric DELETE tasks" ON tasks;
CREATE POLICY "Asymmetric DELETE tasks" ON tasks FOR DELETE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = tasks.project_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

-- 7. Update Asymmetric RLS for comments
DROP POLICY IF EXISTS "Asymmetric SELECT comments" ON comments;
CREATE POLICY "Asymmetric SELECT comments" ON comments FOR SELECT TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = comments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric INSERT comments" ON comments;
CREATE POLICY "Asymmetric INSERT comments" ON comments FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = comments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('viewer', 'editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE comments" ON comments;
CREATE POLICY "Asymmetric UPDATE comments" ON comments FOR UPDATE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND user_id = auth.uid() -- only update own comments if restricted
  )
);

DROP POLICY IF EXISTS "Asymmetric DELETE comments" ON comments;
CREATE POLICY "Asymmetric DELETE comments" ON comments FOR DELETE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND user_id = auth.uid() -- only delete own comments if restricted
  )
);

-- 8. Update Asymmetric RLS for attachments
DROP POLICY IF EXISTS "Asymmetric SELECT attachments" ON attachments;
CREATE POLICY "Asymmetric SELECT attachments" ON attachments FOR SELECT TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = attachments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric INSERT attachments" ON attachments;
CREATE POLICY "Asymmetric INSERT attachments" ON attachments FOR INSERT TO authenticated
WITH CHECK (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = attachments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE attachments" ON attachments;
CREATE POLICY "Asymmetric UPDATE attachments" ON attachments FOR UPDATE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = attachments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);

DROP POLICY IF EXISTS "Asymmetric DELETE attachments" ON attachments;
CREATE POLICY "Asymmetric DELETE attachments" ON attachments FOR DELETE TO authenticated
USING (
  workspace_id = ANY(auth_admin_workspace_ids())
  OR (
    workspace_id = ANY(auth_member_workspace_ids()) AND EXISTS (
      SELECT 1 FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = attachments.task_id AND (
        p.owner_id = auth.uid() OR
        EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role IN ('editor', 'admin'))
      )
    )
  )
);
