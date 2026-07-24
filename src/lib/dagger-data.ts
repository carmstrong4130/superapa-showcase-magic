// Historical fuel fill-ups for the vehicle "Dagger".
// Seeded, realistic-looking data spanning ~14 months.

export type FillUp = {
  id: string;
  date: string; // ISO
  odometer: number; // miles
  gallons: number;
  pricePerGallon: number;
  totalCost: number; // gallons * pricePerGallon
  station: string;
  location: string; // "City, ST"
};

// Generated deterministically so numbers add up.
function build(): FillUp[] {
  const rows: Array<Omit<FillUp, "id" | "totalCost">> = [
    { date: "2025-10-04", odometer: 42180, gallons: 13.8, pricePerGallon: 3.29, station: "Shell",     location: "Denver, CO" },
    { date: "2025-10-18", odometer: 42512, gallons: 12.6, pricePerGallon: 3.24, station: "Costco",    location: "Denver, CO" },
    { date: "2025-11-02", odometer: 42870, gallons: 13.9, pricePerGallon: 3.35, station: "Chevron",   location: "Boulder, CO" },
    { date: "2025-11-20", odometer: 43220, gallons: 13.1, pricePerGallon: 3.41, station: "Shell",     location: "Denver, CO" },
    { date: "2025-12-07", odometer: 43601, gallons: 14.2, pricePerGallon: 3.19, station: "Costco",    location: "Denver, CO" },
    { date: "2025-12-24", odometer: 43990, gallons: 13.6, pricePerGallon: 3.09, station: "7-Eleven",  location: "Colorado Springs, CO" },
    { date: "2026-01-09", odometer: 44338, gallons: 12.8, pricePerGallon: 3.11, station: "Shell",     location: "Denver, CO" },
    { date: "2026-01-27", odometer: 44712, gallons: 13.9, pricePerGallon: 3.05, station: "Costco",    location: "Denver, CO" },
    { date: "2026-02-11", odometer: 45061, gallons: 13.2, pricePerGallon: 3.18, station: "Chevron",   location: "Fort Collins, CO" },
    { date: "2026-02-28", odometer: 45418, gallons: 13.5, pricePerGallon: 3.22, station: "Shell",     location: "Denver, CO" },
    { date: "2026-03-15", odometer: 45790, gallons: 14.0, pricePerGallon: 3.35, station: "Costco",    location: "Denver, CO" },
    { date: "2026-04-02", odometer: 46180, gallons: 14.4, pricePerGallon: 3.49, station: "Shell",     location: "Salt Lake City, UT" },
    { date: "2026-04-19", odometer: 46551, gallons: 13.7, pricePerGallon: 3.52, station: "Chevron",   location: "Grand Junction, CO" },
    { date: "2026-05-05", odometer: 46912, gallons: 13.4, pricePerGallon: 3.61, station: "Costco",    location: "Denver, CO" },
    { date: "2026-05-22", odometer: 47289, gallons: 14.1, pricePerGallon: 3.68, station: "Shell",     location: "Denver, CO" },
    { date: "2026-06-08", odometer: 47670, gallons: 14.3, pricePerGallon: 3.74, station: "Chevron",   location: "Aspen, CO" },
    { date: "2026-06-26", odometer: 48041, gallons: 13.6, pricePerGallon: 3.79, station: "Costco",    location: "Denver, CO" },
    { date: "2026-07-12", odometer: 48412, gallons: 13.8, pricePerGallon: 3.82, station: "Shell",     location: "Denver, CO" },
    { date: "2026-07-30", odometer: 48788, gallons: 14.0, pricePerGallon: 3.71, station: "Costco",    location: "Denver, CO" },
    { date: "2026-08-16", odometer: 49155, gallons: 13.5, pricePerGallon: 3.58, station: "Chevron",   location: "Cheyenne, WY" },
    { date: "2026-09-01", odometer: 49512, gallons: 13.2, pricePerGallon: 3.44, station: "Shell",     location: "Denver, CO" },
    { date: "2026-09-19", odometer: 49881, gallons: 13.8, pricePerGallon: 3.39, station: "Costco",    location: "Denver, CO" },
    { date: "2026-10-06", odometer: 50260, gallons: 14.1, pricePerGallon: 3.42, station: "Shell",     location: "Moab, UT" },
    { date: "2026-10-22", odometer: 50628, gallons: 13.6, pricePerGallon: 3.36, station: "Chevron",   location: "Denver, CO" },
    { date: "2026-11-08", odometer: 50999, gallons: 13.9, pricePerGallon: 3.28, station: "Costco",    location: "Denver, CO" },
    { date: "2026-11-25", odometer: 51370, gallons: 13.7, pricePerGallon: 3.19, station: "Shell",     location: "Denver, CO" },
    { date: "2026-12-11", odometer: 51742, gallons: 14.0, pricePerGallon: 3.14, station: "Costco",    location: "Denver, CO" },
    { date: "2026-12-28", odometer: 52108, gallons: 13.5, pricePerGallon: 3.09, station: "Chevron",   location: "Vail, CO" },
    { date: "2027-01-14", odometer: 52478, gallons: 13.8, pricePerGallon: 3.12, station: "Shell",     location: "Denver, CO" },
    { date: "2027-02-01", odometer: 52859, gallons: 14.2, pricePerGallon: 3.24, station: "Costco",    location: "Denver, CO" },
    { date: "2027-02-18", odometer: 53230, gallons: 13.7, pricePerGallon: 3.31, station: "Shell",     location: "Denver, CO" },
    { date: "2027-03-07", odometer: 53602, gallons: 13.9, pricePerGallon: 3.44, station: "Chevron",   location: "Denver, CO" },
    { date: "2027-03-24", odometer: 53975, gallons: 14.0, pricePerGallon: 3.58, station: "Costco",    location: "Denver, CO" },
    { date: "2027-04-10", odometer: 54348, gallons: 13.8, pricePerGallon: 3.66, station: "Shell",     location: "Denver, CO" },
    { date: "2027-04-27", odometer: 54721, gallons: 14.1, pricePerGallon: 3.71, station: "Costco",    location: "Denver, CO" },
  ];
  return rows.map((r, i) => ({
    id: `f${String(i + 1).padStart(3, "0")}`,
    ...r,
    totalCost: Math.round(r.gallons * r.pricePerGallon * 100) / 100,
  }));
}

