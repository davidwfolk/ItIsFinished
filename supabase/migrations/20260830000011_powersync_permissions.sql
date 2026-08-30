DO $$
BEGIN
    -- Ensure powersync_role exists (it should if they ran the setup, but just to be safe)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'powersync_role') THEN
        CREATE ROLE powersync_role;
    END IF;

    -- Grant schema usage
    GRANT USAGE ON SCHEMA public TO powersync_role;

    -- Grant select on all current tables
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;

    -- Ensure future tables get the permission automatically
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;
END
$$;
