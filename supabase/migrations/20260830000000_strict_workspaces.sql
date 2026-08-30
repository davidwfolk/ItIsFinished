-- 1. Create Workspace Tables
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    is_personal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS time_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_blocks ENABLE ROW LEVEL SECURITY;

-- 2. Add Workspace columns to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'workspace_id') THEN
        ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sections' AND column_name = 'workspace_id') THEN
        ALTER TABLE sections ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'workspace_id') THEN
        ALTER TABLE tasks ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_filters' AND column_name = 'workspace_id') THEN
        ALTER TABLE saved_filters ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'workspace_id') THEN
        ALTER TABLE tags ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'habits' AND column_name = 'workspace_id') THEN
        ALTER TABLE habits ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Data Migration: Backfill Personal Workspaces for Existing Users
DO $$
DECLARE
    user_rec RECORD;
    new_workspace_id UUID;
BEGIN
    FOR user_rec IN SELECT id FROM profiles LOOP
        -- Create personal workspace
        INSERT INTO workspaces (name, is_personal) 
        VALUES ('Personal', true) 
        RETURNING id INTO new_workspace_id;

        -- Add user as owner
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (new_workspace_id, user_rec.id, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;

        -- Migrate data
        UPDATE projects SET workspace_id = new_workspace_id WHERE owner_id = user_rec.id AND workspace_id IS NULL;
        UPDATE sections SET workspace_id = new_workspace_id WHERE project_id IN (SELECT id FROM projects WHERE owner_id = user_rec.id) AND workspace_id IS NULL;
        UPDATE tasks SET workspace_id = new_workspace_id WHERE created_by = user_rec.id AND workspace_id IS NULL;
        UPDATE saved_filters SET workspace_id = new_workspace_id WHERE user_id = user_rec.id AND workspace_id IS NULL;
        UPDATE tags SET workspace_id = new_workspace_id WHERE user_id = user_rec.id AND workspace_id IS NULL;
        UPDATE habits SET workspace_id = new_workspace_id WHERE user_id = user_rec.id AND workspace_id IS NULL;
    END LOOP;
END $$;

-- 4. Auto-Workspace Trigger for New Signups
CREATE OR REPLACE FUNCTION handle_new_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    INSERT INTO workspaces (name, is_personal) 
    VALUES ('Personal', true) 
    RETURNING id INTO new_workspace_id;

    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_create_workspace ON profiles;

CREATE TRIGGER on_profile_created_create_workspace
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_workspace();
