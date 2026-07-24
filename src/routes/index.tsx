import { createFileRoute } from "@tanstack/react-router";
import { DaggerDashboard } from "@/components/DaggerDashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dagger — superapa.com" },
      { name: "description", content: "Fleet ops dashboard for Dagger: miles, fuel, cost, monthly trends, and an onboard AI copilot." },
      { property: "og:title", content: "Dagger — superapa.com" },
      { property: "og:description", content: "Fleet ops dashboard for Dagger with an onboard AI copilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DaggerDashboard,
});
