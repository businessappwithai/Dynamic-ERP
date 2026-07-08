import { beforeEach, describe, expect, it } from "bun:test";

import { ErpClawClient } from "../client";
import { ErpActionError, ErpConfirmationRequiredError } from "../errors";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Builds a fetchImpl that returns a fixed sequence of responses/errors, one per call. */
function scriptedFetch(steps: Array<Response | Error>): { fetchImpl: typeof fetch; calls: RequestInit[]; urls: string[] } {
  const calls: RequestInit[] = [];
  const urls: string[] = [];
  let i = 0;
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    calls.push(init ?? {});
    const step = steps[i];
    i += 1;
    if (step === undefined) {
      throw new Error(`scriptedFetch: no step configured for call #${i}`);
    }
    if (step instanceof Error) throw step;
    return step;
  }) as typeof fetch;
  return { fetchImpl, calls, urls };
}

const noRetry = { attempts: 1, backoffMs: 1 };

describe("ErpClawClient.execute", () => {
  it("returns the parsed body on HTTP 200", async () => {
    const { fetchImpl } = scriptedFetch([
      jsonResponse(200, { status: "ok", sales_invoice_id: "SI-1", grand_total: "200.00" }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    const result = await client.execute("selling", "create-sales-invoice", { customer_id: "C1" });
    expect(result).toEqual({ status: "ok", sales_invoice_id: "SI-1", grand_total: "200.00" });
  });

  it("sends the Authorization header and request body", async () => {
    const { fetchImpl, calls, urls } = scriptedFetch([jsonResponse(200, { status: "ok" })]);
    const client = new ErpClawClient({
      baseUrl: "http://gw",
      getToken: () => "my-jwt",
      fetchImpl,
      retry: noRetry,
    });

    await client.execute("selling", "create-sales-invoice", { customer_id: "C1" }, { userConfirmed: true });

    expect(urls[0]).toBe("http://gw/api/v1/actions/selling/create-sales-invoice");
    const headers = calls[0]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-jwt");
    expect(JSON.parse(calls[0]?.body as string)).toEqual({ args: { customer_id: "C1" }, user_confirmed: true });
  });

  it("throws ErpConfirmationRequiredError on HTTP 409", async () => {
    const { fetchImpl } = scriptedFetch([
      jsonResponse(409, {
        status: "confirmation_required",
        action: "delete-customer",
        destructive: true,
        message: "This action is destructive; confirm to proceed.",
      }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    await expect(client.execute("selling", "delete-customer", { customer_id: "C1" })).rejects.toThrow(
      ErpConfirmationRequiredError,
    );
  });

  it("throws ErpActionError (not the confirmation subclass) on HTTP 404", async () => {
    const { fetchImpl } = scriptedFetch([jsonResponse(404, { detail: "Unknown action 'foo' under domain 'bar'." })]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    let caught: unknown;
    try {
      await client.execute("bar", "foo", {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ErpActionError);
    expect(caught).not.toBeInstanceOf(ErpConfirmationRequiredError);
    expect((caught as ErpActionError).httpStatus).toBe(404);
    expect((caught as ErpActionError).message).toBe("Unknown action 'foo' under domain 'bar'.");
  });

  it("throws ErpActionError on HTTP 422 with the message field", async () => {
    const { fetchImpl } = scriptedFetch([
      jsonResponse(422, { status: "error", message: "--customer-id is required", suggestion: "pass --customer-id" }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    let caught: unknown;
    try {
      await client.execute("selling", "create-sales-invoice", {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ErpActionError);
    expect((caught as ErpActionError).httpStatus).toBe(422);
    expect((caught as ErpActionError).message).toBe("--customer-id is required");
  });

  it("throws ErpActionError on HTTP 500 with the error field", async () => {
    const { fetchImpl } = scriptedFetch([
      jsonResponse(500, { status: "error", action: "create-sales-invoice", error: "subprocess spawn failed" }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    let caught: unknown;
    try {
      await client.execute("selling", "create-sales-invoice", {});
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ErpActionError);
    expect((caught as ErpActionError).httpStatus).toBe(500);
    expect((caught as ErpActionError).message).toBe("subprocess spawn failed");
  });
});

describe("ErpClawClient.catalog", () => {
  it("caches after the first call and re-fetches only when force is true", async () => {
    const { fetchImpl, urls } = scriptedFetch([
      jsonResponse(200, { version: "v1", action_count: 1, domains: [], actions: [], aliases: {} }),
      jsonResponse(200, { version: "v2", action_count: 2, domains: [], actions: [], aliases: {} }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    const first = await client.catalog();
    const second = await client.catalog(); // cached, no new fetch
    expect(urls).toHaveLength(1);
    expect(second).toBe(first);
    expect(second.version).toBe("v1");

    const third = await client.catalog(true); // force -> re-fetch
    expect(urls).toHaveLength(2);
    expect(third.version).toBe("v2");
  });
});

describe("ErpClawClient retry behavior", () => {
  it("retries on a simulated network error and eventually succeeds", async () => {
    const { fetchImpl, urls } = scriptedFetch([
      new Error("ECONNRESET"),
      new Error("ECONNRESET"),
      jsonResponse(200, { status: "ok" }),
    ]);
    const client = new ErpClawClient({
      baseUrl: "http://gw",
      getToken: () => "tok",
      fetchImpl,
      retry: { attempts: 3, backoffMs: 1 },
    });

    const result = await client.execute("selling", "create-sales-invoice", {});
    expect(result).toEqual({ status: "ok" });
    expect(urls).toHaveLength(3);
  });

  it("retries on HTTP 5xx", async () => {
    const { fetchImpl, urls } = scriptedFetch([
      jsonResponse(503, { status: "error", error: "temporarily unavailable" }),
      jsonResponse(200, { status: "ok" }),
    ]);
    const client = new ErpClawClient({
      baseUrl: "http://gw",
      getToken: () => "tok",
      fetchImpl,
      retry: { attempts: 3, backoffMs: 1 },
    });

    const result = await client.execute("selling", "create-sales-invoice", {});
    expect(result).toEqual({ status: "ok" });
    expect(urls).toHaveLength(2);
  });

  it("does NOT retry on HTTP 422 (a meaningful 4xx, not transient)", async () => {
    const { fetchImpl, urls } = scriptedFetch([jsonResponse(422, { status: "error", message: "bad args" })]);
    const client = new ErpClawClient({
      baseUrl: "http://gw",
      getToken: () => "tok",
      fetchImpl,
      retry: { attempts: 3, backoffMs: 1 },
    });

    await expect(client.execute("selling", "create-sales-invoice", {})).rejects.toThrow(ErpActionError);
    expect(urls).toHaveLength(1);
  });

  it("does NOT retry on HTTP 409 (confirmation required is meaningful, not transient)", async () => {
    const { fetchImpl, urls } = scriptedFetch([
      jsonResponse(409, { status: "confirmation_required", action: "x", destructive: true, message: "confirm" }),
    ]);
    const client = new ErpClawClient({
      baseUrl: "http://gw",
      getToken: () => "tok",
      fetchImpl,
      retry: { attempts: 3, backoffMs: 1 },
    });

    await expect(client.execute("selling", "x", {})).rejects.toThrow(ErpConfirmationRequiredError);
    expect(urls).toHaveLength(1);
  });
});

describe("ErpClawClient.schema", () => {
  let getEntity: () => string;
  beforeEach(() => {
    getEntity = () => "customer";
  });

  it("returns the parsed entity schema on 200", async () => {
    const { fetchImpl, urls } = scriptedFetch([
      jsonResponse(200, { entity: "customer", columns: [], primary_key: ["id"], foreign_keys: [] }),
    ]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    const result = await client.schema(getEntity());
    expect(result.entity).toBe("customer");
    expect(urls[0]).toBe("http://gw/api/v1/schema/customer");
  });

  it("throws ErpActionError on 404", async () => {
    const { fetchImpl } = scriptedFetch([jsonResponse(404, { detail: "No such entity/table: 'nope'" })]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    await expect(client.schema("nope")).rejects.toThrow(ErpActionError);
  });
});

describe("ErpClawClient.listEntities", () => {
  it("returns the entity name list from GET /api/v1/entities", async () => {
    const { fetchImpl, urls } = scriptedFetch([jsonResponse(200, { entities: ["customer", "sales_invoice"] })]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    const result = await client.listEntities();
    expect(result).toEqual(["customer", "sales_invoice"]);
    expect(urls[0]).toBe("http://gw/api/v1/entities");
  });

  it("throws ErpActionError on a non-2xx response", async () => {
    const { fetchImpl } = scriptedFetch([jsonResponse(401, { detail: "Not authenticated" })]);
    const client = new ErpClawClient({ baseUrl: "http://gw", getToken: () => "tok", fetchImpl, retry: noRetry });

    await expect(client.listEntities()).rejects.toThrow(ErpActionError);
  });
});
