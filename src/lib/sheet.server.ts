// Server-only: Dagger's trip log = bundled spreadsheet export + photo-imported rows.
import type { TripRow } from "@/lib/dagger-data";
import trips from "@/data/trips.json";

export async function fetchTripRows(): Promise<TripRow[]> {
  const base = (trips as TripRow[]).filter((r) => r.date !== "");
  const { fetchImportedTripRows } = await import("@/lib/fuel-log.server");
  const imported = await fetchImportedTripRows();
  return [...base, ...imported].sort((a, b) => a.date.localeCompare(b.date));
}
