-- 1. Set Replica Identity so PowerSync can track deleted rows
ALTER TABLE workspaces REPLICA IDENTITY FULL;
ALTER TABLE workspace_members REPLICA IDENTITY FULL;
ALTER TABLE time_blocks REPLICA IDENTITY FULL;

-- 2. Add new tables to the PowerSync replication stream
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
        BEGIN
            EXECUTE 'ALTER PUBLICATION powersync ADD TABLE workspaces, workspace_members, time_blocks';
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if they were already added
        END;
    END IF;
END $$;
