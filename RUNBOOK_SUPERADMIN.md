# Superadmin Operational Runbook

This document defines the emergency recovery and operational procedures for managing Superadmin accounts in *It Is Finished*.

---

## 1. Security Invariants
1. **At least two active Superadmins** must be provisioned in production at all times to avoid single-point-of-failure lockouts.
2. The browser application (`apps/admin`) **never** possesses the power to grant or revoke superadmin status.
3. Superadmin provisioning is an **out-of-band, audited database operation**.

---

## 2. Provisioning the Initial Superadmin (Production Bootstrap)

To grant your first production user Superadmin access, connect to your Supabase PostgreSQL instance via the Supabase Dashboard SQL Editor or direct connection and execute:

```sql
-- Step 1: Identify your user's auth UUID by email
SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM';

-- Step 2: Insert into public.super_admins (substitute YOUR_USER_UUID)
INSERT INTO public.super_admins (user_id, granted_at, note)
VALUES ('YOUR_USER_UUID'::uuid, NOW(), 'Initial production bootstrap superadmin')
ON CONFLICT (user_id) DO UPDATE 
SET revoked_at = NULL, revoked_by = NULL, note = 'Re-activated during bootstrap';
```

---

## 3. Provisioning a Second Superadmin (Redundancy Requirement)

Repeat the procedure for a trusted backup co-founder/lead:

```sql
-- Record who granted the access for accountability
INSERT INTO public.super_admins (user_id, granted_by, note)
VALUES (
    'SECOND_USER_UUID'::uuid, 
    'FIRST_SUPERADMIN_UUID'::uuid, 
    'Primary operational backup'
);
```

---

## 4. Revoking a Superadmin

**Never delete the row.** Setting `revoked_at` preserves audit integrity:

```sql
UPDATE public.super_admins
SET revoked_at = NOW(),
    revoked_by = 'ACTING_SUPERADMIN_UUID'::uuid,
    note = 'Revoked per standard offboarding policy'
WHERE user_id = 'TARGET_USER_UUID'::uuid
  AND revoked_at IS NULL;
```

---

## 5. Emergency Recovery Procedure (Zero Active Superadmins)

If all active superadmins lose MFA access, leave the company, or are accidentally revoked:

1. Log in to the [Supabase Cloud Dashboard](https://supabase.com/dashboard) using the organization account.
2. Navigate to **SQL Editor**.
3. Re-activate or designate a new active superadmin:
   ```sql
   INSERT INTO public.super_admins (user_id, note)
   VALUES ('EMERGENCY_RECOVERY_USER_UUID'::uuid, 'Emergency break-glass recovery')
   ON CONFLICT (user_id) DO UPDATE 
   SET revoked_at = NULL, note = 'Emergency break-glass recovery executed';
   ```
4. Immediately provision a second superadmin.
5. Review `public.admin_audit_logs` to ensure no unauthorized administrative actions took place prior to the emergency.
