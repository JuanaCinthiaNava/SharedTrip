-- migration: 20260530000003_profile_autocreate_trigger.sql
-- Creates a public.profiles row automatically for every new auth.users row.
-- This includes anonymous users created by signInAnonymously() — Plan 05's avatar
-- generator falls back to deterministic-from-user-id rendering when display_name is NULL.
-- SECURITY DEFINER so the function can insert into public.profiles despite RLS.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
