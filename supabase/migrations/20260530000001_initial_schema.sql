-- migration: 20260530000001_initial_schema.sql
-- SharedTrip Phase 1: All 6 tables + is_trip_member() + RLS policies
-- RLS is enabled in the SAME migration as table creation (Pitfall #2 mitigation).
-- Every policy uses (SELECT auth.uid()) — not bare auth.uid() — for performance.
-- DO NOT split this into separate migrations.
-- ==========================================
-- SECURITY DEFINER HELPER FUNCTION
-- Used by all per-trip RLS policies to avoid N+1 queries and recursion risk.
-- SET search_path = public prevents schema-injection attacks.
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_trip_member(check_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = check_trip_id
    AND user_id = (SELECT auth.uid())
  );
$$;

-- ==========================================
-- PROFILES TABLE
-- Keyed by auth.users.id. Stores display_name and avatar_seed (D-17).
-- Auto-created by trigger in migration 003.
-- ==========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name text,
  avatar_seed text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read profiles of users they share a trip with
CREATE POLICY "Members can view co-member profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = (SELECT auth.uid())  -- own profile always visible
  OR EXISTS (
    SELECT 1 FROM public.trip_members tm1
    JOIN public.trip_members tm2 ON tm1.trip_id = tm2.trip_id
    WHERE tm1.user_id = (SELECT auth.uid())
    AND tm2.user_id = profiles.id
  )
);

-- Only self can update own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Users can insert their own profile row (also handled by trigger, belt+suspenders)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- ==========================================
-- TRIPS TABLE
-- ==========================================
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their trips"
ON public.trips FOR SELECT
TO authenticated
USING (is_trip_member(id));

CREATE POLICY "Creator can update trip"
ON public.trips FOR UPDATE
TO authenticated
USING (created_by = (SELECT auth.uid()))
WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Creator can delete trip"
ON public.trips FOR DELETE
TO authenticated
USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can create trips"
ON public.trips FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

-- ==========================================
-- TRIP_MEMBERS TABLE
-- ==========================================
CREATE TABLE public.trip_members (
  trip_id uuid REFERENCES public.trips ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- Members can see who else is in their trips
CREATE POLICY "Members can view trip members"
ON public.trip_members FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

-- Members can join trips (insert own membership row)
-- Combined with the /join/[token] flow requiring possession of the invite_token
-- T-02-03: user_id = (SELECT auth.uid()) prevents a user from inserting for someone else
CREATE POLICY "Users can join trips"
ON public.trip_members FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Admin can remove members; any member can leave themselves
CREATE POLICY "Admin can remove members"
ON public.trip_members FOR DELETE
TO authenticated
USING (
  user_id = (SELECT auth.uid())  -- can leave yourself
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = trip_members.trip_id
    AND user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ==========================================
-- DOCUMENTS TABLE
-- ==========================================
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL DEFAULT 'other' CHECK (file_type IN ('pdf', 'image', 'other')),
  file_size int8 NOT NULL,
  category text DEFAULT 'otro' CHECK (category IN ('boleto', 'reservacion', 'identificacion', 'otro')),
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view trip documents"
ON public.documents FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can upload documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (
  is_trip_member(trip_id)
  AND uploaded_by = (SELECT auth.uid())
);

CREATE POLICY "Uploader or admin can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (
  uploaded_by = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = documents.trip_id
    AND user_id = (SELECT auth.uid())
    AND role = 'admin'
  )
);

-- ==========================================
-- ITINERARY_ITEMS TABLE
-- ==========================================
CREATE TABLE public.itinerary_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  sort_order int4 DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view itinerary"
ON public.itinerary_items FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can manage itinerary"
ON public.itinerary_items FOR ALL
TO authenticated
USING (is_trip_member(trip_id))
WITH CHECK (is_trip_member(trip_id));

-- ==========================================
-- EXPENSES TABLE (v1.5 — schema ready, feature deferred)
-- ==========================================
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES auth.users ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'MXN',
  description text NOT NULL,
  split_between uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (is_trip_member(trip_id));

CREATE POLICY "Members can add expenses"
ON public.expenses FOR INSERT
TO authenticated
WITH CHECK (
  is_trip_member(trip_id)
  AND paid_by = (SELECT auth.uid())
);
