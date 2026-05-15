import { createAPIFileRoute } from "@tanstack/start/api";

export const Route = createAPIFileRoute("/api/health")({
  GET: async () => {
    return new Response(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
