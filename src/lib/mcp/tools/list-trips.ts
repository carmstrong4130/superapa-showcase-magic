import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { TripRow } from "@/lib/dagger-data";

export default defineTool({
  name: "list_trips",
  title: "List trip / fuel log entries",
  description:
    "List individual fuel log entries for Dagger (date, miles, gallons, price per gallon, cost, trip, notes), newest first.",
  inputSchema: {
    limit: z.number().int().optional().describe("Max entries to return. Defaults to 25."),
    from: z.string().optional().describe("Only entries on or after this ISO date (YYYY-MM-DD)."),
    to: z.string().optional().describe("Only entries on or before this ISO date (YYYY-MM-DD)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, from, to }) => {
    const { fetchTripRows } = await import("@/lib/sheet.server");
    const rows: TripRow[] = await fetchTripRows();
    const filtered = rows
      .filter((r) => (!from || r.date >= from) && (!to || r.date <= to))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, Math.min(Math.max(limit ?? 25, 1), 200));
    return {
      content: [{ type: "text", text: JSON.stringify(filtered, null, 2) }],
      structuredContent: { count: filtered.length, entries: filtered },
    };
  },
});
