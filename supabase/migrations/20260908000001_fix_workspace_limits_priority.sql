-- Migration: 20260908000001_fix_workspace_limits_priority.sql
-- Description: Prioritize Pro tier limits over early adopter grandfathered limits.

-- 1. Privileged RPC: create_user_workspace
CREATE OR REPLACE FUNCTION public.create_user_workspace(
    workspace_name TEXT,
    is_personal_workspace BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    _user_id UUID;
    _profile RECORD;
    _max_workspaces INT := 1;
    _base_limit INT := 1;
    _current_workspaces INT := 0;
    _new_workspace_id UUID;
    _now TIMESTAMPTZ := pg_catalog.now();
BEGIN
    _user_id := auth.uid();
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
    END IF;

    IF workspace_name IS NULL OR pg_catalog.length(trim(workspace_name)) = 0 THEN
        RAISE EXCEPTION 'Workspace name cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- Retrieve user profile
    SELECT id, entitlement_tier, is_early_adopter, is_vip, grandfathered_limits, vip_custom_perks
    INTO _profile
    FROM public.profiles
    WHERE id = _user_id;

    -- Determine effective max_workspaces
    IF _profile.is_vip IS TRUE AND _profile.vip_custom_perks IS NOT NULL AND (_profile.vip_custom_perks->>'max_workspaces') IS NOT NULL THEN
        _max_workspaces := (_profile.vip_custom_perks->>'max_workspaces')::int;
    ELSE
        -- Base limit from entitlement tier
        IF _profile.entitlement_tier = 'pro' THEN
            SELECT max_workspaces INTO _base_limit FROM public.tier_configurations WHERE tier = 'pro';
            IF _base_limit IS NULL THEN _base_limit := 3; END IF;
        ELSE
            SELECT max_workspaces INTO _base_limit FROM public.tier_configurations WHERE tier = 'free';
            IF _base_limit IS NULL THEN _base_limit := 1; END IF;
        END IF;

        -- Early adopter override only if greater than base limit
        IF _profile.is_early_adopter IS TRUE AND _profile.grandfathered_limits IS NOT NULL AND (_profile.grandfathered_limits->>'max_workspaces') IS NOT NULL THEN
            IF (_profile.grandfathered_limits->>'max_workspaces')::int > _base_limit THEN
                _max_workspaces := (_profile.grandfathered_limits->>'max_workspaces')::int;
            ELSE
                _max_workspaces := _base_limit;
            END IF;
        ELSE
            _max_workspaces := _base_limit;
        END IF;
    END IF;

    -- Count active workspaces currently owned or joined
    SELECT pg_catalog.count(DISTINCT wm.workspace_id) INTO _current_workspaces
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = _user_id
      AND w.deleted_at IS NULL;

    -- Enforce limits unless unlimited (-1 or >= 999)
    IF _max_workspaces <> -1 AND _max_workspaces < 999 AND _current_workspaces >= _max_workspaces THEN
        RAISE EXCEPTION 'Workspace limit reached (% allowed on your current plan)', _max_workspaces USING ERRCODE = 'P0001';
    END IF;

    -- Create workspace
    _new_workspace_id := pg_catalog.gen_random_uuid();

    INSERT INTO public.workspaces (
        id, name, is_personal, workspace_tier, max_seats, workspace_status, created_at, updated_at
    ) VALUES (
        _new_workspace_id,
        trim(workspace_name),
        is_personal_workspace,
        CASE WHEN _profile.entitlement_tier = 'pro' THEN 'pro' ELSE 'free' END,
        CASE WHEN _profile.entitlement_tier = 'pro' THEN 5 ELSE 1 END,
        'active',
        _now,
        _now
    );

    -- Add creator as owner
    INSERT INTO public.workspace_members (
        id, workspace_id, user_id, role, created_at, updated_at
    ) VALUES (
        pg_catalog.gen_random_uuid(),
        _new_workspace_id,
        _user_id,
        'owner',
        _now,
        _now
    );

    -- Set active_workspace_id in auth metadata
    UPDATE auth.users
    SET raw_user_meta_data = pg_catalog.coalesce(raw_user_meta_data, '{}'::jsonb) || pg_catalog.jsonb_build_object('active_workspace_id', _new_workspace_id)
    WHERE id = _user_id;

    RETURN pg_catalog.jsonb_build_object(
        'success', true,
        'workspace_id', _new_workspace_id,
        'name', trim(workspace_name),
        'is_personal', is_personal_workspace
    );
END;
$$;

-- 2. Trigger function: enforce_workspace_tier_limits
CREATE OR REPLACE FUNCTION public.enforce_workspace_tier_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    _user_id UUID;
    _profile RECORD;
    _max_workspaces INT := 1;
    _base_limit INT := 1;
    _current_workspaces INT := 0;
BEGIN
    -- Determine the user performing the insert
    _user_id := auth.uid();
    
    -- If not called via authenticated REST/Supabase client (e.g., internal admin process), allow it
    IF _user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Retrieve user profile limits
    SELECT id, entitlement_tier, is_early_adopter, is_vip, grandfathered_limits, vip_custom_perks
    INTO _profile
    FROM public.profiles
    WHERE id = _user_id;

    -- Determine effective max_workspaces 
    IF _profile.is_vip IS TRUE AND _profile.vip_custom_perks IS NOT NULL AND (_profile.vip_custom_perks->>'max_workspaces') IS NOT NULL THEN
        _max_workspaces := (_profile.vip_custom_perks->>'max_workspaces')::int;
    ELSE
        -- Base limit from entitlement tier
        IF _profile.entitlement_tier = 'pro' THEN
            SELECT max_workspaces INTO _base_limit FROM public.tier_configurations WHERE tier = 'pro';
            IF _base_limit IS NULL THEN _base_limit := 3; END IF;
        ELSE
            SELECT max_workspaces INTO _base_limit FROM public.tier_configurations WHERE tier = 'free';
            IF _base_limit IS NULL THEN _base_limit := 1; END IF;
        END IF;

        -- Early adopter override only if greater than base limit
        IF _profile.is_early_adopter IS TRUE AND _profile.grandfathered_limits IS NOT NULL AND (_profile.grandfathered_limits->>'max_workspaces') IS NOT NULL THEN
            IF (_profile.grandfathered_limits->>'max_workspaces')::int > _base_limit THEN
                _max_workspaces := (_profile.grandfathered_limits->>'max_workspaces')::int;
            ELSE
                _max_workspaces := _base_limit;
            END IF;
        ELSE
            _max_workspaces := _base_limit;
        END IF;
    END IF;

    -- Count active workspaces currently owned or joined by this user
    SELECT pg_catalog.count(DISTINCT wm.workspace_id) INTO _current_workspaces
    FROM public.workspace_members wm
    JOIN public.workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = _user_id
      AND w.deleted_at IS NULL;

    -- Enforce limits unless unlimited (-1 or >= 999)
    IF _max_workspaces <> -1 AND _max_workspaces < 999 AND _current_workspaces >= _max_workspaces THEN
        -- QZ001 is our custom errcode for "Quota Exceeded". We catch this in the PowerSync connector.
        RAISE EXCEPTION 'Workspace limit reached (% allowed on your current plan)', _max_workspaces USING ERRCODE = 'QZ001';
    END IF;

    RETURN NEW;
END;
$$;
