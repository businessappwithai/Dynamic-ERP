import { afterEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { ErpClawClient } from "@erdwithai/erpclaw-client";
import { DictionarySyncService } from "../dictionary-sync";

const customerSchema = {
  entity: "customer",
  columns: [
    { column_name: "id", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
    { column_name: "name", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
  ],
  primary_key: ["id"],
  foreign_keys: [],
};

function mockFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    for (const [path_, body] of Object.entries(routes)) {
      if (url.endsWith(path_)) {
        return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return new Response(JSON.stringify({ status: "error", message: `no mock for ${url}` }), { status: 404 });
  }) as typeof fetch;
}

let tmpDir: string | undefined;

afterEach(async () => {
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe("DictionarySyncService.syncAll", () => {
  it("fetches entities via the client and builds a dictionary context + mermaid", async () => {
    const client = new ErpClawClient({
      baseUrl: "http://fake-gateway",
      getToken: () => "test-token",
      fetchImpl: mockFetch({
        "/api/v1/catalog": { version: "test-1.0", action_count: 0, domains: [], actions: [], aliases: {} },
        "/api/v1/entities": { entities: ["customer"] },
        "/api/v1/schema/customer": customerSchema,
      }),
    });

    const sync = new DictionarySyncService(client);
    const result = await sync.syncAll();

    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]?.name).toBe("Customer");
    expect(result.dictionaryContext.sysTables.length).toBeGreaterThan(0);
    expect(result.mermaid).toContain("erDiagram");
    expect(result.mermaid).toContain("Customer");
  });
});

describe("DictionarySyncService.syncAndGenerate", () => {
  it("runs the full loop and produces real generated files on disk", async () => {
    const client = new ErpClawClient({
      baseUrl: "http://fake-gateway",
      getToken: () => "test-token",
      fetchImpl: mockFetch({
        "/api/v1/catalog": { version: "test-1.0", action_count: 0, domains: [], actions: [], aliases: {} },
        "/api/v1/entities": { entities: ["customer"] },
        "/api/v1/schema/customer": customerSchema,
      }),
    });

    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "erpclaw-bridge-sync-test-"));
    const sync = new DictionarySyncService(client);

    const { generation } = await sync.syncAndGenerate({
      gatewayUrl: "http://fake-gateway",
      projectName: "sync-test-app",
      outputDir: tmpDir,
    });

    expect(generation.entityCount).toBe(1);
    expect(generation.dictionaryContext.sysTables.length).toBeGreaterThan(0);
    expect(generation.generatedFiles.length).toBeGreaterThan(0);

    // The generated app is real on disk, not just an in-memory result.
    const packageJsonPath = path.join(tmpDir, "package.json");
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf-8"));
    expect(pkg.name).toBe("sync-test-app");

    const routesDir = await fs.readdir(path.join(tmpDir, "src", "routes", "$entity"));
    expect(routesDir).toContain("index.tsx");
    expect(routesDir).toContain("$id.tsx");
  });
});
