CREATE OR REPLACE FUNCTION public.invite_user_to_workspace(p_workspace_id UUID, p_email TEXT, p_role TEXT)
RETURNS UUID AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Validate email format (basic regex check)
    IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;

    -- Validate inviter has Admin or Owner privileges
    IF NOT EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins and owners can invite users.';
    END IF;

    -- Insert the invite (Triggers Database Webhook asynchronously)
    INSERT INTO public.workspace_invites (workspace_id, email, role, invited_by)
    VALUES (p_workspace_id, LOWER(TRIM(p_email)), p_role, auth.uid())
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
