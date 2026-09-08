-- Fix search paths and schema qualifications for all signup-related triggers
-- When auth.users receives an insert, triggers fire which invoke these functions.
-- Because GoTrue executes the insert with `search_path = auth`, these functions 
-- must be SECURITY DEFINER SET search_path = public, auth, and must fully qualify schemas.

-- 1. handle_new_user (from 20260828000000_initial_schema.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 2. handle_new_user_workspace (from 20260830000005_fix_trigger_search_path.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    new_workspace_id UUID;
    err_context text;
BEGIN
    INSERT INTO public.workspaces (name, is_personal) 
    VALUES ('Personal', true) 
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_context = PG_EXCEPTION_CONTEXT;
    INSERT INTO public.debug_logs (message) 
    VALUES ('Error: ' || SQLERRM || ' | Context: ' || err_context);
    RETURN NEW;
END;
$$;

-- 3. stamp_profile_early_adopter (from 20260905000000_fix_grandfathered_limits_keys.sql)
CREATE OR REPLACE FUNCTION public.stamp_profile_early_adopter()
RETURNS TRIGGER AS $$
DECLARE
    _free_config RECORD;
BEGIN
    SELECT * INTO _free_config FROM public.tier_configurations WHERE tier = 'free';

    -- If this is a new signup during the early adopter window
    IF (SELECT count(*) FROM public.profiles) < 10000 THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 4. process_workspace_invites_on_signup (from 20260831000004_auto_provisioning.sql)
CREATE OR REPLACE FUNCTION public.process_workspace_invites_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    invite_rec RECORD;
BEGIN
    -- Find all pending invites for this email
    FOR invite_rec IN SELECT * FROM public.workspace_invites WHERE email = NEW.email LOOP
        -- Insert into workspace_members safely (RLS bypassed because of SECURITY DEFINER)
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (invite_rec.workspace_id, NEW.id, invite_rec.role)
        ON CONFLICT (workspace_id, user_id) DO NOTHING;

        -- Delete the processed invite
        DELETE FROM public.workspace_invites WHERE id = invite_rec.id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 5. update_user_workspace_claims (from 20260831000000_jwt_claims.sql)
CREATE OR REPLACE FUNCTION public.update_user_workspace_claims()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _workspace_ids UUID[];
BEGIN
  -- Determine which user's claims need updating based on the operation
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
  ELSE
    _user_id := NEW.user_id;
  END IF;

  -- Aggregate all workspace IDs the user is currently a member of
  SELECT array_agg(workspace_id)
  INTO _workspace_ids
  FROM public.workspace_members
  WHERE user_id = _user_id;

  -- If the user belongs to no workspaces, default to an empty array
  IF _workspace_ids IS NULL THEN
    _workspace_ids := ARRAY[]::UUID[];
  END IF;

  -- Update auth.users directly. Security Definer ensures permission.
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('workspace_ids', _workspace_ids)
  WHERE id = _user_id;

  RETURN NULL; -- After triggers return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
