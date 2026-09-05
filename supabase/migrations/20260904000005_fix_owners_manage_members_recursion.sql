-- ==============================================================================
-- FIX RECURSION CAUSED BY "Owners can manage members" (FOR ALL) ON workspace_members
-- ==============================================================================

-- 1. Helper function to check if a user is an owner of a workspace
CREATE OR REPLACE FUNCTION private.user_is_workspace_owner(_ws_id UUID, _u_id UUID)
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
          AND role = 'owner'
    );
END;
$$;

REVOKE ALL ON FUNCTION private.user_is_workspace_owner(UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.user_is_workspace_owner(UUID, UUID) TO authenticated;

-- 2. Drop the problematic "FOR ALL" policy on workspace_members
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;

-- 3. Re-create separated UPDATE and DELETE policies for owners without contaminating SELECT
CREATE POLICY "Owners can update members"
ON public.workspace_members
FOR UPDATE
TO authenticated
USING (
    private.is_super_admin()
    OR private.user_is_workspace_owner(workspace_id, auth.uid())
);

CREATE POLICY "Owners can delete members"
ON public.workspace_members
FOR DELETE
TO authenticated
USING (
    private.is_super_admin()
    OR private.user_is_workspace_owner(workspace_id, auth.uid())
);

-- 4. Clean up "Owners can update their workspaces" on public.workspaces to also use the security definer helper
DROP POLICY IF EXISTS "Owners can update their workspaces" ON public.workspaces;
CREATE POLICY "Owners and superadmins can update workspaces"
ON public.workspaces
FOR UPDATE
TO authenticated
USING (
    private.is_super_admin()
    OR private.user_is_workspace_owner(id, auth.uid())
);
