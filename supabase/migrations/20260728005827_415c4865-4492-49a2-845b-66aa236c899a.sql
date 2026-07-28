CREATE TABLE public.fuel_log_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  image_path text NOT NULL DEFAULT '',
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.fuel_log_batches TO service_role;
ALTER TABLE public.fuel_log_batches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trip_entries
  ADD COLUMN batch_id uuid REFERENCES public.fuel_log_batches(id) ON DELETE CASCADE,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX idx_trip_entries_batch_id ON public.trip_entries(batch_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_fuel_log_batches_updated_at
  BEFORE UPDATE ON public.fuel_log_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_entries_updated_at
  BEFORE UPDATE ON public.trip_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();