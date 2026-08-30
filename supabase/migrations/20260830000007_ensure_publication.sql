DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'powersync' AND tablename = 'workspaces'
    ) THEN
        ALTER PUBLICATION powersync ADD TABLE public.workspaces;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'powersync' AND tablename = 'workspace_members'
    ) THEN
        ALTER PUBLICATION powersync ADD TABLE public.workspace_members;
    END IF;
END
$$;
