import { createServerFn } from "@tanstack/react-start";
import type { TripRow } from "@/lib/dagger-data";

export type ExtractedRow = {
  date: string;
  miles: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  trip: string;
  notes: string;
};

/** Reads a photo of a handwritten fuel log and returns structured rows (no saving). */
export const extractFuelLog = createServerFn({ method: "POST" })
  .inputValidator((data: { imageDataUrl: string }) => {
    if (!data?.imageDataUrl?.startsWith("data:image/")) throw new Error("Expected an image file");
    if (data.imageDataUrl.length > 12_000_000) throw new Error("Image is too large (max ~8MB)");
    return data;
  })
  .handler(async ({ data }): Promise<{ rows: ExtractedRow[] }> => {
    const { readFuelLogPhoto } = await import("@/lib/fuel-log.server");
    return { rows: await readFuelLogPhoto(data.imageDataUrl) };
  });

/** Saves reviewed rows as a labelled batch, keeping the source photo. */
export const saveFuelLogRows = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: ExtractedRow[]; imageDataUrl?: string }) => {
    if (!Array.isArray(data?.rows) || data.rows.length === 0) throw new Error("No rows to save");
    if (data.rows.length > 100) throw new Error("Too many rows in one upload");
    return data;
  })
  .handler(async ({ data }): Promise<{ saved: number; batchId: string }> => {
    const { saveFuelLogBatch } = await import("@/lib/fuel-log.server");
    return saveFuelLogBatch(data.rows, data.imageDataUrl ?? null);
  });

/** All uploaded photo batches with their rows, for review and correction. */
export const listFuelLogs = createServerFn({ method: "GET" }).handler(async () => {
  const { listFuelLogBatches } = await import("@/lib/fuel-log.server");
  return { batches: await listFuelLogBatches() };
});

/** Corrects one row inside a batch. */
export const updateFuelLogRow = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; row: ExtractedRow }) => {
    if (!data?.id) throw new Error("Missing id");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.row?.date ?? "")) throw new Error("Date must be YYYY-MM-DD");
    return data;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { updateTripEntry } = await import("@/lib/fuel-log.server");
    await updateTripEntry(data.id, data.row);
    return { ok: true };
  });

/** Removes a previously imported row (only photo-imported rows can be deleted). */
export const deleteFuelLogRow = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing id");
    return data;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteTripEntry } = await import("@/lib/fuel-log.server");
    await deleteTripEntry(data.id);
    return { ok: true };
  });

/** Removes an entire uploaded photo batch and every row that came from it. */
export const deleteFuelLogBatchFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    if (!data?.id) throw new Error("Missing id");
    return data;
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { deleteFuelLogBatch } = await import("@/lib/fuel-log.server");
    await deleteFuelLogBatch(data.id);
    return { ok: true };
  });

export type FuelLogBatch = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  rowCount: number;
  imageUrl: string | null;
  createdAt: string;
  rows: Array<ExtractedRow & { id: string }>;
};

export type { TripRow };
