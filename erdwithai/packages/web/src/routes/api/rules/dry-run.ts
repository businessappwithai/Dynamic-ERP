import { createFileRoute } from "@tanstack/react-router";
import { rulesEngineService } from "@/lib/rules-engine";

export const Route = createFileRoute("/api/rules/dry-run")({ server: { handlers: {
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { jdm, context } = body;

      if (!jdm) {
        return new Response(JSON.stringify({ error: "Missing jdm" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (!context?.entity || !context?.metadata) {
        return new Response(
          JSON.stringify({ error: "Missing context.entity or context.metadata" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await rulesEngineService.dryRun(jdm, {
        entity: context.entity,
        relations: context.relations || {},
        metadata: context.metadata,
      });

      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error running dry run:", error);
      return new Response(JSON.stringify({ error: "Failed to run dry run" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
