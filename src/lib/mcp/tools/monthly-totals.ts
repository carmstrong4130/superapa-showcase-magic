import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { buildMonthlyLog, computeStats } from "@/lib/dagger-data";

export default defineTool({
  name: "get_monthly_totals",
  title: "Get monthly totals",
  description:
    "Monthly and annual totals (miles, gallons, fuel cost, MPG, fill-ups, trips) for Dagger, grouped by year.",
  inputSchema: {
    year: z.number().int().optional().describe("Optional year filter, e.g. 2025."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year }) => {
    const { fetchTripRows } = await import("@/lib/sheet.server");
    const rows = await fetchTripRows();
    const groups = buildMonthlyLog(computeStats(rows));
    const filtered = year ? groups.filter((g) => Number(g.year) === year) : groups;
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      structuredContent: { years: filtered },
    };
  },
});
