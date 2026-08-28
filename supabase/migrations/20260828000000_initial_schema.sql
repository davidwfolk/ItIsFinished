-- ==============================================================================
-- 1. EXTENSIONS & SETUP
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. PROFILES (Users linked to Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Automatically create profile on new user signup
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. PROJECTS (Workspaces / Folders)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'folder',
    view_mode TEXT DEFAULT 'list' CHECK (view_mode IN ('list', 'board', 'calendar', 'timeline')),
    is_archived BOOLEAN DEFAULT FALSE,
    order_index TEXT COLLATE "C" NOT NULL DEFAULT 'a0',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. PROJECT MEMBERS (Multi-User Collaboration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

CREATE TRIGGER set_project_members_updated_at
    BEFORE UPDATE ON project_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. SECTIONS (Kanban Columns & List Groups)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index TEXT COLLATE "C" NOT NULL DEFAULT 'a0',
    is_collapsed BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. TASKS (Recursive subtasks, floating dates, fractional ordering)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'canceled')),
    priority SMALLINT DEFAULT 4 CHECK (priority BETWEEN 1 AND 4),
    
    -- Date & Timezone handling (Prevents UTC timezone drift)
    due_date DATE,
    due_time TIME,
    timezone TEXT DEFAULT 'floating',
    estimated_minutes INTEGER,
    
    -- Recurrence
    recurrence_rule TEXT,
    recurrence_parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Lexicographical Fractional Indexing
    order_index TEXT COLLATE "C" NOT NULL DEFAULT 'a0',
    
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. TAGS & TASK_TAGS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS task_tags (
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (task_id, tag_id)
);

-- ==============================================================================
-- 8. HABITS & HABIT LOGS (Daily streak tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    icon TEXT DEFAULT 'check',
    color TEXT DEFAULT '#10B981',
    frequency_type TEXT DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly_days', 'interval')),
    target_count INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(habit_id, log_date)
);

-- ==============================================================================
-- 9. COMMENTS (Task collaboration discussion)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. ACTIVITY LOGS (Immutable audit trail for SOC 2 / GDPR)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (Zero-Trust Security Policies)
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION is_project_member(p_id UUID, u_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM projects WHERE id = p_id AND owner_id = u_id
    ) OR EXISTS (
        SELECT 1 FROM project_members WHERE project_id = p_id AND user_id = u_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Projects Policies
CREATE POLICY "Users can view projects they own or belong to" ON projects
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR is_project_member(id, auth.uid()));

CREATE POLICY "Users can insert their own projects" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Project owners and editors can update projects" ON projects
    FOR UPDATE TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM project_members WHERE project_id = id AND user_id = auth.uid() AND role IN ('editor', 'admin')
    ));

CREATE POLICY "Project owners can delete projects" ON projects
    FOR DELETE TO authenticated
    USING (owner_id = auth.uid());

-- Project Members Policies
CREATE POLICY "Members viewable by project participants" ON project_members
    FOR SELECT TO authenticated
    USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project admins and owners can manage members" ON project_members
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM projects WHERE id = project_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM project_members WHERE project_id = project_members.project_id AND user_id = auth.uid() AND role = 'admin'
    ));

-- Sections Policies
CREATE POLICY "Sections viewable by project participants" ON sections
    FOR SELECT TO authenticated
    USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Sections manageable by project editors" ON sections
    FOR ALL TO authenticated
    USING (is_project_member(project_id, auth.uid()));

-- Tasks Policies
CREATE POLICY "Tasks viewable by project participants" ON tasks
    FOR SELECT TO authenticated
    USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Tasks manageable by project participants" ON tasks
    FOR ALL TO authenticated
    USING (is_project_member(project_id, auth.uid()))
    WITH CHECK (is_project_member(project_id, auth.uid()));

-- Tags Policies
CREATE POLICY "Users can manage their own tags" ON tags
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Task Tags Policies
CREATE POLICY "Task tags viewable if task viewable" ON task_tags
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

-- Habits Policies
CREATE POLICY "Users can manage their own habits" ON habits
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own habit logs" ON habit_logs
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid()
    ));

-- Comments Policies
CREATE POLICY "Comments viewable by project participants" ON comments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

CREATE POLICY "Users can insert comments on accessible tasks" ON comments
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

CREATE POLICY "Users can update/delete their own comments" ON comments
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Activity Logs Policies
CREATE POLICY "Activity logs viewable by project participants" ON activity_logs
    FOR SELECT TO authenticated
    USING (is_project_member(project_id, auth.uid()));

-- ==============================================================================
-- 12. POWERSYNC REPLICATION SETUP
-- ==============================================================================
-- Configure REPLICA IDENTITY FULL for clean PowerSync replication
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;
ALTER TABLE project_members REPLICA IDENTITY FULL;
ALTER TABLE sections REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE tags REPLICA IDENTITY FULL;
ALTER TABLE task_tags REPLICA IDENTITY FULL;
ALTER TABLE habits REPLICA IDENTITY FULL;
ALTER TABLE habit_logs REPLICA IDENTITY FULL;
ALTER TABLE comments REPLICA IDENTITY FULL;

-- Create PowerSync publication if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
        CREATE PUBLICATION powersync FOR TABLE 
            profiles,
            projects,
            project_members,
            sections,
            tasks,
            tags,
            task_tags,
            habits,
            habit_logs,
            comments;
    END IF;
END $$;
