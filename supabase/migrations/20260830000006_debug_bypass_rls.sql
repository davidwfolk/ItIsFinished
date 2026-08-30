CREATE OR REPLACE FUNCTION public.debug_get_profiles()
RETURNS json AS $$
BEGIN
    RETURN (SELECT json_agg(row_to_json(p)) FROM public.profiles p);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.debug_get_workspaces()
RETURNS json AS $$
BEGIN
    RETURN (SELECT json_agg(row_to_json(w)) FROM public.workspaces w);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.debug_get_workspace_members()
RETURNS json AS $$
BEGIN
    RETURN (SELECT json_agg(row_to_json(wm)) FROM public.workspace_members wm);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
