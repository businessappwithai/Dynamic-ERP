import type { Catalog, EntitySchema } from "./contract";
import { ErpActionError, ErpConfirmationRequiredError } from "./errors";

export interface ErpClawRetryOptions {
  /** Total number of attempts (including the first try). Default: 3. */
  attempts: number;
  /** Delay between attempts, in milliseconds. Default: 250. */
  backoffMs: number;
}

export interface ErpClawClientOptions {
  /** Gateway base URL, e.g. "http://localhost:8000" (no trailing slash needed). */
  baseUrl: string;
  /** Supplies a fresh JWT for each request. May be sync or async. */
  getToken: () => Promise<string> | string;
  /** Override for `fetch` (e.g. in tests). Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /**
   * Retry policy for network errors and HTTP 5xx responses. Never retries
   * 4xx — a 409 (confirmation required) is meaningful, not transient, and
   * neither is a 401/403/404/422.
   */
  retry?: ErpClawRetryOptions;
}

const DEFAULT_RETRY: ErpClawRetryOptions = { attempts: 3, backoffMs: 250 };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Thin typed client for the erpclaw-gateway HTTP API. Deliberately direct —
 * no request middleware pipeline, no dependency-injection framework — to
 * match the gateway's own thinness.
 */
export class ErpClawClient {
  private readonly baseUrl: string;
  private readonly getToken: () => Promise<string> | string;
  private readonly fetchImpl: typeof fetch;
  private readonly retryOpts: ErpClawRetryOptions;
  private catalogCache: Catalog | undefined;

  constructor(opts: ErpClawClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.getToken = opts.getToken;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.retryOpts = opts.retry ?? DEFAULT_RETRY;
  }

  /** `GET /api/v1/catalog`. Cached in-memory after the first call; pass `force: true` to bypass the cache. */
  async catalog(force = false): Promise<Catalog> {
    if (this.catalogCache !== undefined && !force) {
      return this.catalogCache;
    }
    const res = await this.request("GET", "/api/v1/catalog");
    const body = await parseJson(res);
    if (!res.ok) {
      throw new ErpActionError("catalog", res.status, body);
    }
    this.catalogCache = body as Catalog;
    return this.catalogCache;
  }

  /**
   * `GET /api/v1/entities`. Returns every real (non-bookkeeping) table name
   * — the entity list a dictionary-sync consumer (e.g. `@erdwithai/erpclaw-bridge`)
   * needs before calling `schema()` per table, since `schema()` is
   * per-entity only. Body shape: `{"entities": string[]}`.
   */
  async listEntities(): Promise<string[]> {
    const res = await this.request("GET", "/api/v1/entities");
    const body = await parseJson(res);
    if (!res.ok) {
      throw new ErpActionError("entities", res.status, body);
    }
    return (body as { entities: string[] }).entities;
  }

  /** `GET /api/v1/schema/{entity}`. Throws `ErpActionError` (httpStatus 404) if the table doesn't exist. */
  async schema(entity: string): Promise<EntitySchema> {
    const res = await this.request("GET", `/api/v1/schema/${encodeURIComponent(entity)}`);
    const body = await parseJson(res);
    if (!res.ok) {
      throw new ErpActionError(`schema:${entity}`, res.status, body);
    }
    return body as EntitySchema;
  }

  /**
   * `POST /api/v1/actions/{domain}/{action}`.
   *
   * - HTTP 200: resolves with the response body, typed as `TData` (caller
   *   supplies the shape — the gateway's own envelope is dynamic-shaped).
   * - HTTP 409: rejects with `ErpConfirmationRequiredError`. Re-call with
   *   `{ userConfirmed: true }` to proceed with a destructive action.
   * - HTTP 401/403/404/422/500: rejects with `ErpActionError`.
   */
  async execute<TData = Record<string, unknown>>(
    domain: string,
    action: string,
    args: Record<string, unknown>,
    opts?: { userConfirmed?: boolean },
  ): Promise<TData> {
    const res = await this.request("POST", `/api/v1/actions/${domain}/${action}`, {
      args,
      user_confirmed: opts?.userConfirmed ?? false,
    });
    const body = await parseJson(res);

    if (res.status === 200) {
      return body as TData;
    }
    if (res.status === 409) {
      throw new ErpConfirmationRequiredError(action, body);
    }
    throw new ErpActionError(action, res.status, body);
  }

  private async request(method: "GET" | "POST", path: string, jsonBody?: unknown): Promise<Response> {
    const token = await this.getToken();
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    let body: string | undefined;
    if (jsonBody !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(jsonBody);
    }
    return this.fetchWithRetry(`${this.baseUrl}${path}`, { method, headers, body });
  }

  /** Retries network failures and HTTP 5xx responses per `this.retryOpts`. Never retries a completed 4xx response. */
  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    const { attempts, backoffMs } = this.retryOpts;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let res: Response;
      try {
        res = await this.fetchImpl(url, init);
      } catch (err) {
        lastError = err;
        if (attempt < attempts) {
          await sleep(backoffMs);
          continue;
        }
        throw err;
      }

      if (res.status >= 500 && attempt < attempts) {
        await sleep(backoffMs);
        continue;
      }
      return res;
    }

    // Unreachable in practice (the loop always returns or throws), but keeps
    // control flow analysis happy.
    throw lastError;
  }
}
