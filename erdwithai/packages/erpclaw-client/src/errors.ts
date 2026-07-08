/**
 * Errors thrown by {@link ErpClawClient.execute}.
 *
 * The gateway's error bodies are not uniform across status codes (see
 * contract.ts's `ActionEnvelope` doc and erpclaw-gateway/app/routes/actions.py):
 *   - 409: `{"status": "confirmation_required", "action", "destructive": true, "message"}`
 *   - 403 (credential carve-out): `{"status": "error", "action", "error"}`
 *   - 403 (scope failure) / 404 / 401: FastAPI default `{"detail": "..."}`
 *   - 422: `{"status": "error", "message", "suggestion"?}`
 *   - 500: `{"status": "error", "action", "error", "returncode"?, "stdout"?, "stderr"?}`
 *
 * `ErpActionError.message` is derived by checking, in order, `message`,
 * `error`, then `detail` on the parsed body.
 */

function deriveMessage(body: unknown, httpStatus: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "string") return record.error;
    if (typeof record.detail === "string") return record.detail;
  }
  return `erpclaw-gateway request failed with HTTP ${httpStatus}`;
}

/**
 * Thrown whenever `POST /api/v1/actions/{domain}/{action}` returns anything
 * other than HTTP 200 (except 409, which throws the more specific
 * {@link ErpConfirmationRequiredError}).
 */
export class ErpActionError extends Error {
  readonly action: string;
  readonly httpStatus: number;
  readonly body: unknown;

  constructor(action: string, httpStatus: number, body: unknown, message?: string) {
    super(message ?? deriveMessage(body, httpStatus));
    this.name = "ErpActionError";
    this.action = action;
    this.httpStatus = httpStatus;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown specifically on HTTP 409 — the action is destructive and was
 * called without `userConfirmed: true`. Callers can catch this and re-call
 * `execute()` with `{ userConfirmed: true }` to proceed.
 */
export class ErpConfirmationRequiredError extends ErpActionError {
  readonly destructive: true = true;

  constructor(action: string, body: unknown) {
    const message =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).message === "string"
        ? (body as Record<string, unknown>).message as string
        : `Action '${action}' is destructive and requires confirmation.`;
    super(action, 409, body, message);
    this.name = "ErpConfirmationRequiredError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
