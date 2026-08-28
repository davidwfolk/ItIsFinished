-- ==============================================================================
-- 1. ATTACHMENTS METADATA TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    thumbnail_url TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments REPLICA IDENTITY FULL;

-- Add attachments to PowerSync publication
ALTER PUBLICATION powersync ADD TABLE attachments;

-- Attachments RLS Policies
CREATE POLICY "Attachments viewable by project participants" ON attachments
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

CREATE POLICY "Attachments insertable by project participants" ON attachments
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

CREATE POLICY "Attachments deletable by project participants" ON attachments
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM tasks WHERE id = task_id AND is_project_member(project_id, auth.uid())
    ));

-- ==============================================================================
-- 2. PRIVATE SUPABASE STORAGE BUCKET CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'task-attachments',
    'task-attachments',
    false, -- 100% Private (Zero public URL access)
    52428800, -- 50 MB max file size limit
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/heic',
        'application/pdf',
        'text/plain',
        'text/csv',
        'audio/mp4',
        'audio/mpeg',
        'audio/m4a',
        'audio/wav',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800;

-- Storage RLS: Restrict uploads to authenticated users
CREATE POLICY "Authenticated users can upload task attachments" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'task-attachments');

-- Storage RLS: Restrict downloads to authenticated users
CREATE POLICY "Authenticated users can read task attachments" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'task-attachments');

-- Storage RLS: Restrict deletes to authenticated users
CREATE POLICY "Authenticated users can delete task attachments" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'task-attachments');
