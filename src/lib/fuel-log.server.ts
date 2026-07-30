// Server-only: photo -> structured fuel log rows, plus persistence in Lovable Cloud.
import type { ExtractedRow } from "@/lib/fuel-log.functions";
import { unresolvedFields, type DraftRow, type NumericField } from "@/lib/dagger-data";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM = `You read photos of a handwritten or printed vehicle fuel/gas log and convert them to JSON.
Return ONLY a JSON object of the form:
{"rows":[{"date":"YYYY-MM-DD","miles":0,"gallons":0,"pricePerGallon":0,"totalCost":0,"trip":"","notes":""}]}
Any of the four numbers may be null instead — see the rules.
Rules:
- One object per log line / fill-up. Skip header rows and totals rows.
- date must be ISO YYYY-MM-DD. If the year is missing, infer it from surrounding rows or use the current year.
- miles = miles driven for that entry. gallons = gallons purchased.
- If a number is unreadable, smudged, ambiguous, or simply not written, use null. Never guess, and never use 0 as a stand-in: 0 means you clearly read a zero. A person checks every null before the row is saved, so null is always the safe answer.
- Do not work out a missing money value yourself. Leave it null; it gets derived afterwards and shown as calculated.
- trip = destination or trip name written on the row, uppercase, else "". Put it only on the row it is actually written on — do not repeat it on the later rows of a multi-tank trip.
- notes = anything else written on the row, else "".
- Numbers must be plain numbers, no currency symbols.`;

/** null when the photo didn't clearly show a number. 0 is only ever a legible zero. */
function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const round = (n: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
};

function coerceRow(raw: Record<string, unknown>): DraftRow | null {
  const date = String(raw.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const miles = toNumberOrNull(raw.miles);
  let gallons = toNumberOrNull(raw.gallons);
  let pricePerGallon = toNumberOrNull(raw.pricePerGallon);
  let totalCost = toNumberOrNull(raw.totalCost);

  // Filling in the one missing money column from the other two is arithmetic, not a
  // guess — but it still gets flagged so the number is checked rather than trusted.
  const computedFields: NumericField[] = [];
  if (totalCost === null && gallons !== null && pricePerGallon !== null) {
    totalCost = gallons * pricePerGallon;
    computedFields.push("totalCost");
  } else if (pricePerGallon === null && gallons !== null && gallons !== 0 && totalCost !== null) {
    pricePerGallon = totalCost / gallons;
    computedFields.push("pricePerGallon");
  } else if (gallons === null && pricePerGallon !== null && pricePerGallon !== 0 && totalCost !== null) {
    gallons = totalCost / pricePerGallon;
    computedFields.push("gallons");
  }

  const row: DraftRow = {
    date,
    miles: miles === null ? null : round(miles, 1),
    gallons: gallons === null ? null : round(gallons, 1),
    pricePerGallon: pricePerGallon === null ? null : round(pricePerGallon, 3),
    totalCost: totalCost === null ? null : round(totalCost, 2),
    trip: String(raw.trip ?? "").trim().toUpperCase(),
    notes: String(raw.notes ?? "").trim(),
    uncertainFields: [],
    computedFields,
  };
  row.uncertainFields = unresolvedFields(row);
  return row;
}

export async function readFuelLogPhoto(imageDataUrl: string): Promise<DraftRow[]> {
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

  const rows = (parsed.rows ?? []).map(coerceRow).filter((r): r is DraftRow => r !== null);
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

/** Stores the photo, creates a labelled batch, and appends its rows to the Excel workbook. */
export async function saveFuelLogBatch(
  rows: ExtractedRow[],
  imageDataUrl: string | null,
): Promise<{ saved: number; batchId: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { appendExcelRows } = await import("@/lib/excel.server");

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

  // The Source cell tags each Excel row with the photo it came from.
  const sourceTag = imagePath || `photo_${startDate}_${endDate}`;
  await appendExcelRows(rows, sourceTag);

  const { data: batch, error: batchErr } = await supabaseAdmin
    .from("fuel_log_batches")
    .insert({
      label: batchLabel(startDate, endDate),
      start_date: startDate,
      end_date: endDate,
      image_path: imagePath,
      source_tag: sourceTag,
      row_count: rows.length,
    })
    .select("id")
    .single();
  if (batchErr || !batch) throw new Error(batchErr?.message ?? "Couldn't create the log batch");

  return { saved: rows.length, batchId: batch.id as string };
}

/** Every uploaded photo batch with its (editable) rows, read live from Excel. */
export async function listFuelLogBatches(): Promise<BatchSummary[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { readExcelRows } = await import("@/lib/excel.server");

  const { data: batches, error } = await supabaseAdmin
    .from("fuel_log_batches")
    .select("id, label, start_date, end_date, image_path, source_tag, created_at")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);

  const excelRows = await readExcelRows(true);

  return Promise.all(
    (batches ?? []).map(async (b) => {
      let imageUrl: string | null = null;
      if (b.image_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(b.image_path, 60 * 60);
        imageUrl = signed?.signedUrl ?? null;
      }
      const tag = (b.source_tag as string) || (b.image_path as string) || "";
      const rows = excelRows
        .filter((r) => tag && r.source === tag)
        .map((r) => ({
          id: String(r.excelRow),
          date: r.date,
          miles: r.miles,
          gallons: r.gallons,
          pricePerGallon: r.pricePerGallon,
          totalCost: r.totalCost,
          trip: r.trip,
          notes: r.notes,
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

/** Corrects a single row directly in the Excel workbook. */
export async function updateTripEntry(id: string, row: ExtractedRow): Promise<void> {
  const { readExcelRows, updateExcelRow } = await import("@/lib/excel.server");
  const excelRow = Number(id);
  if (!Number.isFinite(excelRow)) throw new Error("Unknown row");
  const existing = (await readExcelRows(true)).find((r) => r.excelRow === excelRow);
  await updateExcelRow(excelRow, row, existing?.source ?? "");
}

export async function deleteTripEntry(id: string): Promise<void> {
  const { deleteExcelRow } = await import("@/lib/excel.server");
  const excelRow = Number(id);
  if (!Number.isFinite(excelRow)) throw new Error("Unknown row");
  await deleteExcelRow(excelRow);
}

/** Removes a whole photo batch: its Excel rows, the batch record, and the stored image. */
export async function deleteFuelLogBatch(id: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { readExcelRows, deleteExcelRows } = await import("@/lib/excel.server");

  const { data: batch } = await supabaseAdmin
    .from("fuel_log_batches")
    .select("image_path, source_tag")
    .eq("id", id)
    .maybeSingle();

  const tag = (batch?.source_tag as string) || (batch?.image_path as string) || "";
  if (tag) {
    const rows = (await readExcelRows(true)).filter((r) => r.source === tag).map((r) => r.excelRow);
    if (rows.length) await deleteExcelRows(rows);
  }

  const { error } = await supabaseAdmin.from("fuel_log_batches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (batch?.image_path) await supabaseAdmin.storage.from(BUCKET).remove([batch.image_path]);
}

