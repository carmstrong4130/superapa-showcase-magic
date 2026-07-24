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

export async function fetchTripRows(): Promise<TripRow[]> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const sheetsKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!lovableKey || !sheetsKey) {
    throw new Error("Google Sheets connection is not configured.");
  }

  const res = await fetch(`${GATEWAY}/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_RANGE}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": sheetsKey,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Sheets request failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets request failed [${res.status}]: ${body}`);
  }

  const data = (await res.json()) as { values?: string[][] };
  const values = data.values ?? [];

  return values
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
}
