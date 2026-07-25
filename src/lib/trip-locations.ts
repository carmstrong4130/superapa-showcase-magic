// Maps trip labels found in the trip log to real coordinates for weather lookups.

export type TripLocation = {
  key: string; // normalized trip label as it appears in the log
  name: string; // display name
  region: string; // state / area
  lat: number;
  lon: number;
};

const LOCATIONS: TripLocation[] = [
  { key: "GREEN RIVER", name: "Green River", region: "UT", lat: 38.9953, lon: -110.1596 },
  { key: "JOE'S VALLEY", name: "Joe's Valley", region: "UT", lat: 39.2894, lon: -111.2094 },
  { key: "JOE'S", name: "Joe's Valley", region: "UT", lat: 39.2894, lon: -111.2094 },
  { key: "GOOSEBERRY", name: "Gooseberry Mesa", region: "UT", lat: 37.1616, lon: -113.1319 },
  { key: "RICHFIELD", name: "Richfield", region: "UT", lat: 38.7725, lon: -112.0838 },
  { key: "WILD I", name: "Wild Iris", region: "WY", lat: 42.5539, lon: -108.7264 },
  { key: "WOODWARD", name: "Woodward Park City", region: "UT", lat: 40.6866, lon: -111.5386 },
  { key: "VEGAS", name: "Las Vegas", region: "NV", lat: 36.1699, lon: -115.1398 },
  { key: "CA / VEGAS", name: "Las Vegas", region: "NV", lat: 36.1699, lon: -115.1398 },
  { key: "MOE'S VALLEY", name: "Moe's Valley", region: "UT", lat: 37.0669, lon: -113.6183 },
  { key: "CO", name: "Grand Junction", region: "CO", lat: 39.0639, lon: -108.5506 },
  { key: "STRAWBERRY", name: "Strawberry Reservoir", region: "UT", lat: 40.1708, lon: -111.1636 },
  { key: "OGDEN W.R.", name: "Ogden", region: "UT", lat: 41.223, lon: -111.9738 },
  { key: "SALT LAKE CITY", name: "Salt Lake City", region: "UT", lat: 40.7608, lon: -111.8910 },
  { key: "MOAB", name: "Moab", region: "UT", lat: 38.5733, lon: -109.5498 },
  { key: "CASTLE DALE", name: "Castle Dale", region: "UT", lat: 39.2125, lon: -111.0196 },
  { key: "ST GEORGE", name: "St. George", region: "UT", lat: 37.0965, lon: -113.5684 },
  { key: "KAMAS", name: "Kamas", region: "UT", lat: 40.6416, lon: -111.2802 },
  { key: "LANDER", name: "Lander", region: "WY", lat: 42.8327, lon: -108.7307 },
  { key: "ARCO", name: "Arco", region: "ID", lat: 43.6345, lon: -113.3003 },
  { key: "PINEDALE", name: "Pinedale", region: "WY", lat: 42.8666, lon: -109.8649 },
];

export function resolveTripLocation(trip: string): TripLocation | undefined {
  const norm = trip.trim().toUpperCase();
  if (!norm) return undefined;
  return LOCATIONS.find((l) => l.key === norm);
}

/** Unique visited locations, most recently visited first. */
export function visitedLocations(
  rows: Array<{ trip: string; date: string }>,
  limit = 6,
): Array<TripLocation & { visits: number; lastVisit: string }> {
  const acc = new Map<string, TripLocation & { visits: number; lastVisit: string }>();
  for (const r of rows) {
    const loc = resolveTripLocation(r.trip);
    if (!loc) continue;
    const id = `${loc.lat},${loc.lon}`;
    const prev = acc.get(id);
    if (prev) {
      prev.visits += 1;
      if (r.date > prev.lastVisit) prev.lastVisit = r.date;
    } else {
      acc.set(id, { ...loc, visits: 1, lastVisit: r.date });
    }
  }
  return Array.from(acc.values())
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))
    .slice(0, limit);
}
