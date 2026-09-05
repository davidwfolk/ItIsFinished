-- ==============================================================================
-- 1. PROFILE ENTITLEMENTS (PERSONAL TIER)
-- ==============================================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS entitlement_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (entitlement_tier IN ('free', 'pro')),
    ADD COLUMN IF NOT EXISTS entitlement_source TEXT NOT NULL DEFAULT 'default'
        CHECK (entitlement_source IN ('default', 'stripe', 'admin_override')),
    ADD COLUMN IF NOT EXISTS entitlement_override_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS entitlement_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_profiles_entitlement_tier ON public.profiles (entitlement_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_entitlement_source ON public.profiles (entitlement_source);

-- ==============================================================================
-- 2. WORKSPACE STATUS & GOVERNANCE
-- ==============================================================================
ALTER TABLE public.workspaces
    ADD COLUMN IF NOT EXISTS workspace_status TEXT NOT NULL DEFAULT 'active'
        CHECK (workspace_status IN ('active', 'locked', 'suspended', 'archived')),
    ADD COLUMN IF NOT EXISTS workspace_status_changed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS workspace_status_changed_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS workspace_status_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_status ON public.workspaces (workspace_status);

-- ==============================================================================
-- 3. WORKSPACE OWNERSHIP INVARIANT TRIGGER
-- Every workspace with is_personal = false must retain at least one active owner.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_workspace_owner_invariant()
RETURNS TRIGGER AS $$
DECLARE
    _ws_id UUID;
    _is_personal BOOLEAN;
    _remaining_owners INT;
BEGIN
    -- Only inspect when an owner is being deleted or demoted
    IF (TG_OP = 'DELETE' AND OLD.role = 'owner') OR 
       (TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner') THEN
        
        _ws_id := OLD.workspace_id;
        
        -- Check if workspace exists and whether it is personal
        SELECT is_personal INTO _is_personal 
        FROM public.workspaces 
        WHERE id = _ws_id;
        
        -- If workspace is found and is a business/shared workspace (is_personal = false)
        IF _is_personal IS NOT NULL AND _is_personal IS FALSE THEN
            -- Count remaining active owners in this workspace
            SELECT COUNT(*) INTO _remaining_owners
            FROM public.workspace_members
            WHERE workspace_id = _ws_id
              AND role = 'owner'
              AND id <> OLD.id;
            
            IF _remaining_owners < 1 THEN
                RAISE EXCEPTION 'Cannot remove or demote the last owner of a business workspace. Transfer ownership first.'
                    USING ERRCODE = '23514'; -- check_violation
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_workspace_owner_invariant ON public.workspace_members;
CREATE TRIGGER trg_enforce_workspace_owner_invariant
    BEFORE UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workspace_owner_invariant();

-- ==============================================================================
-- 4. WORKSPACE STATUS SERVER-SIDE MUTATION GATING
-- When workspace_status != 'active' (locked, suspended, archived), content writes
-- and member changes are rejected server-side unless executed by a Superadmin.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.enforce_workspace_status_gate()
RETURNS TRIGGER AS $$
DECLARE
    _ws_id UUID;
    _status TEXT;
BEGIN
    -- Determine workspace ID based on table
    _ws_id := COALESCE(NEW.workspace_id, OLD.workspace_id);
    
    IF _ws_id IS NOT NULL THEN
        SELECT workspace_status INTO _status
        FROM public.workspaces
        WHERE id = _ws_id;

        IF _status IS NOT NULL AND _status <> 'active' THEN
            -- Superadmins bypass the gate for maintenance/recovery
            IF NOT private.is_super_admin() THEN
                RAISE EXCEPTION 'Workspace is %: mutations are not permitted.', _status
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply status gate to workspace members
DROP TRIGGER IF EXISTS trg_workspace_members_status_gate ON public.workspace_members;
CREATE TRIGGER trg_workspace_members_status_gate
    BEFORE INSERT OR UPDATE OR DELETE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workspace_status_gate();

-- Apply status gate to projects
DROP TRIGGER IF EXISTS trg_projects_status_gate ON public.projects;
CREATE TRIGGER trg_projects_status_gate
    BEFORE INSERT OR UPDATE OR DELETE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workspace_status_gate();

-- Apply status gate to tasks
DROP TRIGGER IF EXISTS trg_tasks_status_gate ON public.tasks;
CREATE TRIGGER trg_tasks_status_gate
    BEFORE INSERT OR UPDATE OR DELETE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workspace_status_gate();

-- Apply status gate to sections
DROP TRIGGER IF EXISTS trg_sections_status_gate ON public.sections;
CREATE TRIGGER trg_sections_status_gate
    BEFORE INSERT OR UPDATE OR DELETE ON public.sections
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_workspace_status_gate();

-- ==============================================================================
-- 5. SUSPENDED WORKSPACE READ RESTRICTIONS & SUPERADMIN READ ACCESS
-- ==============================================================================
-- Allow superadmins to view all workspaces (including suspended)
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
CREATE POLICY "Users and superadmins can view workspaces"
ON public.workspaces
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
    OR (
        workspace_status <> 'suspended'
        AND EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_members.workspace_id = workspaces.id 
              AND workspace_members.user_id = auth.uid()
        )
    )
);

-- Allow superadmins to view all workspace_members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON public.workspace_members;
CREATE POLICY "Users and superadmins can view workspace members"
ON public.workspace_members
FOR SELECT
TO authenticated
USING (
    private.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.workspace_members AS wm
        WHERE wm.workspace_id = workspace_members.workspace_id 
          AND wm.user_id = auth.uid()
    )
);

-- Allow superadmins to view all profiles
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;
CREATE POLICY "Superadmins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    private.is_super_admin() OR auth.uid() = id
);
