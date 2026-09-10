-- Fix infinite recursion in workspace_members and projects policies

-- 1. FIX workspace_members RECURSION
-- Drop the recursive FOR ALL policy and other overlapping policies
DROP POLICY IF EXISTS "Owners and Admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can delete members" ON public.workspace_members;

-- Create a SECURITY DEFINER function to evaluate if a user can manage a workspace member
-- This avoids recursion because it bypasses RLS during the role check subquery
CREATE OR REPLACE FUNCTION private.can_manage_workspace_member(_ws_id UUID, _u_id UUID, _target_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    _inviter_role TEXT;
BEGIN
    -- Super admins can do anything
    IF private.is_super_admin() THEN
        RETURN true;
    END IF;

    -- Get the role of the user trying to perform the action
    SELECT role INTO _inviter_role
    FROM public.workspace_members
    WHERE workspace_id = _ws_id AND user_id = _u_id;

    -- Owners can manage anyone
    IF _inviter_role = 'owner' THEN
        RETURN true;
    -- Admins can only manage members (not other admins or owners)
    ELSIF _inviter_role = 'admin' AND _target_role = 'member' THEN
        RETURN true;
    ELSE
        RETURN false;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION private.can_manage_workspace_member(UUID, UUID, TEXT) TO authenticated;

-- Replace with specific non-recursive policies
CREATE POLICY "Owners, Admins and Superadmins can insert members" 
ON public.workspace_members FOR INSERT TO authenticated
WITH CHECK (private.can_manage_workspace_member(workspace_id, auth.uid(), role));

CREATE POLICY "Owners, Admins and Superadmins can update members" 
ON public.workspace_members FOR UPDATE TO authenticated
USING (private.can_manage_workspace_member(workspace_id, auth.uid(), role))
WITH CHECK (private.can_manage_workspace_member(workspace_id, auth.uid(), role));

CREATE POLICY "Owners, Admins and Superadmins can delete members" 
ON public.workspace_members FOR DELETE TO authenticated
USING (private.can_manage_workspace_member(workspace_id, auth.uid(), role));


-- 2. FIX project_members RECURSION
-- Drop the recursive FOR ALL policy on project_members
DROP POLICY IF EXISTS "Project admins and owners can manage members" ON public.project_members;

-- Create a SECURITY DEFINER function to evaluate if a user can manage project members
-- This avoids the recursive chain: project_members ALL -> projects SELECT -> project_members SELECT -> project_members ALL
CREATE OR REPLACE FUNCTION private.user_can_manage_project_members(_p_id UUID, _u_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
    IF private.is_super_admin() THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM public.projects WHERE id = _p_id AND owner_id = _u_id
    ) OR EXISTS (
        SELECT 1 FROM public.project_members WHERE project_id = _p_id AND user_id = _u_id AND role = 'admin'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION private.user_can_manage_project_members(UUID, UUID) TO authenticated;

-- Replace with specific non-recursive policies
CREATE POLICY "Project admins and owners can insert members" 
ON public.project_members FOR INSERT TO authenticated
WITH CHECK (private.user_can_manage_project_members(project_id, auth.uid()));

CREATE POLICY "Project admins and owners can update members" 
ON public.project_members FOR UPDATE TO authenticated
USING (private.user_can_manage_project_members(project_id, auth.uid()))
WITH CHECK (private.user_can_manage_project_members(project_id, auth.uid()));

CREATE POLICY "Project admins and owners can delete members" 
ON public.project_members FOR DELETE TO authenticated
USING (private.user_can_manage_project_members(project_id, auth.uid()));
