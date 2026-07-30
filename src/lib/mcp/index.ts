import { defineMcp } from "@lovable.dev/mcp-js";
import fleetSummaryTool from "./tools/fleet-summary";
import monthlyTotalsTool from "./tools/monthly-totals";
import listTripsTool from "./tools/list-trips";

export default defineMcp({
  name: "superapa",
  title: "SuperApa",
  version: "0.1.0",
  instructions:
    "Tools for SuperApa, the fleet log for the truck 'Dagger'. Use `get_fleet_summary` for lifetime totals, `get_monthly_totals` for month/year breakdowns, and `list_trips` for individual fuel log entries.",
  tools: [fleetSummaryTool, monthlyTotalsTool, listTripsTool],
});
