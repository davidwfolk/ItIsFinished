DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['workspaces', 'workspace_members', 'projects', 'sections', 'tasks', 'tags', 'habits', 'saved_filters', 'habit_logs', 'task_tags', 'comments', 'attachments', 'profiles', 'time_blocks', 'focus_sessions'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'powersync' AND tablename = t
        ) THEN
            EXECUTE 'ALTER PUBLICATION powersync ADD TABLE public.' || t;
        END IF;
    END LOOP;
END
$$;
