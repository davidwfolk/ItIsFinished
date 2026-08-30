-- Enable RLS (already enabled in previous migration, but good to be safe)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace Policies
CREATE POLICY "Users can view workspaces they are members of"
ON workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert workspaces"
ON workspaces FOR INSERT
WITH CHECK (true); -- Anyone can create a workspace (they become owner via trigger/client)

CREATE POLICY "Owners can update their workspaces"
ON workspaces FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  )
);

-- Workspace Members Policies
CREATE POLICY "Users can view members of their workspaces"
ON workspace_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members AS wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as owner"
ON workspace_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND role = 'owner'
);

CREATE POLICY "Owners can manage members"
ON workspace_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members AS wm
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
  )
);
