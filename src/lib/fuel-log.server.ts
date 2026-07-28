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

const BUCKET = "fuel-logs";

function fmt(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Apr 3 – Apr 28, 2025" style label derived from the rows in a photo. */
export function batchLabel(start: string, end: string): string {
  if (start === end) return fmt(start);
  const a = fmt(start);
  const b = fmt(end);
  return a.slice(-4) === b.slice(-4) ? `${a.slice(0, -6)} – ${b}` : `${a} – ${b}`;
}

export type BatchSummary = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  rowCount: number;
  imageUrl: string | null;
  createdAt: string;
  rows: Array<ExtractedRow & { id: string }>;
};

/** Stores the photo, creates a labelled batch, and inserts its rows. */
export async function saveFuelLogBatch(
  rows: ExtractedRow[],
  imageDataUrl: string | null,
): Promise<{ saved: number; batchId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const dates = rows.map((r) => r.date).sort();
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  let imagePath = "";
  if (imageDataUrl?.startsWith("data:image/")) {
    const [meta, b64] = imageDataUrl.split(",");
    const mime = meta.slice(5, meta.indexOf(";")) || "image/jpeg";
    const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    imagePath = `${startDate}_${endDate}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(imagePath, bytes, { contentType: mime, upsert: true });
    if (upErr) {
      console.error("Fuel log image upload failed", upErr);
      imagePath = "";
    }
  }

  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("fuel_log_batches")
    .insert({
      label: batchLabel(startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      image_path: imagePath,
      row_count: rows.length,
    })
    .select("id")
    .single();
  if (batchErr || !batch) throw new Error(batchErr?.message ?? "Couldn't create the log batch");

  const { data, error } = await supabaseAdmin
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
        batch_id: batch.id,
      })),
    )
    .select("id");
  if (error) throw new Error(error.message);
  return { saved: data?.length ?? 0, batchId: batch.id };
}

/** Every uploaded photo batch with its (editable) rows. */
export async function listFuelLogBatches(): Promise<BatchSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: batches, error } = await supabaseAdmin
    .from("fuel_log_batches")
    .select("id, label, start_date, end_date, image_path, created_at")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (batches ?? []).map((b) => b.id);
  const { data: entries } = ids.length
    ? await supabaseAdmin
        .from("trip_entries")
        .select("id, batch_id, entry_date, miles, gallons, price_per_gallon, total_cost, trip, notes")
        .in("batch_id", ids)
        .order("entry_date", { ascending: true })
    : { data: [] as never[] };

  return Promise.all(
    (batches ?? []).map(async (b) => {
      let imageUrl: string | null = null;
      if (b.image_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(b.image_path, 60 * 60);
        imageUrl = signed?.signedUrl ?? null;
      }
      const rows = (entries ?? [])
        .filter((e) => e.batch_id === b.id)
        .map((e) => ({
          id: e.id as string,
          date: String(e.entry_date),
          miles: Number(e.miles),
          gallons: Number(e.gallons),
          pricePerGallon: Number(e.price_per_gallon),
          totalCost: Number(e.total_cost),
          trip: e.trip ?? "",
          notes: e.notes ?? "",
        }));
      return {
        id: b.id as string,
        label: b.label ?? "",
        startDate: String(b.start_date),
        endDate: String(b.end_date),
        rowCount: rows.length,
        imageUrl,
        createdAt: String(b.created_at),
        rows,
      };
    }),
  );
}

/** Corrects a single row that was read from a photo. */
export async function updateTripEntry(id: string, row: ExtractedRow): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("trip_entries")
    .update({
      entry_date: row.date,
      miles: row.miles,
      gallons: row.gallons,
      price_per_gallon: row.pricePerGallon,
      total_cost: row.totalCost,
      trip: row.trip,
      notes: row.notes,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTripEntry(id: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("trip_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Removes a whole photo batch: its rows (cascade) and the stored image. */
export async function deleteFuelLogBatch(id: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: batch } = await supabaseAdmin
    .from("fuel_log_batches")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabaseAdmin.from("fuel_log_batches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (batch?.image_path) await supabaseAdmin.storage.from(BUCKET).remove([batch.image_path]);
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
