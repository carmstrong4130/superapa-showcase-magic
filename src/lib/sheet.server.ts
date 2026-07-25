// Server-only: reads Dagger's trip log from the bundled spreadsheet export.
import type { TripRow } from "@/lib/dagger-data";
import trips from "@/data/trips.json";

export async function fetchTripRows(): Promise<TripRow[]> {
  return (trips as TripRow[]).filter((r) => r.date !== "");
}
