import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";

export type DayForecast = {
  date: string;
  code: number;
  high: number;
  low: number;
  precipChance: number;
};

export type LocationForecast = {
  lat: number;
  lon: number;
  days: DayForecast[];
};

type Input = { points: Array<{ lat: number; lon: number }> };

export const getForecasts = createServerFn({ method: "GET" })
  .inputValidator((data: Input) => data)
  .handler(async ({ data }): Promise<LocationForecast[]> => {
    const points = data.points.slice(0, 12);
    if (!points.length) return [];

    const results = await Promise.all(
      points.map(async ({ lat, lon }): Promise<LocationForecast> => {
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`;
          const res = await fetch(url);
          if (!res.ok) return { lat, lon, days: [] };
          const json = (await res.json()) as {
            daily?: {
              time: string[];
              weather_code: number[];
              temperature_2m_max: number[];
              temperature_2m_min: number[];
              precipitation_probability_max: (number | null)[];
            };
          };
          const d = json.daily;
          if (!d) return { lat, lon, days: [] };
          return {
            lat,
            lon,
            days: d.time.map((date, i) => ({
              date,
              code: d.weather_code[i] ?? 0,
              high: Math.round(d.temperature_2m_max[i] ?? 0),
              low: Math.round(d.temperature_2m_min[i] ?? 0),
              precipChance: Math.round(d.precipitation_probability_max?.[i] ?? 0),
            })),
          };
        } catch {
          return { lat, lon, days: [] };
        }
      }),
    );
    return results;
  });

export function forecastQueryOptions(points: Array<{ lat: number; lon: number }>) {
  return queryOptions({
    queryKey: ["forecasts", points.map((p) => `${p.lat},${p.lon}`).join("|")],
    queryFn: () => getForecasts({ data: { points } }),
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    enabled: points.length > 0,
  });
}
