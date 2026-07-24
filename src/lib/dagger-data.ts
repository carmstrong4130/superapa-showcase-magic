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
    { date: "2025-10-04", odometer: 42180, gallons: 22.4, pricePerGallon: 3.89, station: "Shell",     location: "Denver, CO" },
    { date: "2025-10-18", odometer: 42560, gallons: 21.8, pricePerGallon: 3.84, station: "Costco",    location: "Denver, CO" },
    { date: "2025-11-02", odometer: 42940, gallons: 23.2, pricePerGallon: 3.99, station: "Chevron",   location: "Boulder, CO" },
    { date: "2025-11-20", odometer: 43300, gallons: 22.1, pricePerGallon: 4.05, station: "Shell",     location: "Denver, CO" },
    { date: "2025-12-07", odometer: 43680, gallons: 23.5, pricePerGallon: 3.79, station: "Costco",    location: "Denver, CO" },
    { date: "2025-12-24", odometer: 44050, gallons: 22.9, pricePerGallon: 3.69, station: "7-Eleven",  location: "Colorado Springs, CO" },
    { date: "2026-01-09", odometer: 44420, gallons: 21.6, pricePerGallon: 3.72, station: "Shell",     location: "Denver, CO" },
    { date: "2026-01-27", odometer: 44790, gallons: 23.0, pricePerGallon: 3.65, station: "Costco",    location: "Denver, CO" },
    { date: "2026-02-11", odometer: 45170, gallons: 22.2, pricePerGallon: 3.81, station: "Chevron",   location: "Fort Collins, CO" },
    { date: "2026-02-28", odometer: 45540, gallons: 22.6, pricePerGallon: 3.85, station: "Shell",     location: "Denver, CO" },
    { date: "2026-03-15", odometer: 45920, gallons: 23.4, pricePerGallon: 4.02, station: "Costco",    location: "Denver, CO" },
    { date: "2026-04-02", odometer: 46310, gallons: 24.0, pricePerGallon: 4.15, station: "Shell",     location: "Salt Lake City, UT" },
    { date: "2026-04-19", odometer: 46690, gallons: 23.3, pricePerGallon: 4.18, station: "Chevron",   location: "Grand Junction, CO" },
    { date: "2026-05-05", odometer: 47060, gallons: 22.8, pricePerGallon: 4.31, station: "Costco",    location: "Denver, CO" },
    { date: "2026-05-22", odometer: 47440, gallons: 23.8, pricePerGallon: 4.39, station: "Shell",     location: "Denver, CO" },
    { date: "2026-06-08", odometer: 47830, gallons: 24.1, pricePerGallon: 4.49, station: "Chevron",   location: "Aspen, CO" },
    { date: "2026-06-26", odometer: 48210, gallons: 22.9, pricePerGallon: 4.55, station: "Costco",    location: "Denver, CO" },
    { date: "2026-07-12", odometer: 48580, gallons: 23.3, pricePerGallon: 4.59, station: "Shell",     location: "Denver, CO" },
    { date: "2026-07-30", odometer: 48960, gallons: 23.6, pricePerGallon: 4.45, station: "Costco",    location: "Denver, CO" },
    { date: "2026-08-16", odometer: 49340, gallons: 22.7, pricePerGallon: 4.29, station: "Chevron",   location: "Cheyenne, WY" },
    { date: "2026-09-01", odometer: 49720, gallons: 22.3, pricePerGallon: 4.12, station: "Shell",     location: "Denver, CO" },
    { date: "2026-09-19", odometer: 50100, gallons: 23.1, pricePerGallon: 4.05, station: "Costco",    location: "Denver, CO" },
    { date: "2026-10-06", odometer: 50490, gallons: 23.5, pricePerGallon: 4.09, station: "Shell",     location: "Moab, UT" },
    { date: "2026-10-22", odometer: 50870, gallons: 22.8, pricePerGallon: 4.01, station: "Chevron",   location: "Denver, CO" },
    { date: "2026-11-08", odometer: 51250, gallons: 23.3, pricePerGallon: 3.91, station: "Costco",    location: "Denver, CO" },
    { date: "2026-11-25", odometer: 51630, gallons: 23.0, pricePerGallon: 3.82, station: "Shell",     location: "Denver, CO" },
    { date: "2026-12-11", odometer: 52010, gallons: 23.4, pricePerGallon: 3.75, station: "Costco",    location: "Denver, CO" },
    { date: "2026-12-28", odometer: 52390, gallons: 22.6, pricePerGallon: 3.69, station: "Chevron",   location: "Vail, CO" },
    { date: "2027-01-14", odometer: 52770, gallons: 23.1, pricePerGallon: 3.74, station: "Shell",     location: "Denver, CO" },
    { date: "2027-02-01", odometer: 53160, gallons: 23.7, pricePerGallon: 3.89, station: "Costco",    location: "Denver, CO" },
    { date: "2027-02-18", odometer: 53540, gallons: 22.9, pricePerGallon: 3.98, station: "Shell",     location: "Denver, CO" },
    { date: "2027-03-07", odometer: 53920, gallons: 23.2, pricePerGallon: 4.15, station: "Chevron",   location: "Denver, CO" },
    { date: "2027-03-24", odometer: 54300, gallons: 23.5, pricePerGallon: 4.31, station: "Costco",    location: "Denver, CO" },
    { date: "2027-04-10", odometer: 54680, gallons: 23.0, pricePerGallon: 4.41, station: "Shell",     location: "Denver, CO" },
    { date: "2027-04-27", odometer: 55060, gallons: 23.5, pricePerGallon: 4.49, station: "Costco",    location: "Denver, CO" },
  ];
  return rows.map((r, i) => ({
    id: `f${String(i + 1).padStart(3, "0")}`,
    ...r,
    totalCost: Math.round(r.gallons * r.pricePerGallon * 100) / 100,
  }));
}

export const DAGGER_VEHICLE = {
  name: "Dagger",
  make: "GMC",
  model: "Sierra 2500 HD Denali",
  year: 2024,
  engine: "6.6L Duramax Diesel",
  tankGallons: 36.0,
  color: "Onyx Black",
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
