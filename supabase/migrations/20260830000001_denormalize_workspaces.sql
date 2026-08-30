-- 1. Add workspace_id to child tables
ALTER TABLE comments ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 2. Refactor task_tags to have a single UUID primary key (Required by PowerSync)
ALTER TABLE task_tags DROP CONSTRAINT IF EXISTS task_tags_pkey;
ALTER TABLE task_tags ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
ALTER TABLE task_tags ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 3. Backfill data based on parent tables
UPDATE comments SET workspace_id = tasks.workspace_id FROM tasks WHERE comments.task_id = tasks.id AND comments.workspace_id IS NULL;
UPDATE attachments SET workspace_id = tasks.workspace_id FROM tasks WHERE attachments.task_id = tasks.id AND attachments.workspace_id IS NULL;
UPDATE habit_logs SET workspace_id = habits.workspace_id FROM habits WHERE habit_logs.habit_id = habits.id AND habit_logs.workspace_id IS NULL;
UPDATE task_tags SET workspace_id = tasks.workspace_id FROM tasks WHERE task_tags.task_id = tasks.id AND task_tags.workspace_id IS NULL;
