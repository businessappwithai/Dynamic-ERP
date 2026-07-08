import { createFileRoute } from "@tanstack/react-router";
import { rulesDb, runMigrations } from "@erdwithai/core/services";

let _dbReady = false;
async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[DB] Migration error:", err));
  }
}

export const Route = createFileRoute("/api/rules/$ruleId/rollback/$version")({ server: { handlers: {
  POST: async ({ params }) => {
    await ensureDb();
    try {
      const version = Number(params.version);
      if (!Number.isInteger(version)) {
        return new Response(JSON.stringify({ error: "version must be an integer" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const rule = await rulesDb.rollback(params.ruleId, version);
      if (!rule) {
        return new Response(
          JSON.stringify({ error: `Version ${version} not found for rule ${params.ruleId}` }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true, rule }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error rolling back rule:", error);
      return new Response(JSON.stringify({ error: "Failed to roll back rule" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
