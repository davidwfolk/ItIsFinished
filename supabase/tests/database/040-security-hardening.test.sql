BEGIN;
SELECT plan(7);

-- Fixtures (as postgres): two users in separate workspaces
INSERT INTO auth.users (id, email, instance_id, aud, role)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@test.dev', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@test.dev',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;
-- handle_new_user trigger creates profiles + personal workspaces for each.

-- Act as Alice
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- 1. Cannot self-upgrade plan
SELECT throws_ok(
  $$UPDATE public.profiles SET entitlement_tier = 'pro' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501', NULL, 'user cannot set own entitlement_tier');

-- 2. Cannot set VIP flag
SELECT throws_ok(
  $$UPDATE public.profiles SET is_vip = true WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  '42501', NULL, 'user cannot set own is_vip');

-- 3. Can still edit normal settings
SELECT lives_ok(
  $$UPDATE public.profiles SET timezone = 'America/Chicago' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'user can update own timezone');

-- 4. Cannot see Bob's profile (no shared workspace)
SELECT is(
  (SELECT count(*)::int FROM public.profiles WHERE id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  0, 'user cannot read a stranger''s profile');

-- 5. Owner cannot change workspace tier / seats / status directly
SELECT throws_ok(
  $$UPDATE public.workspaces SET workspace_tier = 'enterprise', max_seats = 9999$$,
  '42501', NULL, 'owner cannot set workspace_tier/max_seats directly');
SELECT throws_ok(
  $$UPDATE public.workspaces SET workspace_status = 'active'$$,
  '42501', NULL, 'owner cannot set workspace_status directly');

-- 6. Anonymous cannot run the orphan sweep
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.sweep_orphaned_workspaces()$$,
  '42501', NULL, 'anon cannot call sweep_orphaned_workspaces');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;

-- NOT YET RUN: no local Supabase available when written. Run with `supabase test db`.
-- TODO: add storage-path tests (cross-workspace read/delete) once attachments upload is implemented.
