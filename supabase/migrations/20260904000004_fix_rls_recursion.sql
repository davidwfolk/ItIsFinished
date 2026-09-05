-- ==============================================================================
-- FIX RLS RECURSION ON workspace_members & workspaces
-- ==============================================================================

-- 1. Create a security definer helper to check workspace membership without RLS recursion.
-- Because it runs as postgres (security definer), it bypasses RLS during the subquery.
CREATE OR REPLACE FUNCTION private.user_belongs_to_workspace(_ws_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
    IF _ws_id IS NULL OR _u_id IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = _ws_id
          AND user_id = _u_id
    );
END;
$$;

REVOKE ALL ON FUNCTION private.user_belongs_to_workspace(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.user_belongs_to_workspace(UUID, UUID) TO authenticated;

-- 2. Replace the recursive policy on public.workspace_members
DROP POLICY IF EXISTS "Users and superadmins can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;

CREATE POLICY "Users and superadmins can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
    OR user_id = auth.uid()
    OR private.user_belongs_to_workspace(workspace_id, auth.uid())
);

-- 3. Replace the policy on public.workspaces
DROP POLICY IF EXISTS "Users and superadmins can view workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;

CREATE POLICY "Users and superadmins can view workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
    OR (
        workspace_status <> 'suspended'
        AND private.user_belongs_to_workspace(id, auth.uid())
    )
);
