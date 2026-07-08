import { createFileRoute } from "@tanstack/react-router";
import { rulesEngineService } from "@/lib/rules-engine";

export const Route = createFileRoute("/api/rules/validate")({ server: { handlers: {
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { jdm } = body;

      if (!jdm) {
        return new Response(JSON.stringify({ error: "Missing JDM content" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await rulesEngineService.validateRule(jdm);

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error validating rule:", error);
      return new Response(JSON.stringify({ error: "Failed to validate rule" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
