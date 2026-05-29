-- migration: 20260530000002_storage_bucket_rls.sql
-- Requires: bucket 'trip-documents' created in dashboard FIRST (see user_setup). This migration only writes the policies.
-- T-02-04: storage.foldername(name))[1]::uuid extracts the first path segment and casts to UUID.
-- Invalid UUIDs fail the cast → policy returns false → blocked. Pitfall #6 enforcement.
-- All file paths MUST follow the convention {tripId}/{filename} — enforced by upload Server Action.

CREATE POLICY "Members can read trip files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND is_trip_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Members can upload trip files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trip-documents'
  AND is_trip_member((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Authenticated users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trip-documents'
  AND owner = (SELECT auth.uid())
);
