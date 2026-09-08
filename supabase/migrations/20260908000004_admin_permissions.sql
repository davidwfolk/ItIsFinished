-- 1. Redefine invite_user_to_workspace to restrict Admin inviter powers
CREATE OR REPLACE FUNCTION invite_user_to_workspace(p_workspace_id UUID, p_email TEXT, p_role TEXT)
RETURNS UUID AS $$
DECLARE
    v_invite_id UUID;
    v_inviter_role TEXT;
BEGIN
    -- Validate inviter has Admin or Owner privileges
    SELECT role INTO v_inviter_role 
    FROM workspace_members 
    WHERE workspace_id = p_workspace_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin');

    IF v_inviter_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Only admins and owners can invite users.';
    END IF;

    -- Admins can only invite members
    IF v_inviter_role = 'admin' AND p_role IN ('admin', 'owner') THEN
        RAISE EXCEPTION 'Unauthorized: Admins can only invite users with the member role.';
    END IF;

    -- Insert the invite (Triggers Database Webhook asynchronously)
    INSERT INTO workspace_invites (workspace_id, email, role, invited_by)
    VALUES (p_workspace_id, p_email, p_role, auth.uid())
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update workspace_members RLS to restrict Admin management powers
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;

CREATE POLICY "Owners and Admins can manage members"
ON workspace_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members AS wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND (
      wm.role = 'owner' 
      OR (wm.role = 'admin' AND workspace_members.role = 'member')
    )
  )
);
