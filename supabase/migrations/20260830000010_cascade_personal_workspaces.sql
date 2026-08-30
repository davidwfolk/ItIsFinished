-- Function to clean up personal workspaces when a profile is deleted
CREATE OR REPLACE FUNCTION public.cleanup_personal_workspaces()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Delete any workspace that is personal AND where the deleting user is a member.
    -- (We run this BEFORE DELETE on profiles, so the workspace_members link still exists)
    DELETE FROM public.workspaces
    WHERE is_personal = true
    AND id IN (
        SELECT workspace_id 
        FROM public.workspace_members 
        WHERE user_id = OLD.id
    );
    
    RETURN OLD;
END;
$$;

-- Attach the trigger to fire BEFORE the profile is deleted
DROP TRIGGER IF EXISTS on_profile_delete_cleanup_workspaces ON public.profiles;
CREATE TRIGGER on_profile_delete_cleanup_workspaces
    BEFORE DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_personal_workspaces();
