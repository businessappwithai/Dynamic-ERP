import { createFileRoute } from "@tanstack/react-router";
import { rulesDb, runMigrations } from "@erdwithai/core/services";

let _dbReady = false;
async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[DB] Migration error:", err));
  }
}

export const Route = createFileRoute("/api/rules/$ruleId/history")({ server: { handlers: {
  GET: async ({ params }) => {
    await ensureDb();
    try {
      const rule = await rulesDb.findById(params.ruleId);
      if (!rule) {
        return new Response(JSON.stringify({ error: "Rule not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const versions = await rulesDb.getHistory(params.ruleId);
      return new Response(JSON.stringify({ versions }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching rule history:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch rule history" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
  },
  },
});
