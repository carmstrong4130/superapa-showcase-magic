// Server-only: reads Dagger's trip log from the connected Google Sheet.
import type { TripRow } from "@/lib/dagger-data";

const SPREADSHEET_ID = "11LRb5FJ7e5i99NprcsdEeUmjdvM6fVdESVD0Q1qeFR4";
const SHEET_RANGE = "Dagger Trip Data!A2:H";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function normalizeDate(v: string | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

let cache: { rows: TripRow[]; at: number } | undefined;
const CACHE_MS = 60_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchTripRows(): Promise<TripRow[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.rows;

  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) {
    if (cache) return cache.rows;
    throw new Error("Google Sheets connection is not configured.");
  }

  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(`${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": sheetsKey,
      },
    });
    if (res.ok) break;
    if (res.status !== 429 && res.status < 500) break;
    await sleep(400 * 2 ** attempt);
  }

  if (!res || !res.ok) {
    const body = res ? await res.text() : "no response";
    console.error(`Google Sheets request failed [${res?.status ?? 0}]: ${body}`);
    // Serve last known good data instead of blanking the page.
    if (cache) return cache.rows;
    throw new Error(`Google Sheets request failed [${res?.status ?? 0}]`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const values = data.values ?? [];

  const rows = values

    .map((row, i) => {
      const [date, miles, gal, cpg, cost, trip, , notes] = row;
      const gallons = num(gal);
      const pricePerGallon = num(cpg);
      const totalCost = num(cost) || Math.round(gallons * pricePerGallon * 100) / 100;
      return {
        id: `r${i + 1}`,
        date: normalizeDate(date),
        miles: num(miles),
        gallons,
        pricePerGallon,
        totalCost,
        trip: (trip ?? "").trim(),
        notes: (notes ?? "").trim(),
      } satisfies TripRow;
    })
    .filter((r) => r.date !== "");

  cache = { rows, at: Date.now() };
  return rows;
}

