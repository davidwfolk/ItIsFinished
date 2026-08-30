CREATE OR REPLACE FUNCTION handle_new_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    INSERT INTO workspaces (name, is_personal) 
    VALUES ('Personal', true) 
    RETURNING id INTO new_workspace_id;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If the auto-provisioning fails for any reason (e.g. constraints), 
    -- do not crash the auth.users signup transaction. 
    -- The user can use the client-side 'Create Default Workspace' fallback button.
    RAISE WARNING 'Failed to create workspace for new user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
