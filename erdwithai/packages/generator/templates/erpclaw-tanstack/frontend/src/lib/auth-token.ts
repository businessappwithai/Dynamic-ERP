/**
 * Minimal bearer-token store for talking to erpclaw-gateway.
 *
 * erpclaw-gateway (see erpclaw-gateway/app/auth/jwt.py) is a pure JWT
 * *verifier* — it has no login/sign-up endpoint of its own; a token is
 * minted externally and handed to this app. There is deliberately no
 * sign-in form here: that would invent an auth system the gateway doesn't
 * have a matching half for. Instead:
 *
 *   1. VITE_ERP_GATEWAY_TOKEN (build-time / dev convenience) is used if set.
 *   2. Otherwise, the token is read from localStorage, settable via
 *      `setErpToken()` (wired up by `src/components/TokenGate.tsx`) — swap
 *      this file's implementation for whatever token-issuance flow your
 *      deployment actually uses.
 */
const STORAGE_KEY = "erp_gateway_token";

const ENV_TOKEN = import.meta.env.VITE_ERP_GATEWAY_TOKEN as string | undefined;

export function getErpToken(): string {
  if (ENV_TOKEN) return ENV_TOKEN;
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setErpToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearErpToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasErpToken(): boolean {
  return getErpToken().length > 0;
}
