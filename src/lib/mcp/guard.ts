import type { ToolContext } from "@lovable.dev/mcp-js";

export const UNAUTHORIZED = {
  content: [{ type: "text" as const, text: "Not authenticated. Sign in to SuperApa to use this tool." }],
  isError: true,
};

export function isAuthorized(ctx: ToolContext | undefined) {
  return Boolean(ctx?.isAuthenticated?.());
}
