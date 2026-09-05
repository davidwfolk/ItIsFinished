-- ==============================================================================
-- 1. PRIVATE SCHEMA FOR INTERNAL SECURITY HELPERS
-- ==============================================================================
CREATE SCHEMA IF NOT EXISTS private;

-- Grant USAGE to authenticated so RLS policies can evaluate private functions,
-- but ensure anon and public have zero access. Note that PostgREST does not expose
-- 'private' in API schemas, so its contents are never accessible via REST.
REVOKE ALL ON SCHEMA private FROM public, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

-- ==============================================================================
-- 2. SUPER ADMINS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.super_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id),
    note TEXT
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Permissions on super_admins: authenticated users can only SELECT via policy
REVOKE ALL ON public.super_admins FROM public, anon;
GRANT SELECT ON public.super_admins TO authenticated;

-- ==============================================================================
-- 3. AUTHORIZATION HELPER: private.is_super_admin()
-- ==============================================================================
-- SECURITY DEFINER runs as the creating role (postgres/superuser) to safely check
-- super_admins without triggering recursive RLS.
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
    _uid UUID;
    _is_admin BOOLEAN;
BEGIN
    _uid := auth.uid();
    IF _uid IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.super_admins
        WHERE user_id = _uid
          AND revoked_at IS NULL
    ) INTO _is_admin;

    RETURN COALESCE(_is_admin, false);
END;
$$;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated;

-- RLS Policy for super_admins: Only active superadmins can inspect the table
CREATE POLICY "Superadmins can read super_admins"
ON public.super_admins
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
);

-- ==============================================================================
-- 4. ATOMIC AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    request_id UUID,
    reason TEXT,
    before_state JSONB,
    after_state JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Idempotency constraint on (admin_id, request_id)
CREATE UNIQUE INDEX IF NOT EXISTS admin_audit_logs_admin_request_id_unique 
ON public.admin_audit_logs (admin_id, request_id) 
WHERE request_id IS NOT NULL;

-- Index on workspace_id and target_id for fast UI filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_workspace_id ON public.admin_audit_logs (workspace_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs (created_at DESC);

-- Permissions: Absolute immutability from client roles
-- No INSERT, UPDATE, or DELETE privileges for public, anon, or authenticated.
REVOKE ALL ON public.admin_audit_logs FROM public, anon, authenticated;
GRANT SELECT ON public.admin_audit_logs TO authenticated;

-- RLS: Only active superadmins can view audit records
CREATE POLICY "Superadmins can read audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
);
