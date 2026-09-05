-- ==============================================================================
-- STANDARDIZE WORKSPACE TIERS TO: free, pro, business, enterprise
-- ==============================================================================

-- 1. Drop old constraint first so we can update existing rows to 'free'
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_workspace_tier_check;

-- 2. Migrate legacy tier names ('personal', 'free_team') to 'free'
UPDATE public.workspaces
SET workspace_tier = 'free'
WHERE workspace_tier IN ('personal', 'free_team');

-- 3. Add the new standardized constraint (free, pro, business, enterprise)
ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_workspace_tier_check
    CHECK (workspace_tier IN ('free', 'pro', 'business', 'enterprise'));

ALTER TABLE public.workspaces
    ALTER COLUMN workspace_tier SET DEFAULT 'free';

-- 4. Update admin_set_workspace_tier RPC to accept the standardized 4 tiers
CREATE OR REPLACE FUNCTION public.admin_set_workspace_tier(
    workspace_id UUID,
    requested_tier TEXT,
    requested_max_seats INT,
    reason TEXT,
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _admin_id UUID;
    _ws RECORD;
    _before_state JSONB;
    _after_state JSONB;
    _audit_id UUID;
    _existing_audit RECORD;
BEGIN
    _admin_id := auth.uid();
    IF _admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    IF NOT private.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Superadmin access required' USING ERRCODE = '42501';
    END IF;

    -- Idempotency check
    IF request_id IS NOT NULL THEN
        SELECT id, after_state INTO _existing_audit
        FROM public.admin_audit_logs
        WHERE admin_id = _admin_id AND request_id = admin_set_workspace_tier.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    -- Validate parameters: free, pro, business, enterprise
    IF requested_tier NOT IN ('free', 'pro', 'business', 'enterprise') THEN
        RAISE EXCEPTION 'Invalid workspace tier: %. Allowed: free, pro, business, enterprise', requested_tier USING ERRCODE = '22023';
    END IF;

    IF requested_max_seats < 1 THEN
        RAISE EXCEPTION 'max_seats must be at least 1' USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(pg_catalog.trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Lock workspace
    SELECT id, name, is_personal, workspace_tier, max_seats
    INTO _ws
    FROM public.workspaces
    WHERE id = workspace_id
    FOR UPDATE;

    IF _ws.id IS NULL THEN
        RAISE EXCEPTION 'Workspace % not found', workspace_id USING ERRCODE = 'P0002';
    END IF;

    _before_state := pg_catalog.jsonb_build_object(
        'workspace_tier', _ws.workspace_tier,
        'max_seats', _ws.max_seats
    );

    UPDATE public.workspaces
    SET workspace_tier = requested_tier,
        max_seats = requested_max_seats,
        updated_at = pg_catalog.now()
    WHERE id = workspace_id;

    _after_state := pg_catalog.jsonb_build_object(
        'workspace_tier', requested_tier,
        'max_seats', requested_max_seats
    );

    -- Audit log
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.tier_changed', 'workspace', workspace_id, workspace_id, request_id, reason, _before_state, _after_state
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_workspace_tier(UUID, TEXT, INT, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_workspace_tier(UUID, TEXT, INT, TEXT, UUID) TO authenticated;
