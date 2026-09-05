BEGIN;
SELECT plan(8);

-- 1. Schema check
SELECT has_schema('private', 'Schema "private" should exist');

-- 2. Tables check
SELECT has_table('public', 'super_admins', 'Table "super_admins" should exist in public');
SELECT has_table('public', 'admin_audit_logs', 'Table "admin_audit_logs" should exist in public');

-- 3. Columns check on admin_audit_logs
SELECT has_column('public', 'admin_audit_logs', 'admin_id', 'admin_audit_logs has admin_id column');
SELECT has_column('public', 'admin_audit_logs', 'action', 'admin_audit_logs has action column');
SELECT has_column('public', 'admin_audit_logs', 'request_id', 'admin_audit_logs has request_id column');

-- 4. Unique idempotency index check
SELECT has_index('public', 'admin_audit_logs', 'admin_audit_logs_admin_request_id_unique', 'Unique index on (admin_id, request_id) exists');

-- 5. Helper function check
SELECT has_function('private', 'is_super_admin', 'Function private.is_super_admin() exists');

SELECT * FROM finish();
ROLLBACK;
