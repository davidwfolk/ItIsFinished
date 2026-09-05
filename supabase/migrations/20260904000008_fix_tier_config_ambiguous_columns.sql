-- ==============================================================================
-- Migration: 20260904000008_fix_tier_config_ambiguous_columns.sql
-- Description: Disambiguate request_id and reason in admin_update_tier_config
--              and admin_set_user_badges RPCs.
-- ==============================================================================

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
#variable_conflict use_variable
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

    -- Idempotency check with explicit disambiguation
    IF admin_update_tier_config.request_id IS NOT NULL THEN
        SELECT a.id, a.after_state INTO _existing_audit
        FROM public.admin_audit_logs a
        WHERE a.admin_id = _admin_id AND a.request_id = admin_update_tier_config.request_id;

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
    WHERE tier_configurations.tier = target_tier;

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
        'tier_configuration', NULL, NULL,
        admin_update_tier_config.request_id,
        admin_update_tier_config.reason,
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

    IF admin_set_user_badges.request_id IS NOT NULL THEN
        SELECT a.id, a.after_state INTO _existing_audit
        FROM public.admin_audit_logs a
        WHERE a.admin_id = _admin_id AND a.request_id = admin_set_user_badges.request_id;

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
    WHERE profiles.id = target_user_id
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
    WHERE profiles.id = target_user_id;

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
        'profile', target_user_id, NULL,
        admin_set_user_badges.request_id,
        admin_set_user_badges.reason,
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
