# @erdwithai/erpclaw-client

A typed TypeScript runtime SDK for `erpclaw-gateway`, the FastAPI HTTP
gateway in front of erpclaw. It is a thin, direct client — one class, no
dependency-injection framework, no request middleware pipeline — matching
the gateway it talks to.

All shapes in `src/contract.ts` are transcribed directly from the gateway's
implementation (`erpclaw-gateway/app/routes/*.py`, `app/catalog/*.py`) and
verified against a live gateway backed by real Postgres, not from any
architecture-doc pseudocode.

## Install

Within this monorepo it's a workspace package:

```json
{ "dependencies": { "@erdwithai/erpclaw-client": "workspace:*" } }
```

## Constructing a client

```ts
import { ErpClawClient } from "@erdwithai/erpclaw-client";

const client = new ErpClawClient({
  baseUrl: "http://localhost:8000",
  getToken: async () => await getJwtSomehow(), // sync or async
  // fetchImpl: customFetch,                    // optional, defaults to global fetch
  // retry: { attempts: 3, backoffMs: 250 },     // optional, this is the default
});
```

`getToken` is called on every request — put your own caching/refresh logic
there if the token is expensive to obtain. Retries apply only to network
failures and HTTP 5xx responses; a 4xx (including 409, "confirmation
required") is never retried because it's a meaningful response, not a
transient failure.

## Calling the API

```ts
// GET /api/v1/catalog — cached in-memory after the first call.
const catalog = await client.catalog();
const catalogFresh = await client.catalog(true); // bypass the cache

// GET /api/v1/schema/{entity} — throws ErpActionError (httpStatus 404) if
// the table doesn't exist.
const customerSchema = await client.schema("customer");

// POST /api/v1/actions/{domain}/{action}
try {
  const result = await client.execute("selling", "create-sales-invoice", {
    customer_id: "CUST-001",
    items: JSON.stringify([{ item_code: "WIDGET", qty: 2, rate: "100.00" }]),
  });
  // result.status === "ok"; money fields (e.g. result.grand_total) are
  // always strings — never coerce them to number.
} catch (err) {
  if (err instanceof ErpConfirmationRequiredError) {
    // Destructive action — re-call with userConfirmed: true once the
    // caller has actually confirmed.
    await client.execute("selling", "void-sales-invoice", { id: "SI-1" }, { userConfirmed: true });
  } else if (err instanceof ErpActionError) {
    // err.httpStatus, err.body (raw parsed response), err.message
    console.error(err.httpStatus, err.message);
  }
}
```

## Codegen

`erpclaw-codegen` fetches a live gateway's catalog and emits one
`generated/<domain>.ts` file per domain (typed args interfaces + a
camelCased function per action, e.g. `create-sales-invoice` ->
`createSalesInvoice`) plus a `generated/index.ts` barrel exporting
`buildSdk(client)`:

```bash
bunx erpclaw-codegen --base-url http://localhost:8000 --token "$JWT" --out-dir src/generated
# or, to avoid putting the token on the command line:
bunx erpclaw-codegen --base-url http://localhost:8000 --token-env ERPCLAW_TOKEN
```

```ts
import { ErpClawClient } from "@erdwithai/erpclaw-client";
import { buildSdk } from "./generated";

const client = new ErpClawClient({ baseUrl, getToken });
const sdk = buildSdk(client);
await sdk.selling.createSalesInvoice({ customer_id: "CUST-001" });
```

**This requires a running gateway** — codegen has not been run or verified
against a live server as part of building this package (no Postgres/gateway
was reachable in that environment). Its output is correct against the
documented catalog shape (see `src/contract.ts` / gateway source), but treat
a first real run as the actual verification step.

### A generated field being optional is not a bug

Every property in a generated `*Args` interface is optional, even fields the
underlying erpclaw action actually requires. This mirrors the gateway's own
`input_schema.required: []` on every action (see
`erpclaw-gateway/app/catalog/introspect.py`'s `action_input_schema`):
erpclaw enforces required-ness **at runtime**, not via schema/type
validation. A missing required field is not a TypeScript error — it comes
back as an HTTP 422 with `{"status": "error", "message": "--x is
required"}`, which surfaces client-side as an `ErpActionError`. If you want
compile-time enforcement of a particular action's required fields, wrap the
generated function in your own narrower type; don't expect the generator to
infer it, since the gateway's own schema doesn't either.

## Development

```bash
bun --filter @erdwithai/erpclaw-client build
bun --filter @erdwithai/erpclaw-client test
```

Tests mock `fetch` via the client's `fetchImpl` option — they never hit a
real network or a real gateway.
