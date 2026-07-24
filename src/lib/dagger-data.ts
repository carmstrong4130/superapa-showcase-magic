// Data model for Dagger's trip/fuel log. Rows come live from Google Sheets.

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

  const byMonth = new Map<string, { miles: number; gallons: number; cost: number; fillUps: number }>();
  for (const r of sorted) {
    const m = r.date.slice(0, 7);
    const prev = byMonth.get(m) ?? { miles: 0, gallons: 0, cost: 0, fillUps: 0 };
    prev.miles += r.miles;
    prev.gallons += r.gallons;
    prev.cost += r.totalCost;
    prev.fillUps += 1;
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
