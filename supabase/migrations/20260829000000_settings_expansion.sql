-- ==============================================================================
-- 20260829000000_settings_expansion.sql
-- Add Settings Engine fields to profiles
-- ==============================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_view TEXT DEFAULT 'list' 
CHECK (default_view IN ('list', 'board', 'calendar', 'matrix', 'focus', 'habits', 'today', 'all'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS start_of_week SMALLINT DEFAULT 0 
CHECK (start_of_week IN (0, 1));
