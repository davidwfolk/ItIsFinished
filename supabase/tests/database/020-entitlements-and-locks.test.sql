BEGIN;
SELECT plan(6);

-- 1. Profiles columns
SELECT has_column('public', 'profiles', 'entitlement_tier', 'profiles has entitlement_tier column');
SELECT has_column('public', 'profiles', 'entitlement_source', 'profiles has entitlement_source column');

-- 2. Workspaces columns
SELECT has_column('public', 'workspaces', 'workspace_status', 'workspaces has workspace_status column');
SELECT has_column('public', 'workspaces', 'workspace_status_reason', 'workspaces has workspace_status_reason column');

-- 3. Triggers check
SELECT has_trigger('public', 'workspace_members', 'trg_enforce_workspace_owner_invariant', 'Ownership invariant trigger exists on workspace_members');
SELECT has_trigger('public', 'workspace_members', 'trg_workspace_members_status_gate', 'Status gate trigger exists on workspace_members');

SELECT * FROM finish();
ROLLBACK;
