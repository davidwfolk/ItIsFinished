-- Migration: 20260905000002_fix_pg_catalog_trim_everywhere.sql
-- Replaces invalid pg_catalog.trim() with standard trim()

CREATE OR REPLACE FUNCTION public.admin_set_profile_tier(
    target_user_id UUID,
    requested_tier TEXT,
    reason TEXT,
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    _admin_id UUID;
    _profile RECORD;
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

    -- Idempotency check: if request_id already processed, return existing outcome
    IF request_id IS NOT NULL THEN
        SELECT id, after_state INTO _existing_audit
        FROM public.admin_audit_logs
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_set_profile_tier.request_id;

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
    IF requested_tier NOT IN ('free', 'pro') THEN
        RAISE EXCEPTION 'Invalid tier: %. Allowed tiers: free, pro', requested_tier USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Lock and retrieve profile
    SELECT id, email, entitlement_tier, entitlement_source, entitlement_override_expires_at
    INTO _profile
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF _profile.id IS NULL THEN
        RAISE EXCEPTION 'Profile with ID % not found', target_user_id USING ERRCODE = 'P0002';
    END IF;

    _before_state := pg_catalog.jsonb_build_object(
        'entitlement_tier', _profile.entitlement_tier,
        'entitlement_source', _profile.entitlement_source,
        'entitlement_override_expires_at', _profile.entitlement_override_expires_at
    );

    -- Apply mutation
    UPDATE public.profiles
    SET entitlement_tier = requested_tier,
        entitlement_source = 'admin_override',
        entitlement_updated_at = pg_catalog.now()
    WHERE id = target_user_id;

    _after_state := pg_catalog.jsonb_build_object(
        'entitlement_tier', requested_tier,
        'entitlement_source', 'admin_override',
        'entitlement_override_expires_at', NULL
    );

    -- Atomic audit insert
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, request_id, reason, before_state, after_state
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'profile.tier_changed', 'profile', target_user_id, admin_set_profile_tier.request_id, admin_set_profile_tier.reason, _before_state, _after_state
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_workspace_status(
    workspace_id UUID,
    requested_status TEXT,
    reason TEXT,
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    _admin_id UUID;
    _ws RECORD;
    _before_state JSONB;
    _after_state JSONB;
    _audit_id UUID;
    _existing_audit RECORD;
    _is_valid_transition BOOLEAN := false;
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_set_workspace_status.request_id;

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
    IF requested_status NOT IN ('active', 'locked', 'suspended', 'archived') THEN
        RAISE EXCEPTION 'Invalid status: %. Allowed: active, locked, suspended, archived', requested_status USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Lock and retrieve workspace
    SELECT id, name, workspace_status, workspace_status_changed_at, workspace_status_changed_by, workspace_status_reason
    INTO _ws
    FROM public.workspaces
    WHERE id = workspace_id
    FOR UPDATE;

    IF _ws.id IS NULL THEN
        RAISE EXCEPTION 'Workspace with ID % not found', workspace_id USING ERRCODE = 'P0002';
    END IF;

    -- Transition validation matrix:
    IF _ws.workspace_status = requested_status THEN
        RAISE EXCEPTION 'Workspace is already in % status', requested_status USING ERRCODE = '22023';
    END IF;

    IF _ws.workspace_status = 'active' AND requested_status IN ('locked', 'suspended', 'archived') THEN
        _is_valid_transition := true;
    ELSIF _ws.workspace_status = 'locked' AND requested_status IN ('active', 'suspended', 'archived') THEN
        _is_valid_transition := true;
    ELSIF _ws.workspace_status = 'suspended' AND requested_status IN ('active', 'archived') THEN
        _is_valid_transition := true;
    ELSIF _ws.workspace_status = 'archived' AND requested_status = 'active' THEN
        _is_valid_transition := true;
    END IF;

    IF NOT _is_valid_transition THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', _ws.workspace_status, requested_status USING ERRCODE = '22023';
    END IF;

    _before_state := pg_catalog.jsonb_build_object(
        'workspace_status', _ws.workspace_status,
        'workspace_status_changed_at', _ws.workspace_status_changed_at,
        'workspace_status_reason', _ws.workspace_status_reason
    );

    -- Apply update
    UPDATE public.workspaces
    SET workspace_status = requested_status,
        workspace_status_changed_at = pg_catalog.now(),
        workspace_status_changed_by = _admin_id,
        workspace_status_reason = reason
    WHERE id = workspace_id;

    _after_state := pg_catalog.jsonb_build_object(
        'workspace_status', requested_status,
        'workspace_status_changed_at', pg_catalog.now(),
        'workspace_status_reason', reason
    );

    -- Atomic audit insert
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.status_changed', 'workspace', workspace_id, workspace_id, admin_set_workspace_status.request_id, admin_set_workspace_status.reason, _before_state, _after_state
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_transfer_workspace_ownership(
    workspace_id UUID,
    new_owner_user_id UUID,
    reason TEXT,
    previous_owner_resulting_role TEXT DEFAULT 'admin',
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    _admin_id UUID;
    _ws RECORD;
    _new_owner_membership RECORD;
    _old_owners RECORD;
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_transfer_workspace_ownership.request_id;

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
    IF previous_owner_resulting_role NOT IN ('admin', 'member') THEN
        RAISE EXCEPTION 'Invalid previous_owner_resulting_role: %. Allowed: admin, member', previous_owner_resulting_role USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
        RAISE EXCEPTION 'Reason is required and cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Lock and retrieve workspace
    SELECT id, name, is_personal
    INTO _ws
    FROM public.workspaces
    WHERE id = workspace_id
    FOR UPDATE;

    IF _ws.id IS NULL THEN
        RAISE EXCEPTION 'Workspace with ID % not found', workspace_id USING ERRCODE = 'P0002';
    END IF;

    IF _ws.is_personal IS TRUE THEN
        RAISE EXCEPTION 'Cannot transfer ownership of a personal workspace' USING ERRCODE = '22023';
    END IF;

    -- Verify target user is an existing member of this workspace
    SELECT id, user_id, role
    INTO _new_owner_membership
    FROM public.workspace_members
    WHERE workspace_id = admin_transfer_workspace_ownership.workspace_id
      AND user_id = new_owner_user_id
    FOR UPDATE;

    IF _new_owner_membership.id IS NULL THEN
        RAISE EXCEPTION 'Target user % is not a member of this workspace', new_owner_user_id USING ERRCODE = 'P0002';
    END IF;

    IF _new_owner_membership.role = 'owner' THEN
        -- Check if they are already the sole owner
        IF (SELECT COUNT(*) FROM public.workspace_members WHERE workspace_id = admin_transfer_workspace_ownership.workspace_id AND role = 'owner') = 1 THEN
            RAISE EXCEPTION 'Target user % is already the sole owner of this workspace', new_owner_user_id USING ERRCODE = '22023';
        END IF;
    END IF;

    -- Record snapshot of current owners
    SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('user_id', user_id, 'role', role))
    INTO _before_state
    FROM public.workspace_members
    WHERE workspace_id = admin_transfer_workspace_ownership.workspace_id
      AND role = 'owner';

    -- STEP 1: Promote new owner first (so invariant is satisfied throughout transaction)
    UPDATE public.workspace_members
    SET role = 'owner',
        updated_at = pg_catalog.now()
    WHERE id = _new_owner_membership.id;

    -- STEP 2: Demote previous owner(s) to previous_owner_resulting_role
    UPDATE public.workspace_members
    SET role = previous_owner_resulting_role,
        updated_at = pg_catalog.now()
    WHERE workspace_id = admin_transfer_workspace_ownership.workspace_id
      AND role = 'owner'
      AND user_id <> new_owner_user_id;

    -- Snapshot after state
    SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('user_id', user_id, 'role', role))
    INTO _after_state
    FROM public.workspace_members
    WHERE workspace_id = admin_transfer_workspace_ownership.workspace_id
      AND role IN ('owner', previous_owner_resulting_role);

    -- Atomic audit insert
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id, workspace_id, request_id, reason, before_state, after_state, metadata
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'workspace.ownership_transferred', 'workspace', admin_transfer_workspace_ownership.workspace_id, admin_transfer_workspace_ownership.workspace_id, admin_transfer_workspace_ownership.request_id, admin_transfer_workspace_ownership.reason, _before_state, _after_state,
        pg_catalog.jsonb_build_object('new_owner_user_id', new_owner_user_id, 'previous_owner_resulting_role', previous_owner_resulting_role)
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'idempotent', false,
        'audit_id', _audit_id,
        'data', _after_state
    );
END;
$$;

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
#variable_conflict use_variable
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_set_workspace_tier.request_id;

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

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
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
#variable_conflict use_variable
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_add_workspace_member.request_id;

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

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
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
#variable_conflict use_variable
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_remove_workspace_member.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
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
#variable_conflict use_variable
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

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
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
#variable_conflict use_variable
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
        WHERE admin_id = _admin_id AND public.admin_audit_logs.request_id = admin_delete_business_workspace.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF stakeholder_contact IS NULL OR pg_catalog.length(trim(stakeholder_contact)) = 0 THEN
        RAISE EXCEPTION 'Verified stakeholder contact verification details are required' USING ERRCODE = '22023';
    END IF;

    IF reason IS NULL OR pg_catalog.length(trim(reason)) = 0 THEN
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

