-- fuel_log_batches: server-only (service role). Make the denial explicit.
REVOKE ALL ON public.fuel_log_batches FROM anon, authenticated;
GRANT ALL ON public.fuel_log_batches TO service_role;

DROP POLICY IF EXISTS "fuel_log_batches_no_client_access" ON public.fuel_log_batches;
CREATE POLICY "fuel_log_batches_no_client_access"
  ON public.fuel_log_batches
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- fuel-logs bucket: server-only uploads/reads via signed URLs. Explicit deny for clients.
DROP POLICY IF EXISTS "fuel_logs_bucket_no_client_access" ON storage.objects;
CREATE POLICY "fuel_logs_bucket_no_client_access"
  ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (bucket_id = 'fuel-logs' AND false)
  WITH CHECK (bucket_id = 'fuel-logs' AND false);