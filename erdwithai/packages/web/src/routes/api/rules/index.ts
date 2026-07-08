import { createFileRoute } from "@tanstack/react-router";
import { rulesDb, runMigrations } from "@erdwithai/core/services";
import { rulesEngineService } from "@/lib/rules-engine";

let _dbReady = false;
async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[DB] Migration error:", err));
  }
}

export const Route = createFileRoute("/api/rules/")({ server: { handlers: {
  GET: async ({ request }) => {
    await ensureDb();
    try {
      const url = new URL(request.url);
      const entityName = url.searchParams.get("entityName") ?? undefined;
      const operation = url.searchParams.get("operation") ?? undefined;

      const rules = await rulesDb.findAll({ entityName, operation });

      return new Response(JSON.stringify({ rules }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching rules:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch rules" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },

  POST: async ({ request }) => {
    await ensureDb();
    try {
      const body = await request.json();
      const { entityName, ruleName, operation, jdmContent, isActive, priority } = body;

      if (!entityName || !ruleName || !operation || !jdmContent) {
        return new Response(JSON.stringify({ error: "Missing required fields: entityName, ruleName, operation, jdmContent" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const validation = await rulesEngineService.validateRule(jdmContent);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: "Invalid JDM content", errors: validation.errors }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const rule = await rulesDb.create({ id, entityName, ruleName, operation, jdmContent, isActive, priority });

      return new Response(JSON.stringify({ success: true, id, rule }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error creating rule:", error);
      return new Response(JSON.stringify({ error: "Failed to create rule" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
