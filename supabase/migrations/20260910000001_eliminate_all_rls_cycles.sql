-- ==============================================================================
-- COMPREHENSIVE FIX: Eliminate all projects ↔ project_members RLS cycles
-- ==============================================================================
-- The root issue: policies on projects, tasks, sections, comments, and
-- attachments all contain inline `EXISTS (SELECT 1 FROM project_members ...)`
-- subqueries. When PostgreSQL's rewriter applies RLS to these, it expands the
-- project_members SELECT policy, which references projects, whose SELECT
-- policy references project_members again → 42P17 infinite recursion.
--
-- Fix: Move ALL cross-table project/project_members checks into SECURITY
-- DEFINER functions. These bypass RLS on their internal queries, breaking
-- every possible cycle.
-- ==============================================================================

-- 1. SECURITY DEFINER helpers
-- "Can this user view this project?" (owner OR any member)
CREATE OR REPLACE FUNCTION private.user_is_project_participant(_p_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = _p_id AND owner_id = _u_id
    ) OR EXISTS (
        SELECT 1 FROM public.project_members WHERE project_id = _p_id AND user_id = _u_id
    );
END;
$$;

-- "Can this user edit this project?" (owner OR editor/admin member)
CREATE OR REPLACE FUNCTION private.user_is_project_editor(_p_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = _p_id AND owner_id = _u_id
    ) OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = _p_id AND user_id = _u_id AND role IN ('editor', 'admin')
    );
END;
$$;

-- "Can this user admin this project?" (owner OR admin member)
CREATE OR REPLACE FUNCTION private.user_is_project_admin(_p_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = _p_id AND owner_id = _u_id
    ) OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = _p_id AND user_id = _u_id AND role = 'admin'
    );
END;
$$;

-- "Can this user view content via a task?" (resolves task → project → check)
CREATE OR REPLACE FUNCTION private.user_can_access_via_task(_task_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id = _task_id AND (
            p.owner_id = _u_id OR
            EXISTS (SELECT 1 FROM public.project_members WHERE project_id = p.id AND user_id = _u_id)
        )
    );
END;
$$;

-- "Can this user edit content via a task?" (resolves task → project → editor check)
CREATE OR REPLACE FUNCTION private.user_can_edit_via_task(_task_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id = _task_id AND (
            p.owner_id = _u_id OR
            EXISTS (SELECT 1 FROM public.project_members
                    WHERE project_id = p.id AND user_id = _u_id AND role IN ('editor', 'admin'))
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION private.user_is_project_participant(UUID, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION private.user_is_project_editor(UUID, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION private.user_is_project_admin(UUID, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION private.user_can_access_via_task(UUID, UUID) FROM public, anon;
REVOKE ALL ON FUNCTION private.user_can_edit_via_task(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.user_is_project_participant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_is_project_editor(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_is_project_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_can_access_via_task(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_can_edit_via_task(UUID, UUID) TO authenticated;


-- ==============================================================================
-- 2. REWRITE project_members SELECT (the original offender)
-- ==============================================================================
DROP POLICY IF EXISTS "Members viewable by project participants" ON public.project_members;
CREATE POLICY "Members viewable by project participants" ON public.project_members
FOR SELECT TO authenticated
USING (private.user_is_project_participant(project_id, auth.uid()));


-- ==============================================================================
-- 3. REWRITE projects policies (remove inline project_members subqueries)
-- ==============================================================================
DROP POLICY IF EXISTS "Asymmetric SELECT projects" ON public.projects;
CREATE POLICY "Asymmetric SELECT projects" ON public.projects FOR SELECT TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_participant(id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric INSERT projects" ON public.projects;
CREATE POLICY "Asymmetric INSERT projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (workspace_id = ANY(auth_member_workspace_ids()) AND owner_id = auth.uid())
);

DROP POLICY IF EXISTS "Asymmetric UPDATE projects" ON public.projects;
CREATE POLICY "Asymmetric UPDATE projects" ON public.projects FOR UPDATE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric DELETE projects" ON public.projects;
CREATE POLICY "Asymmetric DELETE projects" ON public.projects FOR DELETE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_admin(id, auth.uid())
    )
);


-- ==============================================================================
-- 4. REWRITE sections policies
-- ==============================================================================
DROP POLICY IF EXISTS "Asymmetric SELECT sections" ON public.sections;
CREATE POLICY "Asymmetric SELECT sections" ON public.sections FOR SELECT TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_participant(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric INSERT sections" ON public.sections;
CREATE POLICY "Asymmetric INSERT sections" ON public.sections FOR INSERT TO authenticated
WITH CHECK (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE sections" ON public.sections;
CREATE POLICY "Asymmetric UPDATE sections" ON public.sections FOR UPDATE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric DELETE sections" ON public.sections;
CREATE POLICY "Asymmetric DELETE sections" ON public.sections FOR DELETE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);


-- ==============================================================================
-- 5. REWRITE tasks policies
-- ==============================================================================
DROP POLICY IF EXISTS "Asymmetric SELECT tasks" ON public.tasks;
CREATE POLICY "Asymmetric SELECT tasks" ON public.tasks FOR SELECT TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_participant(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric INSERT tasks" ON public.tasks;
CREATE POLICY "Asymmetric INSERT tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE tasks" ON public.tasks;
CREATE POLICY "Asymmetric UPDATE tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric DELETE tasks" ON public.tasks;
CREATE POLICY "Asymmetric DELETE tasks" ON public.tasks FOR DELETE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_is_project_editor(project_id, auth.uid())
    )
);


-- ==============================================================================
-- 6. REWRITE comments policies
-- ==============================================================================
DROP POLICY IF EXISTS "Asymmetric SELECT comments" ON public.comments;
CREATE POLICY "Asymmetric SELECT comments" ON public.comments FOR SELECT TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_access_via_task(task_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric INSERT comments" ON public.comments;
CREATE POLICY "Asymmetric INSERT comments" ON public.comments FOR INSERT TO authenticated
WITH CHECK (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_access_via_task(task_id, auth.uid())
    )
);

-- UPDATE and DELETE for comments use user_id = auth.uid() (own comments only) — no cross-table refs, leave as-is


-- ==============================================================================
-- 7. REWRITE attachments policies
-- ==============================================================================
DROP POLICY IF EXISTS "Asymmetric SELECT attachments" ON public.attachments;
CREATE POLICY "Asymmetric SELECT attachments" ON public.attachments FOR SELECT TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_access_via_task(task_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric INSERT attachments" ON public.attachments;
CREATE POLICY "Asymmetric INSERT attachments" ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_edit_via_task(task_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric UPDATE attachments" ON public.attachments;
CREATE POLICY "Asymmetric UPDATE attachments" ON public.attachments FOR UPDATE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_edit_via_task(task_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Asymmetric DELETE attachments" ON public.attachments;
CREATE POLICY "Asymmetric DELETE attachments" ON public.attachments FOR DELETE TO authenticated
USING (
    workspace_id = ANY(auth_admin_workspace_ids())
    OR (
        workspace_id = ANY(auth_member_workspace_ids())
        AND private.user_can_edit_via_task(task_id, auth.uid())
    )
);
