import { defineTool } from "@lovable.dev/mcp-js";
import { computeStats, DAGGER_VEHICLE } from "@/lib/dagger-data";

export default defineTool({
  name: "get_fleet_summary",
  title: "Get fleet summary",
  description:
    "Overall totals for the vehicle Dagger: total miles, gallons, fuel cost, fill-ups, average price per gallon and MPG.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const { fetchTripRows } = await import("@/lib/sheet.server");
    const rows = await fetchTripRows();
    const s = computeStats(rows);
    const summary = {
      vehicle: DAGGER_VEHICLE,
      totalMiles: Math.round(s.totalMiles),
      totalGallons: Number(s.totalGallons.toFixed(1)),
      totalFuelCost: Number(s.totalCost.toFixed(2)),
      fillUps: s.totalFillUps,
      avgPricePerGallon: Number(s.avgPricePerGallon.toFixed(2)),
      avgMPG: Number(s.avgMPG.toFixed(1)),
      costPerMile: Number(s.costPerMile.toFixed(3)),
      firstDate: s.firstDate,
      lastDate: s.lastDate,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
