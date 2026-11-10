-- Migration: 20261110000000_security_hardening_phase0.sql
-- Description: Phase 0 security fixes from the 2026-11-10 code review.
--   1. Stop users granting themselves plans/VIP perks via profiles UPDATE
--   2. Stop owners rewriting workspace plan/status/seat columns via direct INSERT/UPDATE
--   3. Limit profile visibility to yourself + people you share a workspace with
--   4. Scope storage (attachments) to workspace membership via path prefix
--   5. Allow the 'orphaned' workspace status that existing functions already write
--   6. Harden SECURITY DEFINER functions (search_path, EXECUTE grants)
--
-- NOTE: Plan/billing/status changes must go through the existing SECURITY DEFINER
-- admin RPCs (they run as the function owner, so column grants below do not apply).
-- Any NEW column on profiles/workspaces is NOT writable by clients until granted here.

-- ==============================================================================
-- 1. PROFILES: column-level UPDATE only (no entitlement/VIP/grandfather columns)
-- ==============================================================================
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, avatar_url, timezone, default_view, start_of_week, updated_at)
    ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ==============================================================================
-- 2. WORKSPACES: clients may only write name/is_personal/deleted_at/timestamps.
--    tier, max_seats, status, downgrade_* are RPC/service-role only.
-- ==============================================================================
REVOKE INSERT, UPDATE ON public.workspaces FROM authenticated, anon;
GRANT INSERT (id, name, is_personal, created_at, updated_at)
    ON public.workspaces TO authenticated;
-- id/created_at are included for UPDATE because PowerSync replays PUTs as upserts
-- (ON CONFLICT DO UPDATE sets every supplied column). RLS still limits rows to owners.
GRANT UPDATE (id, name, is_personal, created_at, updated_at, deleted_at)
    ON public.workspaces TO authenticated;

-- ==============================================================================
-- 3. PROFILES SELECT: self + co-members only
-- ==============================================================================
CREATE OR REPLACE FUNCTION private.shares_workspace_with(_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members a
        JOIN public.workspace_members b ON b.workspace_id = a.workspace_id
        WHERE a.user_id = auth.uid()
          AND b.user_id = _other
    );
$$;
REVOKE ALL ON FUNCTION private.shares_workspace_with(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.shares_workspace_with(UUID) TO authenticated;

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by self and co-members" ON public.profiles;
CREATE POLICY "Profiles viewable by self and co-members" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR private.shares_workspace_with(id));
-- (Superadmin SELECT policy, if present, is permissive and keeps working.)

-- ==============================================================================
-- 4. STORAGE: task-attachments objects must live under "<workspace_id>/..."
--    and the caller must belong to that workspace.
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete task attachments" ON storage.objects;

CREATE OR REPLACE FUNCTION private.can_access_attachment_path(_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    _first TEXT := pg_catalog.split_part(_name, '/', 1);
BEGIN
    IF _first !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
        RETURN false;
    END IF;
    RETURN private.user_belongs_to_workspace(_first::uuid, auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION private.can_access_attachment_path(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.can_access_attachment_path(TEXT) TO authenticated;

CREATE POLICY "Workspace members can upload task attachments" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'task-attachments' AND private.can_access_attachment_path(name));

CREATE POLICY "Workspace members can read task attachments" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'task-attachments' AND private.can_access_attachment_path(name));

CREATE POLICY "Workspace members can delete task attachments" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'task-attachments' AND private.can_access_attachment_path(name));

-- Keep metadata rows consistent with the path convention (NOT VALID: don't scan old rows).
ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS attachments_storage_path_workspace_prefix;
ALTER TABLE public.attachments
    ADD CONSTRAINT attachments_storage_path_workspace_prefix
    CHECK (workspace_id IS NULL OR storage_path LIKE workspace_id::text || '/%') NOT VALID;

-- ==============================================================================
-- 5. WORKSPACE STATUS: allow 'orphaned' (handle_owner_leave etc. already write it)
-- ==============================================================================
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_workspace_status_check;
ALTER TABLE public.workspaces
    ADD CONSTRAINT workspaces_workspace_status_check
    CHECK (workspace_status IN ('active', 'locked', 'suspended', 'archived', 'orphaned'));

-- ==============================================================================
-- 6. SECURITY DEFINER hardening
--    search_path = public, pg_temp (bodies use unqualified names, so '' would break them).
-- ==============================================================================
ALTER FUNCTION public.is_project_member(UUID, UUID)             SET search_path = public, pg_temp;
ALTER FUNCTION public.request_ownership_transfer(UUID, UUID)    SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_ownership_transfer(UUID)           SET search_path = public, pg_temp;
ALTER FUNCTION public.cancel_ownership_transfer(UUID)           SET search_path = public, pg_temp;
ALTER FUNCTION public.downgrade_excess_workspaces(UUID)         SET search_path = public, pg_temp;
ALTER FUNCTION public.sweep_orphaned_workspaces()               SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_owner_leave()                      SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID, UUID)          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_ownership_transfer(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_ownership_transfer(UUID)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ownership_transfer(UUID)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.downgrade_excess_workspaces(UUID)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_project_member(UUID, UUID)          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.request_ownership_transfer(UUID, UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.accept_ownership_transfer(UUID)        TO authenticated;
GRANT  EXECUTE ON FUNCTION public.cancel_ownership_transfer(UUID)        TO authenticated;
GRANT  EXECUTE ON FUNCTION public.downgrade_excess_workspaces(UUID)      TO authenticated;

-- Maintenance sweep: scheduler / service role only, never callable by clients.
REVOKE EXECUTE ON FUNCTION public.sweep_orphaned_workspaces() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.sweep_orphaned_workspaces() TO service_role;
