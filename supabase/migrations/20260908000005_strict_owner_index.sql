-- Strict 1-Owner Enforcement
-- Ensures a workspace can NEVER have more than one owner, preventing race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS one_owner_per_workspace 
ON workspace_members (workspace_id) 
WHERE role = 'owner';
