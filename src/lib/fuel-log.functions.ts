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

/** Appends reviewed rows to the trip log. */
export const saveFuelLogRows = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: ExtractedRow[] }) => {
    if (!Array.isArray(data?.rows) || data.rows.length === 0) throw new Error("No rows to save");
    if (data.rows.length > 100) throw new Error("Too many rows in one upload");
    return data;
  })
  .handler(async ({ data }): Promise<{ saved: number }> => {
    const { insertTripEntries } = await import("@/lib/fuel-log.server");
    return { saved: await insertTripEntries(data.rows) };
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

export type { TripRow };
