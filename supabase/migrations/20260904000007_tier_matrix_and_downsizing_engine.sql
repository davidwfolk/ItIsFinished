-- ==============================================================================
-- Migration: 20260904000007_tier_matrix_and_downsizing_engine.sql
-- Description: Dynamic Tier Matrix, Grandfathering Engine, Downgrade Grace &
--              Emergency 15-Minute Wrap-Up Pass, and Forced Downsizing RPCs.
-- ==============================================================================

-- 1. TIER CONFIGURATIONS TABLE
CREATE TABLE IF NOT EXISTS public.tier_configurations (
    tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'pro', 'business', 'enterprise')),
    max_workspaces INTEGER NOT NULL DEFAULT 1,
    max_collaborators_per_workspace INTEGER NOT NULL DEFAULT 1,
    max_projects_per_workspace INTEGER NOT NULL DEFAULT 1, -- -1 = unlimited
    max_saved_filters INTEGER NOT NULL DEFAULT 1,          -- -1 = unlimited
    storage_limit_mb INTEGER NOT NULL DEFAULT 500,
    max_file_size_mb INTEGER NOT NULL DEFAULT 5,
    history_retention_days INTEGER NOT NULL DEFAULT 30,    -- -1 = unlimited
    has_time_blocking BOOLEAN NOT NULL DEFAULT false,
    has_eisenhower_matrix BOOLEAN NOT NULL DEFAULT false,
    has_focus_engine BOOLEAN NOT NULL DEFAULT true,        -- Independent Checkbox
    has_daily_habits BOOLEAN NOT NULL DEFAULT true,        -- Independent Checkbox
    has_weekly_review BOOLEAN NOT NULL DEFAULT false,
    has_workspace_aggregate_stats BOOLEAN NOT NULL DEFAULT true,
    has_per_member_breakdown BOOLEAN NOT NULL DEFAULT false,
    can_export_data BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed initial tiers (Free starts with all limits at 1)
INSERT INTO public.tier_configurations (
    tier, max_workspaces, max_collaborators_per_workspace, max_projects_per_workspace,
    max_saved_filters, storage_limit_mb, max_file_size_mb, history_retention_days,
    has_time_blocking, has_eisenhower_matrix, has_focus_engine, has_daily_habits,
    has_weekly_review, has_workspace_aggregate_stats, has_per_member_breakdown, can_export_data
) VALUES
('free', 1, 1, 1, 1, 500, 5, 30, false, false, true, true, false, true, false, false),
('pro', 3, 5, -1, -1, 10240, 50, -1, true, true, true, true, true, true, false, true),
('business', 15, 25, -1, -1, 51200, 200, -1, true, true, true, true, true, true, true, true),
('enterprise', 999, 999, -1, -1, 512000, 1000, -1, true, true, true, true, true, true, true, true)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.tier_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tier configurations" ON public.tier_configurations;
CREATE POLICY "Anyone can view tier configurations"
ON public.tier_configurations
FOR SELECT
TO authenticated, anon
USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.tier_configurations FROM public, anon, authenticated;

-- 2. PROFILE GRANDFATHERING & VIP COLUMNS
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS grandfathered_plan_version TEXT DEFAULT 'v1_early_adopter',
ADD COLUMN IF NOT EXISTS grandfathered_limits JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS vip_custom_perks JSONB DEFAULT NULL;

-- Backfill profiles with default Free limits
UPDATE public.profiles
SET grandfathered_limits = pg_catalog.jsonb_build_object(
    'max_workspaces', 1,
    'max_collaborators_per_workspace', 1,
    'max_projects_per_workspace', 1,
    'max_saved_filters', 1,
    'has_focus_engine', true,
    'has_daily_habits', true,
    'has_workspace_aggregate_stats', true
)
WHERE grandfathered_limits IS NULL;