export const DAGGER_VEHICLE = {
  name: "Dagger",
  make: "Toyota",
  model: "4Runner TRD Off-Road",
  year: 2019,
  tankGallons: 23.0,
  color: "Cement Gray",
};

export const FILL_UPS: FillUp[] = build();

export type DerivedStats = {
  totalFillUps: number;
  totalGallons: number;
  totalCost: number;
  avgPricePerGallon: number;
  firstOdo: number;
  lastOdo: number;
  totalMiles: number; // last - first
  avgMPG: number;
  costPerMile: number;
  monthly: Array<{
    month: string; // YYYY-MM
    label: string; // "Apr '26"
    miles: number;
    gallons: number;
    cost: number;
    fillUps: number;
  }>;
};

export function computeStats(rows: FillUp[] = FILL_UPS): DerivedStats {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const totalGallons = sorted.reduce((s, r) => s + r.gallons, 0);
  const totalCost = sorted.reduce((s, r) => s + r.totalCost, 0);
  const firstOdo = sorted[0].odometer;
  const lastOdo = sorted[sorted.length - 1].odometer;
  const totalMiles = lastOdo - firstOdo;
  // Gallons used to travel totalMiles are gallons purchased AFTER the first tank
  const gallonsAfterFirst = totalGallons - sorted[0].gallons;
  const avgMPG = gallonsAfterFirst > 0 ? totalMiles / gallonsAfterFirst : 0;

  const byMonth = new Map<
    string,
    { miles: number; gallons: number; cost: number; fillUps: number; firstOdo: number; lastOdo: number }
  >();
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const m = r.date.slice(0, 7);
    const prev = byMonth.get(m);
    const milesThis = i > 0 ? r.odometer - sorted[i - 1].odometer : 0;
    if (!prev) {
      byMonth.set(m, {
        miles: milesThis,
        gallons: r.gallons,
        cost: r.totalCost,
        fillUps: 1,
        firstOdo: r.odometer,
        lastOdo: r.odometer,
      });
    } else {
      prev.miles += milesThis;
      prev.gallons += r.gallons;
      prev.cost += r.totalCost;
      prev.fillUps += 1;
      prev.lastOdo = r.odometer;
    }
  }
  const monthly = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => {
      const d = new Date(month + "-01T00:00:00Z");
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
      return {
        month,
        label,
        miles: v.miles,
        gallons: Math.round(v.gallons * 10) / 10,
        cost: Math.round(v.cost * 100) / 100,
        fillUps: v.fillUps,
      };
    });

  return {
    totalFillUps: sorted.length,
    totalGallons: Math.round(totalGallons * 10) / 10,
    totalCost: Math.round(totalCost * 100) / 100,
    avgPricePerGallon: Math.round((totalCost / totalGallons) * 1000) / 1000,
    firstOdo,
    lastOdo,
    totalMiles,
    avgMPG: Math.round(avgMPG * 10) / 10,
    costPerMile: Math.round((totalCost / totalMiles) * 1000) / 1000,
    monthly,
  };
}
