-- ==============================================================================
-- Migration: 20260905000000_fix_grandfathered_limits_keys.sql
-- Description: Add missing keys to grandfathered_limits in admin RPCs and triggers,
--              and backfill existing profiles to contain all limit keys.
-- ==============================================================================

-- 1. Update the admin RPC
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

    SELECT pg_catalog.to_jsonb(tc.*) INTO _before_state
    FROM public.tier_configurations tc
    WHERE tc.tier = target_tier;

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

    IF apply_globally AND target_tier = 'free' THEN
        UPDATE public.profiles
        SET grandfathered_limits = pg_catalog.jsonb_build_object(
            'max_workspaces', admin_update_tier_config.max_workspaces,
            'max_collaborators_per_workspace', admin_update_tier_config.max_collaborators_per_workspace,
            'max_projects_per_workspace', admin_update_tier_config.max_projects_per_workspace,
            'max_saved_filters', admin_update_tier_config.max_saved_filters,
            'storage_limit_mb', admin_update_tier_config.storage_limit_mb,
            'max_file_size_mb', admin_update_tier_config.max_file_size_mb,
            'history_retention_days', admin_update_tier_config.history_retention_days,
            'has_time_blocking', admin_update_tier_config.has_time_blocking,
            'has_eisenhower_matrix', admin_update_tier_config.has_eisenhower_matrix,
            'has_focus_engine', admin_update_tier_config.has_focus_engine,
            'has_daily_habits', admin_update_tier_config.has_daily_habits,
            'has_weekly_review', admin_update_tier_config.has_weekly_review,
            'has_workspace_aggregate_stats', admin_update_tier_config.has_workspace_aggregate_stats,
            'has_per_member_breakdown', admin_update_tier_config.has_per_member_breakdown,
            'can_export_data', admin_update_tier_config.can_export_data
        )
        WHERE profiles.id IS NOT NULL;
    END IF;

    SELECT pg_catalog.to_jsonb(tc.*) INTO _after_state
    FROM public.tier_configurations tc
    WHERE tc.tier = target_tier;

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

-- 2. Update the profile stamp trigger
CREATE OR REPLACE FUNCTION public.stamp_profile_early_adopter()
RETURNS TRIGGER AS $$
DECLARE
    _free_config RECORD;
BEGIN
    SELECT * INTO _free_config FROM public.tier_configurations WHERE tier = 'free';

    -- If this is a new signup during the early adopter window
    IF (SELECT count(*) FROM profiles) < 10000 THEN
        NEW.is_early_adopter = true;
        NEW.grandfathered_plan_version = 'v1_early_adopter';
        
        -- Stamp all current Free tier limits dynamically
        IF _free_config.tier IS NOT NULL THEN
            NEW.grandfathered_limits = pg_catalog.jsonb_build_object(
                'max_workspaces', _free_config.max_workspaces,
                'max_collaborators_per_workspace', _free_config.max_collaborators_per_workspace,
                'max_projects_per_workspace', _free_config.max_projects_per_workspace,
                'max_saved_filters', _free_config.max_saved_filters,
                'storage_limit_mb', _free_config.storage_limit_mb,
                'max_file_size_mb', _free_config.max_file_size_mb,
                'history_retention_days', _free_config.history_retention_days,
                'has_time_blocking', _free_config.has_time_blocking,
                'has_eisenhower_matrix', _free_config.has_eisenhower_matrix,
                'has_focus_engine', _free_config.has_focus_engine,
                'has_daily_habits', _free_config.has_daily_habits,
                'has_weekly_review', _free_config.has_weekly_review,
                'has_workspace_aggregate_stats', _free_config.has_workspace_aggregate_stats,
                'has_per_member_breakdown', _free_config.has_per_member_breakdown,
                'can_export_data', _free_config.can_export_data
            );
        ELSE
            -- Fallback defaults if table is empty
            NEW.grandfathered_limits = pg_catalog.jsonb_build_object(
                'max_workspaces', 1,
                'max_collaborators_per_workspace', 1,
                'max_projects_per_workspace', 1,
                'max_saved_filters', 1,
                'storage_limit_mb', 100,
                'max_file_size_mb', 5,
                'history_retention_days', 30,
                'has_time_blocking', false,
                'has_eisenhower_matrix', false,
                'has_focus_engine', true,
                'has_daily_habits', true,
                'has_weekly_review', false,
                'has_workspace_aggregate_stats', false,
                'has_per_member_breakdown', false,
                'can_export_data', false
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill existing profiles using the current Free tier config so they have all keys
DO $$
DECLARE
    _free_config RECORD;
BEGIN
    SELECT * INTO _free_config FROM public.tier_configurations WHERE tier = 'free';

    IF _free_config.tier IS NOT NULL THEN
        UPDATE public.profiles
        SET grandfathered_limits = pg_catalog.jsonb_build_object(
            'max_workspaces', COALESCE((grandfathered_limits->>'max_workspaces')::int, _free_config.max_workspaces),
            'max_collaborators_per_workspace', COALESCE((grandfathered_limits->>'max_collaborators_per_workspace')::int, _free_config.max_collaborators_per_workspace),
            'max_projects_per_workspace', COALESCE((grandfathered_limits->>'max_projects_per_workspace')::int, _free_config.max_projects_per_workspace),
            'max_saved_filters', COALESCE((grandfathered_limits->>'max_saved_filters')::int, _free_config.max_saved_filters),
            'storage_limit_mb', COALESCE((grandfathered_limits->>'storage_limit_mb')::int, _free_config.storage_limit_mb),
            'max_file_size_mb', COALESCE((grandfathered_limits->>'max_file_size_mb')::int, _free_config.max_file_size_mb),
            'history_retention_days', COALESCE((grandfathered_limits->>'history_retention_days')::int, _free_config.history_retention_days),
            'has_time_blocking', COALESCE((grandfathered_limits->>'has_time_blocking')::boolean, _free_config.has_time_blocking),
            'has_eisenhower_matrix', COALESCE((grandfathered_limits->>'has_eisenhower_matrix')::boolean, _free_config.has_eisenhower_matrix),
            'has_focus_engine', COALESCE((grandfathered_limits->>'has_focus_engine')::boolean, _free_config.has_focus_engine),
            'has_daily_habits', COALESCE((grandfathered_limits->>'has_daily_habits')::boolean, _free_config.has_daily_habits),
            'has_weekly_review', COALESCE((grandfathered_limits->>'has_weekly_review')::boolean, _free_config.has_weekly_review),
            'has_workspace_aggregate_stats', COALESCE((grandfathered_limits->>'has_workspace_aggregate_stats')::boolean, _free_config.has_workspace_aggregate_stats),
            'has_per_member_breakdown', COALESCE((grandfathered_limits->>'has_per_member_breakdown')::boolean, _free_config.has_per_member_breakdown),
            'can_export_data', COALESCE((grandfathered_limits->>'can_export_data')::boolean, _free_config.can_export_data)
        )
        WHERE profiles.id IS NOT NULL;
    END IF;
END;
$$;
