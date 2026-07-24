import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import type { TripRow } from "@/lib/dagger-data";

export const getTripRows = createServerFn({ method: "GET" }).handler(async (): Promise<TripRow[]> => {
  const { fetchTripRows } = await import("@/lib/sheet.server");
  return await fetchTripRows();
});

export const tripRowsQueryOptions = queryOptions({
  queryKey: ["trip-rows"],
  queryFn: () => getTripRows(),
  staleTime: 60_000,
  refetchInterval: 5 * 60_000,
  refetchOnWindowFocus: true,
});
