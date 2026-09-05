-- Migration: 20260905000004_workspace_tier_trigger.sql
-- Description: Enforces max_workspaces tier limits securely at the database level.

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
    ELSIF _profile.is_early_adopter IS TRUE AND _profile.grandfathered_limits IS NOT NULL AND (_profile.grandfathered_limits->>'max_workspaces') IS NOT NULL THEN
        _max_workspaces := (_profile.grandfathered_limits->>'max_workspaces')::int;
    ELSIF _profile.entitlement_tier = 'pro' THEN
        SELECT max_workspaces INTO _max_workspaces FROM public.tier_configurations WHERE tier = 'pro';
        IF _max_workspaces IS NULL THEN _max_workspaces := 3; END IF;
    ELSE
        SELECT max_workspaces INTO _max_workspaces FROM public.tier_configurations WHERE tier = 'free';
        IF _max_workspaces IS NULL THEN _max_workspaces := 1; END IF;
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

DROP TRIGGER IF EXISTS trigger_enforce_workspace_limits ON public.workspaces;
CREATE TRIGGER trigger_enforce_workspace_limits
BEFORE INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.enforce_workspace_tier_limits();
