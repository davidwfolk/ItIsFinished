-- The Auto-Provisioning Trigger Function
-- MUST be SECURITY DEFINER to temporarily elevate privileges to bypass RLS on workspace_members
CREATE OR REPLACE FUNCTION process_workspace_invites_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    invite_rec RECORD;
BEGIN
    -- Find all pending invites for this email
    FOR invite_rec IN SELECT * FROM workspace_invites WHERE email = NEW.email LOOP
        -- Insert into workspace_members safely (RLS bypassed because of SECURITY DEFINER)
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (invite_rec.workspace_id, NEW.id, invite_rec.role)
        ON CONFLICT (workspace_id, user_id) DO NOTHING;

        -- Delete the processed invite
        DELETE FROM workspace_invites WHERE id = invite_rec.id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger (dropping if it already exists)
DROP TRIGGER IF EXISTS on_auth_user_created_process_invites ON auth.users;
CREATE TRIGGER on_auth_user_created_process_invites
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION process_workspace_invites_on_signup();
