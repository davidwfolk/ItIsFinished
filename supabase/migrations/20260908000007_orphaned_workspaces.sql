-- 1. Add Orphaned fields to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS workspace_status TEXT DEFAULT 'active' CHECK (workspace_status IN ('active', 'orphaned', 'suspended'));
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMPTZ;

-- 2. Trigger to orphan workspace if the single owner is deleted/leaves
CREATE OR REPLACE FUNCTION handle_owner_leave()
RETURNS TRIGGER AS $$
BEGIN
    -- If the user being removed was the owner
    IF OLD.role = 'owner' THEN
        -- We must check if the workspace is being deleted entirely, 
        -- but if this trigger fires, it means the workspace is still there.
        UPDATE workspaces 
        SET workspace_status = 'orphaned', orphaned_at = NOW()
        WHERE id = OLD.workspace_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_owner_leave
    AFTER DELETE ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION handle_owner_leave();

-- 3. RPC for Downsizing Wizard
CREATE OR REPLACE FUNCTION downgrade_excess_workspaces(p_keep_workspace_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify caller owns the workspace they want to keep
    IF p_keep_workspace_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = p_keep_workspace_id AND user_id = auth.uid() AND role = 'owner'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: You do not own the workspace you requested to keep.';
        END IF;
    END IF;

    -- Orphan all OTHER workspaces owned by the user
    UPDATE workspaces
    SET workspace_status = 'orphaned', orphaned_at = NOW()
    WHERE id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND (p_keep_workspace_id IS NULL OR id != p_keep_workspace_id);

    -- The user profile should be marked as free tier (if handled here, or done separately in billing webhook)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Sweep function to physically delete workspaces orphaned > 45 days
-- This can be called via pg_cron or an edge function periodically.
CREATE OR REPLACE FUNCTION sweep_orphaned_workspaces()
RETURNS VOID AS $$
BEGIN
    DELETE FROM workspaces
    WHERE workspace_status = 'orphaned' 
    AND orphaned_at < NOW() - INTERVAL '45 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
