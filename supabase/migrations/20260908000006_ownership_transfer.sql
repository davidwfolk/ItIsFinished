-- 1. Create table for ownership transfer requests
CREATE TABLE IF NOT EXISTS ownership_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX one_pending_transfer_per_workspace 
ON ownership_transfer_requests(workspace_id) 
WHERE status = 'pending';


CREATE TRIGGER set_ownership_transfer_updated_at
    BEFORE UPDATE ON ownership_transfer_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for transfer requests
ALTER TABLE ownership_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Workspace members can view pending transfers for the workspace
CREATE POLICY "Members can view transfers" ON ownership_transfer_requests FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = ownership_transfer_requests.workspace_id 
    AND workspace_members.user_id = auth.uid()
));

-- 2. Request Ownership Transfer RPC
CREATE OR REPLACE FUNCTION request_ownership_transfer(p_workspace_id UUID, p_to_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_is_personal BOOLEAN;
    v_request_id UUID;
BEGIN
    -- Verify caller is the current single owner
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = p_workspace_id 
        AND user_id = auth.uid() 
        AND role = 'owner'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Only the current owner can transfer ownership.';
    END IF;

    -- Verify workspace is not personal
    SELECT is_personal INTO v_is_personal FROM workspaces WHERE id = p_workspace_id;
    IF v_is_personal THEN
        RAISE EXCEPTION 'Cannot transfer ownership of a personal workspace.';
    END IF;

    -- Verify target user is an active member or admin
    IF NOT EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = p_workspace_id 
        AND user_id = p_to_user_id
    ) THEN
        RAISE EXCEPTION 'Target user must be a member of the workspace.';
    END IF;

    -- Invalidate any existing pending requests for this workspace
    UPDATE ownership_transfer_requests 
    SET status = 'expired' 
    WHERE workspace_id = p_workspace_id AND status = 'pending';

    -- Create new request
    INSERT INTO ownership_transfer_requests (workspace_id, from_user_id, to_user_id)
    VALUES (p_workspace_id, auth.uid(), p_to_user_id)
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Accept Ownership Transfer RPC
CREATE OR REPLACE FUNCTION accept_ownership_transfer(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request RECORD;
    v_target_tier TEXT;
    v_target_workspace_count INT;
BEGIN
    -- Get request
    SELECT * INTO v_request FROM ownership_transfer_requests WHERE id = p_request_id;

    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request is no longer pending.';
    END IF;

    IF v_request.to_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Only the designated recipient can accept this transfer.';
    END IF;

    -- Verify target is a Pro user
    SELECT entitlement_tier INTO v_target_tier FROM profiles WHERE id = auth.uid();
    IF coalesce(v_target_tier, 'free') != 'pro' THEN
        RAISE EXCEPTION 'Pro subscription required to accept workspace ownership.';
    END IF;

    -- Verify max workspaces (Pro limit is 3)
    SELECT COUNT(*) INTO v_target_workspace_count 
    FROM workspace_members 
    WHERE user_id = auth.uid() AND role = 'owner';

    IF v_target_workspace_count >= 3 THEN
        RAISE EXCEPTION 'You have reached the maximum number of owned workspaces (3).';
    END IF;

    -- Atomic swap inside a transaction (plpgsql functions inherently run in a transaction)
    
    -- 1. Temporarily drop the 1-owner constraint if we rely on deferred? 
    -- Actually, to avoid constraint violation during swap, we can set original owner to admin FIRST, then new owner.
    
    UPDATE workspace_members 
    SET role = 'admin' 
    WHERE workspace_id = v_request.workspace_id AND user_id = v_request.from_user_id AND role = 'owner';

    UPDATE workspace_members 
    SET role = 'owner' 
    WHERE workspace_id = v_request.workspace_id AND user_id = auth.uid();

    -- Mark request accepted
    UPDATE ownership_transfer_requests 
    SET status = 'accepted' 
    WHERE id = p_request_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Decline/Cancel RPC
CREATE OR REPLACE FUNCTION cancel_ownership_transfer(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
    v_request RECORD;
BEGIN
    SELECT * INTO v_request FROM ownership_transfer_requests WHERE id = p_request_id;
    
    IF v_request IS NULL OR v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Invalid request.';
    END IF;

    -- Caller must be sender (cancel) or recipient (decline)
    IF auth.uid() = v_request.from_user_id THEN
        UPDATE ownership_transfer_requests SET status = 'expired' WHERE id = p_request_id;
    ELSIF auth.uid() = v_request.to_user_id THEN
        UPDATE ownership_transfer_requests SET status = 'rejected' WHERE id = p_request_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized to modify this request.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
