import { useState } from "react";
import { getErpToken, setErpToken } from "@/lib/auth-token";

/**
 * Minimal token bootstrap — see src/lib/auth-token.ts for why there's no
 * sign-in form (erpclaw-gateway issues no tokens itself). Blocks rendering
 * of children until a bearer token is present, either from
 * VITE_ERP_GATEWAY_TOKEN or previously pasted into localStorage.
 */
export function TokenGate({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState(() => (typeof window !== "undefined" ? getErpToken() : ""));
  const [draft, setDraft] = useState("");

  if (token) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-gray-200 p-6 dark:border-gray-800">
        <h1 className="text-lg font-semibold">Connect to erpclaw-gateway</h1>
        <p className="text-sm text-gray-500">
          Paste a bearer token below. erpclaw-gateway has no login endpoint of its own — mint one with
          the gateway's <code>mint_test_token</code> script, or set VITE_ERP_GATEWAY_TOKEN in .env.local
          for local dev.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-1.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="button"
          onClick={() => {
            const trimmed = draft.trim();
            setErpToken(trimmed);
            setTokenState(trimmed);
          }}
          disabled={!draft.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
        >
          Save token
        </button>
      </div>
    </div>
  );
}
