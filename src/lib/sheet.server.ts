// Server-only: Dagger's trip log lives in the OneDrive workbook (single source of truth).
import type { TripRow } from "@/lib/dagger-data";
import trips from "@/data/trips.json";

export async function fetchTripRows(): Promise<TripRow[]> {
  try {
    const { readExcelRows } = await import("@/lib/excel.server");
    const rows = await readExcelRows();
    if (rows.length) {
      return rows.map(({ excelRow: _excelRow, source: _source, ...r }) => r);
    }
  } catch (err) {
    console.error("Excel read failed, falling back to bundled snapshot", err);
  }
  return (trips as TripRow[]).filter((r) => r.date !== "").sort((a, b) => a.date.localeCompare(b.date));
}
