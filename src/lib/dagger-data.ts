// Data model for Dagger's trip/fuel log. Rows come from src/data/trips.json.

export type TripRow = {
  id: string;
  date: string; // ISO YYYY-MM-DD
  miles: number;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  trip: string; // destination / trip nickname
  notes: string;
};

export const DAGGER_VEHICLE = {
  name: "Dagger",
  make: "GMC",
  model: "Sierra 2500 HD Denali",
  year: 2024,
  engine: "6.6L Duramax Diesel",
  tankGallons: 36.0,
  color: "Onyx Black",
};

export type DerivedStats = {
  totalFillUps: number;
  totalMiles: number; // sum of the Miles column
  totalGallons: number;
  totalCost: number;
  avgPricePerGallon: number;
  avgMPG: number;
  costPerMile: number;
  firstDate: string;
  lastDate: string;
  monthly: Array<{
    month: string; // YYYY-MM
    label: string; // "Apr '24"
    miles: number;
    gallons: number;
    cost: number;
    fillUps: number;
    trips: number;
  }>;
};

const EMPTY_STATS: DerivedStats = {
  totalFillUps: 0,
  totalMiles: 0,
  totalGallons: 0,
  totalCost: 0,
  avgPricePerGallon: 0,
  avgMPG: 0,
  costPerMile: 0,
  firstDate: "",
  lastDate: "",
  monthly: [],
};

export function computeStats(rows: TripRow[]): DerivedStats {
  if (!rows.length) return EMPTY_STATS;
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));

  const totalMiles = sorted.reduce((s, r) => s + r.miles, 0);
  const totalGallons = sorted.reduce((s, r) => s + r.gallons, 0);
  const totalCost = sorted.reduce((s, r) => s + r.totalCost, 0);

  const byMonth = new Map<string, { miles: number; gallons: number; cost: number; fillUps: number; trips: number }>();
  for (const r of sorted) {
    const m = r.date.slice(0, 7);
    const prev = byMonth.get(m) ?? { miles: 0, gallons: 0, cost: 0, fillUps: 0, trips: 0 };
    prev.miles += r.miles;
    prev.gallons += r.gallons;
    prev.cost += r.totalCost;
    prev.fillUps += 1;
    if (r.trip && r.trip.trim()) prev.trips += 1;
    byMonth.set(m, prev);
  }

  const monthly = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const d = new Date(month + "-01T00:00:00Z");
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
      return {
        month,
        label,
        miles: Math.round(v.miles * 10) / 10,
        gallons: Math.round(v.gallons * 10) / 10,
        cost: Math.round(v.cost * 100) / 100,
        fillUps: v.fillUps,
        trips: v.trips,
      };
    });

  const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

  return {
    totalFillUps: sorted.length,
    totalMiles: round(totalMiles, 1),
    totalGallons: round(totalGallons, 1),
    totalCost: round(totalCost, 2),
    avgPricePerGallon: totalGallons > 0 ? round(totalCost / totalGallons, 3) : 0,
    avgMPG: totalGallons > 0 ? round(totalMiles / totalGallons, 1) : 0,
    costPerMile: totalMiles > 0 ? round(totalCost / totalMiles, 3) : 0,
    firstDate: sorted[0].date,
    lastDate: sorted[sorted.length - 1].date,
    monthly,
  };
}

export type MonthlyRow = {
  month: string; // YYYY-MM
  label: string; // "Apr"
  miles: number;
  gallons: number;
  cost: number;
  fillUps: number;
  mpg: number;
  trips: number;
};

export type YearGroup = {
  year: number;
  months: MonthlyRow[];
  totals: Omit<MonthlyRow, "month" | "label">;
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * Continuous month-by-month log from `startMonth` (default Apr 2024) through the
 * current month, with zero-filled gaps, grouped by calendar year with subtotals.
 */
export function buildMonthlyLog(stats: DerivedStats, startMonth = "2024-04"): YearGroup[] {
  const byMonth = new Map(stats.monthly.map((m) => [m.month, m]));
  const now = new Date();
  const endY = now.getUTCFullYear();
  const endM = now.getUTCMonth() + 1;

  let [y, m] = startMonth.split("-").map(Number);
  const groups: YearGroup[] = [];

  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const src = byMonth.get(key);
    const row: MonthlyRow = {
      month: key,
      label: MONTH_NAMES[m - 1],
      miles: src?.miles ?? 0,
      gallons: src?.gallons ?? 0,
      cost: src?.cost ?? 0,
      fillUps: src?.fillUps ?? 0,
      trips: src?.trips ?? 0,
      mpg: src && src.gallons > 0 ? Math.round((src.miles / src.gallons) * 10) / 10 : 0,
    };
    let group = groups.find((g) => g.year === y);
    if (!group) {
      group = { year: y, months: [], totals: { miles: 0, gallons: 0, cost: 0, fillUps: 0, mpg: 0, trips: 0 } };
      groups.push(group);
    }
    group!.months.push(row);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }

  for (const g of groups) {
    const miles = g.months.reduce((s, r) => s + r.miles, 0);
    const gallons = g.months.reduce((s, r) => s + r.gallons, 0);
    const cost = g.months.reduce((s, r) => s + r.cost, 0);
    const fillUps = g.months.reduce((s, r) => s + r.fillUps, 0);
    const trips = g.months.reduce((s, r) => s + r.trips, 0);
    g.totals = {
      miles: Math.round(miles * 10) / 10,
      gallons: Math.round(gallons * 10) / 10,
      cost: Math.round(cost * 100) / 100,
      fillUps,
      trips,
      mpg: gallons > 0 ? Math.round((miles / gallons) * 10) / 10 : 0,
    };
  }

  return groups;
}
