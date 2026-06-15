import { createFileRoute } from "@tanstack/react-router";
import { getAuthService, getSessionToken, clearSessionCookie } from "@/lib/auth-server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getSessionToken(request);
        if (token) {
          try {
            const authService = await getAuthService();
            await authService.logout(token);
          } catch {
            // ignore logout errors
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": clearSessionCookie(),
          },
        });
      },
    },
  },
});
