-- ==============================================================================
-- 20260828000002_focus_and_filters.sql
-- Add Pomodoro Focus Sessions and Saved Smart Filters
-- ==============================================================================

-- 1. Focus Sessions (Pomodoro Tracking)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Saved Smart Filters
CREATE TABLE IF NOT EXISTS public.saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    query_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    order_index TEXT NOT NULL DEFAULT 'a0',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Focus Sessions
CREATE POLICY "Users can manage their own focus sessions"
ON public.focus_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for Saved Filters
CREATE POLICY "Users can manage their own saved filters"
ON public.saved_filters
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Add to PowerSync Publication
ALTER PUBLICATION powersync ADD TABLE public.focus_sessions;
ALTER PUBLICATION powersync ADD TABLE public.saved_filters;

