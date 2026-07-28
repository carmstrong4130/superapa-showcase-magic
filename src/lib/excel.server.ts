// Server-only: OneDrive Excel workbook = the single source of truth for Dagger's log.
import type { TripRow } from "@/lib/dagger-data";

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_excel";
const ITEM_ID = "F61A6913C9249320!s0ec862760e704b3b847e65b0a810b6b9";
const SHEET = "Dagger Trip Data";

/** Columns: A Date | B Miles | C GAL | D CPG | E Cost | F Trip | G Source | H Notes */
export type ExcelTripRow = TripRow & { excelRow: number; source: string };

function sheetPath(suffix: string) {
  return `${GATEWAY}/me/drive/items/${encodeURIComponent(ITEM_ID)}/workbook/worksheets/${encodeURIComponent(SHEET)}${suffix}`;
}

async function graph(url: string, init?: RequestInit): Promise<Response> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.MICROSOFT_EXCEL_API_KEY;
  if (!lovableKey || !connKey) throw new Error("Excel connection is not configured for this project");

  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (res.ok) return res;
    lastErr = await res.text();
    console.error(`Excel request failed [${res.status}] ${url}: ${lastErr}`);
    if (res.status !== 429 && res.status !== 503 && res.status !== 504) {
      throw new Error(`Excel request failed (${res.status})`);
    }
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  throw new Error(`Excel request failed after retries: ${lastErr.slice(0, 200)}`);
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Excel serial dates and text dates both normalise to YYYY-MM-DD. */
function normalizeDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const serial = Number(s);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

let cache: { rows: ExcelTripRow[]; at: number } | null = null;
const TTL = 45_000;

export function invalidateExcelCache() {
  cache = null;
}

export async function readExcelRows(force = false): Promise<ExcelTripRow[]> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.rows;

  const res = await graph(
    sheetPath("/usedRange(valuesOnly=true)?$select=address,rowCount,text"),
  );
  const data = (await res.json()) as { text?: string[][] };
  const grid = data.text ?? [];

  const rows: ExcelTripRow[] = [];
  grid.forEach((cells, i) => {
    if (i === 0) return; // header
    const date = normalizeDate(cells[0]);
    if (!date) return;
    rows.push({
      id: `xl-${i + 1}`,
      excelRow: i + 1,
      date,
      miles: num(cells[1]),
      gallons: num(cells[2]),
      pricePerGallon: num(cells[3]),
      totalCost: num(cells[4]),
      trip: String(cells[5] ?? "").trim(),
      source: String(cells[6] ?? "").trim(),
      notes: String(cells[7] ?? "").trim(),
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date));
  cache = { rows, at: Date.now() };
  return rows;
}

type WriteRow = {
  date: string;
  miles: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  trip: string;
  notes: string;
};

const toValues = (r: WriteRow, source: string) => [
  r.date,
  r.miles,
  r.gallons,
  r.pricePerGallon,
  r.totalCost,
  r.trip ?? "",
  source,
  r.notes ?? "",
];

/** Appends fill-up rows to the bottom of the workbook. */
export async function appendExcelRows(rows: WriteRow[], source: string): Promise<number> {
  const res = await graph(sheetPath("/usedRange(valuesOnly=true)?$select=rowCount"));
  const { rowCount } = (await res.json()) as { rowCount: number };
  const start = rowCount + 1;
  const end = start + rows.length - 1;

  await graph(sheetPath(`/range(address='A${start}:H${end}')`), {
    method: "PATCH",
    body: JSON.stringify({ values: rows.map((r) => toValues(r, source)) }),
  });
  invalidateExcelCache();
  return start;
}

export async function updateExcelRow(excelRow: number, row: WriteRow, source: string): Promise<void> {
  await graph(sheetPath(`/range(address='A${excelRow}:H${excelRow}')`), {
    method: "PATCH",
    body: JSON.stringify({ values: [toValues(row, source)] }),
  });
  invalidateExcelCache();
}

export async function deleteExcelRow(excelRow: number): Promise<void> {
  await graph(sheetPath(`/range(address='A${excelRow}:H${excelRow}')/delete`), {
    method: "POST",
    body: JSON.stringify({ shift: "Up" }),
  });
  invalidateExcelCache();
}

/** Deletes bottom-up so earlier row numbers stay valid. */
export async function deleteExcelRows(excelRows: number[]): Promise<void> {
  for (const r of [...excelRows].sort((a, b) => b - a)) {
    await deleteExcelRow(r);
  }
}