-- Trigger to stamp new user profiles
CREATE OR REPLACE FUNCTION public.stamp_profile_early_adopter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _free_config RECORD;
BEGIN
    SELECT * INTO _free_config
    FROM public.tier_configurations
    WHERE tier = 'free';

    IF NEW.grandfathered_limits IS NULL THEN
        NEW.is_early_adopter := true;
        NEW.grandfathered_plan_version := 'v1_early_adopter';
        NEW.grandfathered_limits := pg_catalog.jsonb_build_object(
            'max_workspaces', COALESCE(_free_config.max_workspaces, 1),
            'max_collaborators_per_workspace', COALESCE(_free_config.max_collaborators_per_workspace, 1),
            'max_projects_per_workspace', COALESCE(_free_config.max_projects_per_workspace, 1),
            'max_saved_filters', COALESCE(_free_config.max_saved_filters, 1),
            'has_focus_engine', COALESCE(_free_config.has_focus_engine, true),
            'has_daily_habits', COALESCE(_free_config.has_daily_habits, true),
            'has_workspace_aggregate_stats', COALESCE(_free_config.has_workspace_aggregate_stats, true)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_profile_early_adopter ON public.profiles;
CREATE TRIGGER trg_stamp_profile_early_adopter
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.stamp_profile_early_adopter();

-- 3. WORKSPACE DOWNGRADE & EMERGENCY COLUMNS
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS downgrade_grace_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS downgrade_emergency_used BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS downgrade_emergency_expires_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS downgrade_status TEXT NOT NULL DEFAULT 'ok'
    CHECK (downgrade_status IN ('ok', 'in_grace_period', 'emergency_wrap_up', 'resolution_required'));

-- 4. PRIVILEGED RPC: admin_update_tier_config
CREATE OR REPLACE FUNCTION public.admin_update_tier_config(
    target_tier TEXT,
    max_workspaces INTEGER,
    max_collaborators_per_workspace INTEGER,
    max_projects_per_workspace INTEGER,
    max_saved_filters INTEGER,
    storage_limit_mb INTEGER,
    max_file_size_mb INTEGER,
    history_retention_days INTEGER,
    has_time_blocking BOOLEAN,
    has_eisenhower_matrix BOOLEAN,
    has_focus_engine BOOLEAN,
    has_daily_habits BOOLEAN,
    has_weekly_review BOOLEAN,
    has_workspace_aggregate_stats BOOLEAN,
    has_per_member_breakdown BOOLEAN,
    can_export_data BOOLEAN,
    apply_globally BOOLEAN DEFAULT false,
    reason TEXT DEFAULT 'Tier configuration updated by superadmin',
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _admin_id UUID;
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
        WHERE admin_id = _admin_id AND request_id = admin_update_tier_config.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    IF target_tier NOT IN ('free', 'pro', 'business', 'enterprise') THEN
        RAISE EXCEPTION 'Invalid tier: %', target_tier USING ERRCODE = '22023';
    END IF;

    -- Snapshot before state
    SELECT pg_catalog.to_jsonb(tc.*) INTO _before_state
    FROM public.tier_configurations tc
    WHERE tc.tier = target_tier;

    -- Update tier_configurations
    UPDATE public.tier_configurations
    SET max_workspaces = admin_update_tier_config.max_workspaces,
        max_collaborators_per_workspace = admin_update_tier_config.max_collaborators_per_workspace,
        max_projects_per_workspace = admin_update_tier_config.max_projects_per_workspace,
        max_saved_filters = admin_update_tier_config.max_saved_filters,
        storage_limit_mb = admin_update_tier_config.storage_limit_mb,
        max_file_size_mb = admin_update_tier_config.max_file_size_mb,
        history_retention_days = admin_update_tier_config.history_retention_days,
        has_time_blocking = admin_update_tier_config.has_time_blocking,
        has_eisenhower_matrix = admin_update_tier_config.has_eisenhower_matrix,
        has_focus_engine = admin_update_tier_config.has_focus_engine,
        has_daily_habits = admin_update_tier_config.has_daily_habits,
        has_weekly_review = admin_update_tier_config.has_weekly_review,
        has_workspace_aggregate_stats = admin_update_tier_config.has_workspace_aggregate_stats,
        has_per_member_breakdown = admin_update_tier_config.has_per_member_breakdown,
        can_export_data = admin_update_tier_config.can_export_data,
        updated_at = pg_catalog.now(),
        updated_by = _admin_id
    WHERE tier = target_tier;

    -- If apply_globally requested, override grandfathered limits for existing users
    IF apply_globally AND target_tier = 'free' THEN
        UPDATE public.profiles
        SET grandfathered_limits = pg_catalog.jsonb_build_object(
            'max_workspaces', admin_update_tier_config.max_workspaces,
            'max_collaborators_per_workspace', admin_update_tier_config.max_collaborators_per_workspace,
            'max_projects_per_workspace', admin_update_tier_config.max_projects_per_workspace,
            'max_saved_filters', admin_update_tier_config.max_saved_filters,
            'has_focus_engine', admin_update_tier_config.has_focus_engine,
            'has_daily_habits', admin_update_tier_config.has_daily_habits,
            'has_workspace_aggregate_stats', admin_update_tier_config.has_workspace_aggregate_stats
        );
    END IF;

    -- Snapshot after state
    SELECT pg_catalog.to_jsonb(tc.*) INTO _after_state
    FROM public.tier_configurations tc
    WHERE tc.tier = target_tier;

    -- Audit log
    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id,
        workspace_id, request_id, reason, before_state, after_state, metadata
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'tier_config_update',
        'tier_configuration', NULL, NULL, request_id, reason,
        _before_state, _after_state,
        pg_catalog.jsonb_build_object('apply_globally', apply_globally, 'tier', target_tier)
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'audit_id', _audit_id,
        'tier', target_tier,
        'apply_globally', apply_globally,
        'data', _after_state
    );
END;
$$;

-- 5. PRIVILEGED RPC: admin_set_user_badges
CREATE OR REPLACE FUNCTION public.admin_set_user_badges(
    target_user_id UUID,
    is_early_adopter BOOLEAN,
    is_vip BOOLEAN,
    vip_custom_perks JSONB DEFAULT NULL,
    reason TEXT DEFAULT 'User badges and VIP perks updated',
    request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

    IF request_id IS NOT NULL THEN
        SELECT id, after_state INTO _existing_audit
        FROM public.admin_audit_logs
        WHERE admin_id = _admin_id AND request_id = admin_set_user_badges.request_id;

        IF _existing_audit.id IS NOT NULL THEN
            RETURN pg_catalog.jsonb_build_object(
                'success', true,
                'idempotent', true,
                'audit_id', _existing_audit.id,
                'data', _existing_audit.after_state
            );
        END IF;
    END IF;

    SELECT id, email, is_early_adopter, is_vip, vip_custom_perks
    INTO _profile
    FROM public.profiles
    WHERE id = target_user_id
    FOR UPDATE;

    IF _profile.id IS NULL THEN
        RAISE EXCEPTION 'Profile with ID % not found', target_user_id USING ERRCODE = 'P0002';
    END IF;

    _before_state := pg_catalog.jsonb_build_object(
        'is_early_adopter', _profile.is_early_adopter,
        'is_vip', _profile.is_vip,
        'vip_custom_perks', _profile.vip_custom_perks
    );

    UPDATE public.profiles
    SET is_early_adopter = admin_set_user_badges.is_early_adopter,
        is_vip = admin_set_user_badges.is_vip,
        vip_custom_perks = admin_set_user_badges.vip_custom_perks
    WHERE id = target_user_id;

    _after_state := pg_catalog.jsonb_build_object(
        'is_early_adopter', admin_set_user_badges.is_early_adopter,
        'is_vip', admin_set_user_badges.is_vip,
        'vip_custom_perks', admin_set_user_badges.vip_custom_perks
    );

    _audit_id := pg_catalog.gen_random_uuid();
    INSERT INTO public.admin_audit_logs (
        id, created_at, admin_id, action, target_type, target_id,
        workspace_id, request_id, reason, before_state, after_state, metadata
    ) VALUES (
        _audit_id, pg_catalog.now(), _admin_id, 'user_badges_update',
        'profile', target_user_id, NULL, request_id, reason,
        _before_state, _after_state,
        pg_catalog.jsonb_build_object('target_email', _profile.email)
    );

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'audit_id', _audit_id,
        'user_id', target_user_id,
        'data', _after_state
    );
END;
$$;

-- 6. USER RPC: start_downgrade_emergency_wrap_up
CREATE OR REPLACE FUNCTION public.start_downgrade_emergency_wrap_up(
    target_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _caller_id UUID;
    _workspace RECORD;
    _expires_at TIMESTAMPTZ;
BEGIN
    _caller_id := auth.uid();
    IF _caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    SELECT id, downgrade_emergency_used, downgrade_status
    INTO _workspace
    FROM public.workspaces
    WHERE id = target_workspace_id
    FOR UPDATE;

    IF _workspace.id IS NULL THEN
        RAISE EXCEPTION 'Workspace not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT private.user_is_workspace_owner(target_workspace_id, _caller_id) THEN
        RAISE EXCEPTION 'Only workspace owners can request emergency wrap-up' USING ERRCODE = '42501';
    END IF;

    IF _workspace.downgrade_emergency_used THEN
        RAISE EXCEPTION 'The 15-minute emergency wrap-up pass has already been used for this workspace' USING ERRCODE = '22000';
    END IF;

    _expires_at := pg_catalog.now() + INTERVAL '15 minutes';

    UPDATE public.workspaces
    SET downgrade_emergency_used = true,
        downgrade_emergency_expires_at = _expires_at,
        downgrade_status = 'emergency_wrap_up',
        updated_at = pg_catalog.now()
    WHERE id = target_workspace_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'emergency_expires_at', _expires_at
    );
END;
$$;

-- 7. USER RPC: execute_workspace_downsizing
CREATE OR REPLACE FUNCTION public.execute_workspace_downsizing(
    primary_workspace_id UUID,
    kept_project_id UUID DEFAULT NULL,
    kept_collaborator_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _caller_id UUID;
    _workspace RECORD;
BEGIN
    _caller_id := auth.uid();
    IF _caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    SELECT id, downgrade_status
    INTO _workspace
    FROM public.workspaces
    WHERE id = primary_workspace_id
    FOR UPDATE;

    IF _workspace.id IS NULL THEN
        RAISE EXCEPTION 'Primary workspace not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT private.user_is_workspace_owner(primary_workspace_id, _caller_id) THEN
        RAISE EXCEPTION 'Only the workspace owner can downsize the workspace' USING ERRCODE = '42501';
    END IF;

    -- 1. Archive other active projects in primary workspace
    IF kept_project_id IS NOT NULL THEN
        UPDATE public.projects
        SET is_archived = true,
            updated_at = pg_catalog.now()
        WHERE workspace_id = primary_workspace_id
          AND id != kept_project_id
          AND is_archived = false;
    END IF;

    -- 2. Remove other collaborators in primary workspace (except owner and kept collaborator)
    DELETE FROM public.workspace_members
    WHERE workspace_id = primary_workspace_id
      AND user_id != _caller_id
      AND (kept_collaborator_id IS NULL OR user_id != kept_collaborator_id);

    -- 3. Decommission other workspaces owned by caller
    UPDATE public.workspaces
    SET workspace_status = 'archived',
        workspace_status_reason = 'Decommissioned during Free tier downsizing',
        workspace_status_changed_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE id IN (
        SELECT wm.workspace_id
        FROM public.workspace_members wm
        WHERE wm.user_id = _caller_id
          AND wm.role = 'owner'
          AND wm.workspace_id != primary_workspace_id
    );

    -- 4. Reset downgrade state on primary workspace
    UPDATE public.workspaces
    SET downgrade_status = 'ok',
        downgrade_grace_expires_at = NULL,
        downgrade_emergency_expires_at = NULL,
        updated_at = pg_catalog.now()
    WHERE id = primary_workspace_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'message', 'Workspace successfully downsized to Free tier specifications.'
    );
END;
$$;

-- 8. PERMISSIONS & GRANTS
REVOKE ALL ON FUNCTION public.start_downgrade_emergency_wrap_up(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_downgrade_emergency_wrap_up(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.execute_workspace_downsizing(UUID, UUID, UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.execute_workspace_downsizing(UUID, UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_update_tier_config(
    TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, TEXT, UUID
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tier_config(
    TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
    BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN,
    BOOLEAN, TEXT, UUID
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_badges(
    UUID, BOOLEAN, BOOLEAN, JSONB, TEXT, UUID
) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_badges(
    UUID, BOOLEAN, BOOLEAN, JSONB, TEXT, UUID
) TO authenticated;
