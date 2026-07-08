# @erdwithai/erpclaw-bridge

Maps erpclaw's live Postgres schema onto erdwithai's existing generic
`Entity[]`/`Relationship[]` types — the same shape the Mermaid ERD parser
produces from a hand-drawn diagram — so an ERP-origin table rides the exact
same pipeline (`DictionaryGenerator`, templates, RBAC, admin UI) as anything
a user designs in Studio. No parallel dictionary representation.

## Why no new database tables

erdwithai has no central table of `sys_table`/`sys_column` rows today — a
project's dictionary is generated on demand (`DictionaryGenerator.generateDictionaryContext()`)
from whatever `Entity[]`/`Relationship[]` a project's `erd_versions.parsed_schema`
holds. This package targets that exact seam instead of inventing a new one:
`DictionarySyncService.syncAll()` returns entities/relationships/mermaid in
the same shape a hand-drawn ERD would produce, ready to be persisted into a
project's `erd_versions` row by whatever calls this package.

This package deliberately does **not** persist anything itself — studio's own
DB layer (`packages/core`, currently Kysely + mysql2) is a separate,
not-yet-migrated concern (studio's own move to Postgres is a documented
follow-up). A typical call site (a future Studio API route, once that
migration lands) looks like:

```ts
import { ErpClawClient } from "@erdwithai/erpclaw-client";
import { DictionarySyncService } from "@erdwithai/erpclaw-bridge";

const client = new ErpClawClient({ baseUrl: erpGatewayUrl, getToken: () => jwt });
const sync = new DictionarySyncService(client);
const result = await sync.syncAll();

await db.insertInto("erd_versions").values({
  id: crypto.randomUUID(),
  project_id: projectId,
  version_number: nextVersion,
  mermaid_code: result.mermaid,
  parsed_schema: JSON.stringify({ entities: result.entities, relationships: result.relationships }),
  entity_count: result.entities.length,
  relationship_count: result.relationships.length,
  import_source: "erpclaw",
  import_metadata: JSON.stringify({ erpclawVersion: result.erpclawVersion }),
  is_current: true,
  created_at: new Date().toISOString(),
}).execute();
```

`result.dictionaryContext` is the same `DictionaryContext` shape
(`sysTables`/`sysColumns`/`sysWindows`/...) the generator produces for any
other project — feed it directly into template generation without going
through `erd_versions` at all if you don't need the version history.

## The other call site: sync straight into a generated app

`DictionarySyncService` doesn't persist `sys_table`/`sys_column` rows itself
— Studio's own DB has no table to put them in. The rows are meant to be
materialized by a **generated app's own migrations**, exactly the way any
other stack's `DictionaryGenerator` output already works. `syncAndGenerate()`
closes that loop directly, without an `erd_versions` round-trip at all:

```ts
import { ErpClawClient } from "@erdwithai/erpclaw-client";
import { DictionarySyncService } from "@erdwithai/erpclaw-bridge";

const gatewayUrl = "http://localhost:8000";
const client = new ErpClawClient({ baseUrl: gatewayUrl, getToken: () => jwt });
const sync = new DictionarySyncService(client);

const { generation } = await sync.syncAndGenerate({
  gatewayUrl,               // the generated app's data layer points back at this same gateway
  projectName: "acme-erp-ui",
  outputDir: "./generated-projects/acme-erp-ui",
});

console.log(generation.dictionaryContext.sysTables.length); // sys_table entries computed here
```

This runs `GeneratorOrchestrator` with `stackOption: "erpclaw-tanstack"` — a
TanStack Start frontend with no generated backend/database (erpclaw already
is the backend). `GeneratorOrchestrator.generate()` computes the
`DictionaryContext` internally (its own console output shows
`sys_table entries: N`, `sys_column entries: N`, ...) and hands it to the
stack's generator — the same path a hand-designed ERD already takes. Use
`syncAll()` + manual `erd_versions` persistence (above) instead if you want
version history in Studio without generating an app yet; use
`syncAndGenerate()` when you just want a working UI now.

## Type mapping heuristics (best-effort, not authoritative)

erpclaw's schema endpoint returns raw Postgres `information_schema` data —
there is no semantic tag (money/reference/enum) on a column. `mapping.ts`
recovers a best guess:

- Foreign keys (from erpclaw's `foreign_keys` list) become `Relationship`
  entries, not attributes.
- Money fields are Decimal-as-TEXT in erpclaw (by design — see the platform's
  "never float" invariant), so a Postgres `data_type` of `text` is
  disambiguated by column-name hints (`amount`, `total`, `rate`, `price`,
  `balance`, ...) → `decimal`.
- Other `text` columns default to `string`; a small set of long-content name
  hints (`description`, `notes`, `comment`, ...) map to `text` instead.
- Everything else maps directly from the Postgres type
  (`numeric`→`decimal`, `boolean`→`boolean`, `timestamp*`→`datetime`, etc).

None of this is authoritative — a human reviewing a synced entity in Studio
can always correct a field's type. Structural changes to ERP-origin tables
(add/remove column) should flow through erpclaw module upgrades, not manual
editing in Studio, but this package doesn't enforce that itself (a `origin`
provenance flag on synced entities is left to the caller/persistence layer to
track, e.g. via `erd_versions.import_source = "erpclaw"` as shown above).

## Why not reuse `@erdwithai/ai`'s Mermaid generator

`generateMermaidProgrammatic` already exists in `@erdwithai/ai`, but it's
only reachable through a barrel export (`@erdwithai/ai` → `agents/index.ts`)
that also re-exports `domain-agent.ts`/`entity-agent.ts`, which construct
Mastra `Agent` instances as a module-load side effect. Depending on
`@erdwithai/ai` here would mean a pure schema-sync path silently requires
Mastra/Anthropic configuration just to build a string. `mermaid.ts` is a
small, dependency-free reimplementation of the same `erDiagram` syntax
convention, operating directly on `Entity`/`Relationship`.
