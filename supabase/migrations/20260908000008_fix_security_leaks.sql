-- 1. Drop the dangerous debug RPCs
DROP FUNCTION IF EXISTS public.debug_get_profiles();
DROP FUNCTION IF EXISTS public.debug_get_workspaces();
DROP FUNCTION IF EXISTS public.debug_get_workspace_members();

-- 2. Drop the debug logs table entirely
DROP TABLE IF EXISTS public.debug_logs CASCADE;

-- 3. Fix the trigger that was inserting into debug_logs
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    INSERT INTO public.workspaces (name, is_personal)
    VALUES ('Personal', true)
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Silently fail or let it bubble up, but do not leak to public table
    RAISE LOG 'Error in handle_new_user_workspace: %', SQLERRM;
    RETURN NEW;
END;
$$;
