-- ============================================================
-- StudyPlan Backend — Full Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- TABLE 1: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT,
    email      TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: study_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assignment_name TEXT NOT NULL,
    subject         TEXT NOT NULL,
    due_date        DATE NOT NULL,
    assignment_type TEXT NOT NULL
        CHECK (assignment_type IN ('essay','report','presentation','exam-prep','project')),
    workload        TEXT NOT NULL
        CHECK (workload IN ('light','moderate','heavy')),
    status          TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: availability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id   UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    monday    NUMERIC(4,2) DEFAULT 0,
    tuesday   NUMERIC(4,2) DEFAULT 0,
    wednesday NUMERIC(4,2) DEFAULT 0,
    thursday  NUMERIC(4,2) DEFAULT 0,
    friday    NUMERIC(4,2) DEFAULT 0,
    saturday  NUMERIC(4,2) DEFAULT 0,
    sunday    NUMERIC(4,2) DEFAULT 0
);

-- ============================================================
-- TABLE 4: preferences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.preferences (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id              UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    session_length       TEXT NOT NULL
        CHECK (session_length IN ('25', '50', '90')),
    preferred_study_time TEXT NOT NULL
        CHECK (preferred_study_time IN ('morning','afternoon','evening')),
    break_frequency      TEXT NOT NULL
        CHECK (break_frequency IN ('every-25','every-50','every-90')),
    priority             TEXT NOT NULL
        CHECK (priority IN ('speed','quality','balanced'))
);

-- ============================================================
-- TABLE 5: study_sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id       UUID NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
    session_date  DATE NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    task_name     TEXT NOT NULL,
    is_completed  BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- TRIGGER: Auto-create profile when Supabase Auth creates a user
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'username',
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY — enable on every table
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- ---- profiles policies ----
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- ---- study_plans policies ----
DROP POLICY IF EXISTS "Users can view own plans" ON public.study_plans;
CREATE POLICY "Users can view own plans"
    ON public.study_plans FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON public.study_plans;
CREATE POLICY "Users can insert own plans"
    ON public.study_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON public.study_plans;
CREATE POLICY "Users can update own plans"
    ON public.study_plans FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plans" ON public.study_plans;
CREATE POLICY "Users can delete own plans"
    ON public.study_plans FOR DELETE
    USING (auth.uid() = user_id);

-- ---- availability policies ----
DROP POLICY IF EXISTS "Users can view own availability" ON public.availability;
CREATE POLICY "Users can view own availability"
    ON public.availability FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = availability.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert own availability" ON public.availability;
CREATE POLICY "Users can insert own availability"
    ON public.availability FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = availability.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update own availability" ON public.availability;
CREATE POLICY "Users can update own availability"
    ON public.availability FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = availability.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete own availability" ON public.availability;
CREATE POLICY "Users can delete own availability"
    ON public.availability FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = availability.plan_id
          AND study_plans.user_id = auth.uid()
    ));

-- ---- preferences policies ----
DROP POLICY IF EXISTS "Users can view own preferences" ON public.preferences;
CREATE POLICY "Users can view own preferences"
    ON public.preferences FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = preferences.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.preferences;
CREATE POLICY "Users can insert own preferences"
    ON public.preferences FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = preferences.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update own preferences" ON public.preferences;
CREATE POLICY "Users can update own preferences"
    ON public.preferences FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = preferences.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete own preferences" ON public.preferences;
CREATE POLICY "Users can delete own preferences"
    ON public.preferences FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = preferences.plan_id
          AND study_plans.user_id = auth.uid()
    ));

-- ---- study_sessions policies ----
DROP POLICY IF EXISTS "Users can view own sessions" ON public.study_sessions;
CREATE POLICY "Users can view own sessions"
    ON public.study_sessions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = study_sessions.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own sessions"
    ON public.study_sessions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = study_sessions.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can update own sessions" ON public.study_sessions;
CREATE POLICY "Users can update own sessions"
    ON public.study_sessions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = study_sessions.plan_id
          AND study_plans.user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.study_sessions;
CREATE POLICY "Users can delete own sessions"
    ON public.study_sessions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.study_plans
        WHERE study_plans.id = study_sessions.plan_id
          AND study_plans.user_id = auth.uid()
    ));