DO $$
BEGIN
    -- Delete any workspaces that have zero members
    DELETE FROM public.workspaces 
    WHERE id NOT IN (SELECT workspace_id FROM public.workspace_members);
END
$$;
