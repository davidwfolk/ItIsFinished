-- ==============================================================================
-- 1. WORKSPACE TIER & SEAT ALLOCATION
-- ==============================================================================
ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS workspace_tier TEXT NOT NULL DEFAULT 'personal'
        CHECK (workspace_tier IN ('personal', 'free_team', 'business', 'enterprise')),
    ADD COLUMN IF NOT EXISTS max_seats INT NOT NULL DEFAULT 5
        CHECK (max_seats > 0);

-- Automatically set non-personal workspaces to 'business' by default if they were 'personal'
UPDATE public.workspaces
SET workspace_tier = 'business'
WHERE is_personal IS FALSE AND workspace_tier = 'personal';

CREATE INDEX IF NOT EXISTS idx_workspaces_tier ON public.workspaces (workspace_tier);

-- ==============================================================================
-- 2. BUSINESS WORKSPACE DELETION GUARD TRIGGER
-- Only active superadmins can delete a business workspace.
-- No organization member (even an owner) can delete a business workspace.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_business_workspace_deletion_guard()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleting a non-personal (business) workspace, verify superadmin authorization
    IF OLD.is_personal IS FALSE THEN
        IF NOT private.is_super_admin() THEN
            RAISE EXCEPTION 'Business workspaces cannot be deleted by organization members. Contact support to initiate organization decommissioning.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_workspace_deletion_guard ON public.workspaces;
CREATE TRIGGER trg_business_workspace_deletion_guard
    BEFORE DELETE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_business_workspace_deletion_guard();

-- ==============================================================================
-- 3. ADMIN RPC: admin_set_workspace_tier
-- ==============================================================================
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

    -- Validate parameters
    IF requested_tier NOT IN ('personal', 'free_team', 'business', 'enterprise') THEN
        RAISE EXCEPTION 'Invalid workspace tier: %', requested_tier USING ERRCODE = '22023';
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

