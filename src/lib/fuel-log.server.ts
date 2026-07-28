// Server-only: photo -> structured fuel log rows, plus persistence in Lovable Cloud.
import type { ExtractedRow } from "@/lib/fuel-log.functions";
import type { TripRow } from "@/lib/dagger-data";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `You read photos of a handwritten or printed vehicle fuel/gas log and convert them to JSON.
Return ONLY a JSON object of the form:
{"rows":[{"date":"YYYY-MM-DD","miles":0,"gallons":0,"pricePerGallon":0,"totalCost":0,"trip":"","notes":""}]}
Rules:
- One object per log line / fill-up. Skip header rows and totals rows.
- date must be ISO YYYY-MM-DD. If the year is missing, infer it from surrounding rows or use the current year.
- miles = miles driven for that entry. gallons = gallons purchased.
- If pricePerGallon is missing but gallons and totalCost exist, compute it (and vice versa). Round money to 2 decimals.
- trip = destination or trip name written on the row, uppercase, else "".
- notes = anything else written on the row, else "".
- Numbers must be plain numbers, no currency symbols. If a value is unreadable, use 0.`;

function coerceRow(raw: Record<string, unknown>): ExtractedRow | null {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const date = String(raw.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  let gallons = num(raw.gallons);
  let pricePerGallon = num(raw.pricePerGallon);
  let totalCost = num(raw.totalCost);
  if (!totalCost && gallons && pricePerGallon) totalCost = gallons * pricePerGallon;
  if (!pricePerGallon && gallons && totalCost) pricePerGallon = totalCost / gallons;
  if (!gallons && pricePerGallon && totalCost) gallons = totalCost / pricePerGallon;

  return {
    date,
    miles: Math.round(num(raw.miles) * 10) / 10,
    gallons: Math.round(gallons * 10) / 10,
    pricePerGallon: Math.round(pricePerGallon * 1000) / 1000,
    totalCost: Math.round(totalCost * 100) / 100,
    trip: String(raw.trip ?? "").trim().toUpperCase(),
    notes: String(raw.notes ?? "").trim(),
  };
}

export async function readFuelLogPhoto(imageDataUrl: string): Promise<ExtractedRow[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI is not configured for this project");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: `Today is ${new Date().toISOString().slice(0, 10)}. Extract every fill-up row from this fuel log photo.` },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`AI gateway failed [${res.status}]: ${body}`);
    if (res.status === 429) throw new Error("Rate limited — wait a moment and try again.");
    throw new Error(`Couldn't read the photo (${res.status}).`);
  }

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No log rows were found in that photo.");

  let parsed: { rows?: Array<Record<string, unknown>> };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Couldn't understand the log in that photo.");
  }

  const rows = (parsed.rows ?? []).map(coerceRow).filter((r): r is ExtractedRow => r !== null);
  if (!rows.length) throw new Error("No readable fill-up rows were found in that photo.");
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

export async function insertTripEntries(rows: ExtractedRow[]): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error, data } = await supabaseAdmin
    .from("trip_entries")
    .insert(
      rows.map((r) => ({
        entry_date: r.date,
        miles: r.miles,
        gallons: r.gallons,
        price_per_gallon: r.pricePerGallon,
        total_cost: r.totalCost,
        trip: r.trip,
        notes: r.notes,
        source: "photo",
      })),
    )
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function deleteTripEntry(id: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("trip_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Photo-imported rows, shaped like the bundled spreadsheet rows. */
export async function fetchImportedTripRows(): Promise<TripRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("trip_entries")
    .select("id, entry_date, miles, gallons, price_per_gallon, total_cost, trip, notes")
    .order("entry_date", { ascending: true });
  if (error) {
    console.error("Failed to read imported trip entries", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: `db-${r.id}`,
    date: String(r.entry_date),
    miles: Number(r.miles),
    gallons: Number(r.gallons),
    pricePerGallon: Number(r.price_per_gallon),
    totalCost: Number(r.total_cost),
    trip: r.trip ?? "",
    notes: r.notes ?? "",
  }));
}
