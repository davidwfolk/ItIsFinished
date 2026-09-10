-- ==============================================================================
-- FIX: RLS Infinite Recursion on projects / project_members
-- ==============================================================================
-- Root cause: The "Members viewable by project participants" SELECT policy on
-- project_members (created in 20260828000000_initial_schema.sql) was never
-- dropped or replaced. It calls is_project_member(), which queries `projects`,
-- whose policies query back into `project_members` — creating a 2-hop cycle
-- that PostgreSQL's recursion detector catches as 42P17.
--
-- Fix: Replace the policy with one backed by a SECURITY DEFINER function that
-- bypasses RLS on its internal queries, breaking the cycle.
-- ==============================================================================

-- 1. Create SECURITY DEFINER helper to check project membership without RLS
CREATE OR REPLACE FUNCTION private.user_can_view_project_member(
    _project_id UUID, _u_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = _project_id AND owner_id = _u_id
    ) OR EXISTS (
        SELECT 1 FROM public.project_members
        WHERE project_id = _project_id AND user_id = _u_id
    );
END;
$$;

REVOKE ALL ON FUNCTION private.user_can_view_project_member(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.user_can_view_project_member(UUID, UUID) TO authenticated;

-- 2. Drop the recursive policy and replace it
DROP POLICY IF EXISTS "Members viewable by project participants" ON public.project_members;

CREATE POLICY "Members viewable by project participants" ON public.project_members
FOR SELECT TO authenticated
USING (private.user_can_view_project_member(project_id, auth.uid()));
