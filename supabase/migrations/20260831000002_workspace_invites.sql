-- 1. Create workspace_invites table with State Machine
CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    token UUID DEFAULT gen_random_uuid(),
    email_status TEXT DEFAULT 'pending' CHECK (email_status IN ('pending', 'sent', 'failed')),
    invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, email)
);

-- Enable RLS on invites
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- Only users in the workspace can view invites
CREATE POLICY "View workspace invites" ON workspace_invites FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_invites.workspace_id 
    AND workspace_members.user_id = auth.uid()
));

-- 2. Create the SECURITY DEFINER RPC to safely insert invites
CREATE OR REPLACE FUNCTION invite_user_to_workspace(p_workspace_id UUID, p_email TEXT, p_role TEXT)
RETURNS UUID AS $$
DECLARE
    v_invite_id UUID;
BEGIN
    -- Validate inviter has Admin or Owner privileges
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = p_workspace_id 
        AND user_id = auth.uid() 
        AND role IN ('owner', 'admin')
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins and owners can invite users.';
    END IF;

    -- Insert the invite (Triggers Database Webhook asynchronously)
    INSERT INTO workspace_invites (workspace_id, email, role, invited_by)
    VALUES (p_workspace_id, p_email, p_role, auth.uid())
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Trigger to process invites on new user signup
CREATE OR REPLACE FUNCTION process_workspace_invites_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    invite_rec RECORD;
BEGIN
    -- Find all pending invites for this email
    FOR invite_rec IN SELECT * FROM workspace_invites WHERE email = NEW.email LOOP
        -- Insert into workspace_members safely
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (invite_rec.workspace_id, NEW.id, invite_rec.role)
        ON CONFLICT (workspace_id, user_id) DO NOTHING;

        -- Delete the processed invite
        DELETE FROM workspace_invites WHERE id = invite_rec.id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hook into auth.users (Runs alongside the original profile creation trigger)
DROP TRIGGER IF EXISTS on_auth_user_created_process_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_process_invites
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION process_workspace_invites_on_signup();