-- ==============================================================================
-- 4. ADMIN RPC: admin_add_workspace_member
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_add_workspace_member(
    workspace_id UUID,
    user_id UUID,
    role TEXT,
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
    _profile RECORD;
    _audit_id UUID;
    _existing_audit RECORD;
    _after_state JSONB;
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
        WHERE admin_id = _admin_id AND request_id = admin_add_workspace_member.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF role NOT IN ('owner', 'admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role: %. Allowed: owner, admin, member', role USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(pg_catalog.trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Verify workspace exists
    SELECT id, name, is_personal INTO _ws FROM public.workspaces WHERE id = workspace_id;
    IF _ws.id IS NULL THEN
        RAISE EXCEPTION 'Workspace % not found', workspace_id USING ERRCODE = 'P0002';
    END IF;

    -- Verify user profile exists
    SELECT id, email INTO _profile FROM public.profiles WHERE id = admin_add_workspace_member.user_id;
    IF _profile.id IS NULL THEN
        RAISE EXCEPTION 'User profile % not found', user_id USING ERRCODE = 'P0002';
    END IF;

    -- Insert or update membership
    INSERT INTO public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
    VALUES (workspace_id, user_id, role, pg_catalog.now(), pg_catalog.now())
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET role = EXCLUDED.role, updated_at = pg_catalog.now();

    _after_state := pg_catalog.jsonb_build_object(
        'workspace_id', workspace_id,
        'user_id', user_id,
        'role', role,
        'email', _profile.email
    );

    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state, metadata
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.member_added', 'workspace_member', user_id, workspace_id, request_id, reason, NULL, _after_state,
        pg_catalog.jsonb_build_object('role', role, 'email', _profile.email)
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_add_workspace_member(UUID, UUID, TEXT, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_workspace_member(UUID, UUID, TEXT, TEXT, UUID) TO authenticated;

-- ==============================================================================
-- 5. ADMIN RPC: admin_remove_workspace_member
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_remove_workspace_member(
    workspace_id UUID,
    user_id UUID,
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
    _membership RECORD;
    _audit_id UUID;
    _existing_audit RECORD;
    _before_state JSONB;
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
        WHERE admin_id = _admin_id AND request_id = admin_remove_workspace_member.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF reason IS NULL OR pg_catalog.length(pg_catalog.trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    SELECT id, role INTO _membership
    FROM public.workspace_members
    WHERE workspace_id = admin_remove_workspace_member.workspace_id
      AND user_id = admin_remove_workspace_member.user_id;

    IF _membership.id IS NULL THEN
        RAISE EXCEPTION 'Member % not found in workspace %', user_id, workspace_id USING ERRCODE = 'P0002';
    END IF;

    _before_state := pg_catalog.jsonb_build_object(
        'workspace_id', workspace_id,
        'user_id', user_id,
        'role', _membership.role
    );

    -- Delete membership (Trigger trg_enforce_workspace_owner_invariant will automatically block if last owner)
    DELETE FROM public.workspace_members
    WHERE workspace_id = admin_remove_workspace_member.workspace_id
      AND user_id = admin_remove_workspace_member.user_id;

    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.member_removed', 'workspace_member', user_id, workspace_id, request_id, reason, _before_state, NULL
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _before_state
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_workspace_member(UUID, UUID, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_workspace_member(UUID, UUID, TEXT, UUID) TO authenticated;

-- ==============================================================================
-- 6. ADMIN RPC: admin_set_workspace_member_role
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_set_workspace_member_role(
    workspace_id UUID,
    user_id UUID,
    new_role TEXT,
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
    _membership RECORD;
    _audit_id UUID;
    _existing_audit RECORD;
    _before_state JSONB;
    _after_state JSONB;
BEGIN
    _admin_id := auth.uid();
    IF _admin_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    IF NOT private.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Superadmin access required' USING ERRCODE = '42501';
    END IF;

    IF new_role NOT IN ('owner', 'admin', 'member') THEN
        RAISE EXCEPTION 'Invalid role: %. Allowed: owner, admin, member', new_role USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(pg_catalog.trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    SELECT id, role INTO _membership
    FROM public.workspace_members
    WHERE workspace_id = admin_set_workspace_member_role.workspace_id
      AND user_id = admin_set_workspace_member_role.user_id;

    IF _membership.id IS NULL THEN
        RAISE EXCEPTION 'Member % not found in workspace %', user_id, workspace_id USING ERRCODE = 'P0002';
    END IF;

    IF _membership.role = new_role THEN
        RAISE EXCEPTION 'Member already has role %', new_role USING ERRCODE = '22023';
    END IF;

    _before_state := pg_catalog.jsonb_build_object('role', _membership.role);

    -- Update role (owner invariant trigger will fire if demoting last owner!)
    UPDATE public.workspace_members
    SET role = new_role, updated_at = pg_catalog.now()
    WHERE id = _membership.id;

    _after_state := pg_catalog.jsonb_build_object('role', new_role);

    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.member_role_changed', 'workspace_member', user_id, workspace_id, request_id, reason, _before_state, _after_state
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_workspace_member_role(UUID, UUID, TEXT, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_workspace_member_role(UUID, UUID, TEXT, TEXT, UUID) TO authenticated;

-- ==============================================================================
-- 7. ADMIN RPC: admin_delete_business_workspace (Decommissioning Gauntlet)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_business_workspace(
    workspace_id UUID,
    stakeholder_contact TEXT,
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
    _audit_id UUID;
    _existing_audit RECORD;
    _before_state JSONB;
    _member_count INT;
    _project_count INT;
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
        WHERE admin_id = _admin_id AND request_id = admin_delete_business_workspace.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF stakeholder_contact IS NULL OR pg_catalog.length(pg_catalog.trim(stakeholder_contact)) = 0 THEN
        RAISE EXCEPTION 'Verified stakeholder contact verification details are required' USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(pg_catalog.trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Administrative reason is required' USING ERRCODE = '22023';
    END IF;

    -- Lock and retrieve workspace
    SELECT id, name, is_personal, workspace_tier, workspace_status
    INTO _ws
    FROM public.workspaces
    WHERE id = workspace_id
    FOR UPDATE;

    IF _ws.id IS NULL THEN
        RAISE EXCEPTION 'Workspace % not found', workspace_id USING ERRCODE = 'P0002';
    END IF;

    SELECT COUNT(*) INTO _member_count FROM public.workspace_members WHERE workspace_id = admin_delete_business_workspace.workspace_id;
    SELECT COUNT(*) INTO _project_count FROM public.projects WHERE workspace_id = admin_delete_business_workspace.workspace_id;

    _before_state := pg_catalog.jsonb_build_object(
        'workspace_id', _ws.id,
        'name', _ws.name,
        'is_personal', _ws.is_personal,
        'workspace_tier', _ws.workspace_tier,
        'workspace_status', _ws.workspace_status,
        'member_count', _member_count,
        'project_count', _project_count,
        'stakeholder_contact', stakeholder_contact
    );

    -- Delete the workspace (Cascade will drop members, projects, tasks)
    -- Trigger trg_business_workspace_deletion_guard allows it because private.is_super_admin() is TRUE!
    DELETE FROM public.workspaces WHERE id = workspace_id;

    -- Write immutable audit record
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state, metadata
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.decommissioned', 'workspace', workspace_id, workspace_id, request_id, reason, _before_state, NULL,
        pg_catalog.jsonb_build_object('stakeholder_contact', stakeholder_contact)
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _before_state
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_business_workspace(UUID, TEXT, TEXT, UUID) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_business_workspace(UUID, TEXT, TEXT, UUID) TO authenticated;
