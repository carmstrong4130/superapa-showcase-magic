import { createFileRoute } from "@tanstack/react-router";
import { FILL_UPS, DAGGER_VEHICLE, computeStats } from "@/lib/dagger-data";

type ChatMessage = { role: "user" | "assistant" | "system" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAPS_GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

async function getDrivingDistance(origin: string, destination: string): Promise<string> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
    return JSON.stringify({ error: "Google Maps not configured" });
  }
  const res = await fetch(`${MAPS_GATEWAY}/routes/directions/v2:computeRoutes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
      "Content-Type": "application/json",
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs.startLocation,routes.legs.endLocation",
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
    }),
  });
  if (!res.ok) {
    return JSON.stringify({ error: `Google Maps error ${res.status}`, body: await res.text() });
  }
  const data = (await res.json()) as { routes?: Array<{ distanceMeters?: number; duration?: string }> };
  const route = data.routes?.[0];
  if (!route) return JSON.stringify({ error: "No route found" });
  const miles = route.distanceMeters ? route.distanceMeters / 1609.344 : 0;
  const durSec = route.duration ? parseInt(route.duration.replace("s", ""), 10) : 0;
  return JSON.stringify({
    origin,
    destination,
    distance_miles: Math.round(miles * 10) / 10,
    duration_minutes: Math.round(durSec / 60),
  });
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_driving_distance",
      description: "Get driving distance and duration between two addresses/cities using Google Maps.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin address or city, e.g. 'Denver, CO'" },
          destination: { type: "string", description: "Destination address or city" },
        },
        required: ["origin", "destination"],
      },
    },
  },
];

function buildSystemPrompt(): string {
  const stats = computeStats();
  return `You are the onboard AI assistant for a vehicle named "${DAGGER_VEHICLE.name}" (${DAGGER_VEHICLE.year} ${DAGGER_VEHICLE.make} ${DAGGER_VEHICLE.model}).

Answer questions about Dagger's fuel and mileage history using the JSON data below. Be concise and specific — cite numbers.
When a user asks about travel between places or trip fuel cost, call the get_driving_distance tool, then combine it with Dagger's average MPG (${stats.avgMPG}) and recent avg price per gallon ($${stats.avgPricePerGallon}) to estimate fuel needed and cost.

## Vehicle
${JSON.stringify(DAGGER_VEHICLE)}

## Summary stats
${JSON.stringify(stats, null, 2)}

## Raw fill-ups (${FILL_UPS.length} rows)
${JSON.stringify(FILL_UPS)}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages: ChatMessage[] };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const messages: ChatMessage[] = [
          { role: "system", content: buildSystemPrompt() },
          ...body.messages,
        ];

        // Tool loop (max 4 iterations)
        for (let i = 0; i < 4; i++) {
          const res = await fetch(GATEWAY, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
            },
            body: JSON.stringify({
              model: "google/gemini-3.6-flash",
              messages,
              tools: TOOLS,
            }),
          });
          if (!res.ok) {
            const text = await res.text();
            if (res.status === 429) return Response.json({ error: "Rate limited. Try again in a moment." }, { status: 429 });
            if (res.status === 402) return Response.json({ error: "AI credits exhausted. Please add credits in Lovable settings." }, { status: 402 });
            return Response.json({ error: `AI error ${res.status}: ${text}` }, { status: 500 });
          }
          const data = (await res.json()) as {
            choices: Array<{ message: { role: string; content: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>;
          };
          const msg = data.choices[0].message;

          if (msg.tool_calls && msg.tool_calls.length > 0) {
            messages.push(msg as ChatMessage);
            for (const call of msg.tool_calls) {
              let result = "";
              if (call.function.name === "get_driving_distance") {
                try {
                  const args = JSON.parse(call.function.arguments) as { origin: string; destination: string };
                  result = await getDrivingDistance(args.origin, args.destination);
                } catch (e) {
                  result = JSON.stringify({ error: String(e) });
                }
              } else {
                result = JSON.stringify({ error: `Unknown tool: ${call.function.name}` });
              }
              messages.push({ role: "tool", tool_call_id: call.id, content: result });
            }
            continue;
          }

          return Response.json({ reply: msg.content ?? "" });
        }
        return Response.json({ reply: "I couldn't complete that request." });
      },
    },
  },
});
