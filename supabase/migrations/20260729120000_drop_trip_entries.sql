-- trip_entries was created early and never wired up: no route, component, or server
-- module reads or writes it. Fill-up rows live in the spreadsheet (the single editing
-- surface); fuel_log_batches keeps the photo-batch metadata that points at them.
-- updateTripEntry()/deleteTripEntry() are named after this table but act on spreadsheet
-- rows by row number, not on Postgres.
DROP TRIGGER IF EXISTS update_trip_entries_updated_at ON public.trip_entries;
DROP TABLE IF EXISTS public.trip_entries;
