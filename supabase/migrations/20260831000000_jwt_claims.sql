-- Function to update the JWT claims (raw_app_meta_data) whenever workspace_members changes
CREATE OR REPLACE FUNCTION update_user_workspace_claims()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _workspace_ids UUID[];
BEGIN
  -- Determine which user's claims need updating based on the operation
  IF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
  ELSE
    _user_id := NEW.user_id;
  END IF;

  -- Aggregate all workspace IDs the user is currently a member of
  SELECT array_agg(workspace_id)
  INTO _workspace_ids
  FROM public.workspace_members
  WHERE user_id = _user_id;

  -- If the user belongs to no workspaces, default to an empty array
  IF _workspace_ids IS NULL THEN
    _workspace_ids := ARRAY[]::UUID[];
  END IF;

  -- Update auth.users directly. Security Definer ensures permission.
  UPDATE auth.users
  SET raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('workspace_ids', _workspace_ids)
  WHERE id = _user_id;

  RETURN NULL; -- After triggers return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after any modification to workspace_members
DROP TRIGGER IF EXISTS on_workspace_member_change ON public.workspace_members;
CREATE TRIGGER on_workspace_member_change
AFTER INSERT OR UPDATE OR DELETE ON public.workspace_members
FOR EACH ROW EXECUTE FUNCTION update_user_workspace_claims();

-- Backfill existing users' claims
DO $$
DECLARE
  user_rec RECORD;
  ws_ids UUID[];
BEGIN
  FOR user_rec IN SELECT id FROM auth.users LOOP
    SELECT array_agg(workspace_id)
    INTO ws_ids
    FROM public.workspace_members
    WHERE user_id = user_rec.id;

    IF ws_ids IS NULL THEN
      ws_ids := ARRAY[]::UUID[];
    END IF;

    UPDATE auth.users
    SET raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('workspace_ids', ws_ids)
    WHERE id = user_rec.id;
  END LOOP;
END $$;
