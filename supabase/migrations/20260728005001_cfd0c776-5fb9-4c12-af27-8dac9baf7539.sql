CREATE TABLE public.trip_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  miles numeric NOT NULL DEFAULT 0,
  gallons numeric NOT NULL DEFAULT 0,
  price_per_gallon numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  trip text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'photo',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.trip_entries TO service_role;
ALTER TABLE public.trip_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX trip_entries_date_idx ON public.trip_entries (entry_date);