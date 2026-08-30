CREATE TABLE IF NOT EXISTS public.debug_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can view debug logs" ON public.debug_logs FOR SELECT USING (true);
CREATE POLICY "Anon can insert debug logs" ON public.debug_logs FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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
