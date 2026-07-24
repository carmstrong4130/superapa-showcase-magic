import { createFileRoute, useRouter } from "@tanstack/react-router";
import { DaggerDashboard } from "@/components/DaggerDashboard";
import { tripRowsQueryOptions } from "@/lib/sheet.functions";

function LoadingState() {
  return (
    <div className="min-h-screen hud-grid grid place-items-center">
      <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
        Syncing trip log…
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div className="min-h-screen hud-grid grid place-items-center px-6">
      <div className="panel max-w-lg p-6 text-center" role="alert">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Data feed</div>
        <h1 className="mt-1 text-lg font-semibold">Couldn't load the trip log</h1>
        <p className="mt-2 text-sm text-muted-foreground break-words">{error.message}</p>
        <button
          onClick={() => router.invalidate()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:brightness-110"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dagger — superapa.com" },
      { name: "description", content: "Live fleet ops dashboard for Dagger: miles, fuel, cost, monthly trends, and an onboard AI copilot." },
      { property: "og:title", content: "Dagger — superapa.com" },
      { property: "og:description", content: "Live fleet ops dashboard for Dagger with an onboard AI copilot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tripRowsQueryOptions),
  pendingComponent: LoadingState,
  errorComponent: ErrorState,
  notFoundComponent: () => <LoadingState />,
  component: DaggerDashboard,
});
