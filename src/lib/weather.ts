import { queryOptions } from "@tanstack/react-query";

export type DayForecast = {
  date: string;
  code: number;
  high: number;
  low: number;
  precipChance: number;
};

type DailyPayload = {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
};

/** Fetched directly from the browser so a single bad point can't blank the whole panel. */
export async function fetchForecast(lat: number, lon: number): Promise<DayForecast[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&temperature_unit=fahrenheit&timezone=auto&forecast_days=4`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast request failed [${res.status}]`);

  const json = (await res.json()) as DailyPayload;
  const d = json.daily;
  if (!d?.time?.length) throw new Error("Forecast response was empty");

  return d.time.map((date, i) => ({
    date,
    code: d.weather_code[i] ?? 0,
    high: Math.round(d.temperature_2m_max[i] ?? 0),
    low: Math.round(d.temperature_2m_min[i] ?? 0),
    precipChance: Math.round(d.precipitation_probability_max?.[i] ?? 0),
  }));
}

export function forecastQueryOptions(lat: number, lon: number) {
  return queryOptions({
    queryKey: ["forecast", lat, lon],
    queryFn: () => fetchForecast(lat, lon),
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
    retry: 2,
  });
}
