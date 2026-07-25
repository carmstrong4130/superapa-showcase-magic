import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudRain, CloudSnow, Cloud, Sun, CloudSun, CloudLightning, CloudFog, Loader2, MapPin } from "lucide-react";
import { forecastQueryOptions } from "@/lib/weather.functions";
import type { TripRow } from "@/lib/dagger-data";

const FORECAST_LOCATIONS = [
  { name: "Salt Lake City", region: "UT", lat: 40.7608, lon: -111.8910 },
  { name: "Richfield", region: "UT", lat: 38.7725, lon: -112.0838 },
  { name: "Moab", region: "UT", lat: 38.5733, lon: -109.5498 },
];

function iconFor(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return CloudRain;
}

function dayLabel(date: string, index: number) {
  if (index === 0) return "Today";
  const d = new Date(date + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export function TripWeather({ rows }: { rows: TripRow[] }) {
  const points = useMemo(() => FORECAST_LOCATIONS.map((p) => ({ lat: p.lat, lon: p.lon })), [rows]);
  const { data, isLoading } = useQuery(forecastQueryOptions(points));

  if (!FORECAST_LOCATIONS.length) return null;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Forecast</div>
          <h2 className="text-lg font-semibold">Trip Locations</h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Next 4 days</div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading forecasts…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FORECAST_LOCATIONS.map((p) => {
          const fc = data?.find((f) => f.lat === p.lat && f.lon === p.lon);
          return (
            <div key={`${p.lat},${p.lon}`} className="rounded-lg border border-border/60 bg-surface-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate font-semibold text-sm">{p.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{p.region}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1">
                {(fc?.days ?? []).map((d, i) => {
                  const Icon = iconFor(d.code);
                  return (
                    <div key={d.date} className="rounded-md bg-background/40 px-1 py-2 text-center">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {dayLabel(d.date, i)}
                      </div>
                      <Icon className="mx-auto my-1 h-4 w-4 text-primary" />
                      <div className="font-mono text-xs font-semibold">{d.high}°</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{d.low}°</div>
                      {d.precipChance > 0 && (
                        <div className="font-mono text-[9px] text-sky-400">{d.precipChance}%</div>
                      )}
                    </div>
                  );
                })}
                {!fc?.days.length && !isLoading && (
                  <div className="col-span-4 py-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Forecast unavailable
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
