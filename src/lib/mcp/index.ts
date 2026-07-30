import { auth, defineMcp } from "@lovable.dev/mcp-js";
import fleetSummaryTool from "./tools/fleet-summary";
import monthlyTotalsTool from "./tools/monthly-totals";
import listTripsTool from "./tools/list-trips";

// Direct Supabase auth host is required as the OAuth issuer (the proxy URL
// publishes a different issuer and would fail RFC 8414 validation).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "superapa",
  title: "SuperApa",
  version: "0.1.0",
  instructions:
    "Tools for SuperApa, the fleet log for the truck 'Dagger'. Requires an authorized SuperApa account. Use `get_fleet_summary` for lifetime totals, `get_monthly_totals` for month/year breakdowns, and `list_trips` for individual fuel log entries.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [fleetSummaryTool, monthlyTotalsTool, listTripsTool],
});
