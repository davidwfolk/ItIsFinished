BEGIN;
SELECT plan(4);

-- 1. Functions existence in public schema
SELECT has_function('public', 'admin_set_profile_tier', ARRAY['uuid', 'text', 'text', 'uuid'], 'admin_set_profile_tier exists in public');
SELECT has_function('public', 'admin_set_workspace_status', ARRAY['uuid', 'text', 'text', 'uuid'], 'admin_set_workspace_status exists in public');
SELECT has_function('public', 'admin_transfer_workspace_ownership', ARRAY['uuid', 'uuid', 'text', 'text', 'uuid'], 'admin_transfer_workspace_ownership exists in public');

-- 2. Unauthorized caller test (when unauthenticated / no auth.uid)
SELECT throws_ok(
    $$ SELECT public.admin_set_profile_tier('00000000-0000-0000-0000-000000000000'::uuid, 'pro', 'test reason') $$,
    '28000',
    'Authentication required',
    'Unauthenticated call to admin_set_profile_tier must throw 28000'
);

SELECT * FROM finish();
ROLLBACK;
