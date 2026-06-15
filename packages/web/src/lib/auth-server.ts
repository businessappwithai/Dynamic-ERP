import { AuthService } from "@erdwithai/core/auth";
import { getDatabase, runMigrations } from "@erdwithai/core/services";
import type { AuthUsersTable } from "@erdwithai/core/config/db.types";

let _authService: AuthService | null = null;
let _dbReady = false;

async function ensureDb() {
  if (!_dbReady) {
    _dbReady = true;
    await runMigrations().catch((err) => console.error("[Auth] Migration error:", err));
  }
}

export async function getAuthService(): Promise<AuthService> {
  await ensureDb();
  if (!_authService) {
    const secret =
      process.env.BETTER_AUTH_SECRET ||
      process.env.SESSION_SECRET ||
      "erdwithai-default-secret-key-change-in-production-32chars";
    _authService = new AuthService({
      db: getDatabase(),
      secret,
      baseURL: process.env.VITE_APP_URL || "http://localhost:3000",
    });
  }
  return _authService;
}

export const AUTH_COOKIE = "erdwithai-session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
  return match ? (match[1] ?? null) : null;
}

export function setSessionCookie(token: string): string {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function getCurrentUser(request: Request): Promise<AuthUsersTable | null> {
  await ensureDb();
  const token = getSessionToken(request);
  if (!token) return null;

  const db = getDatabase();
  const now = new Date().toISOString();

  const session = await db
    .selectFrom("auth_sessions" as any)
    .selectAll()
    .where("token" as any, "=", token)
    .where("expiresAt" as any, ">", now)
    .executeTakeFirst();

  if (!session) return null;

  const user = await db
    .selectFrom("auth_users" as any)
    .selectAll()
    .where("id" as any, "=", (session as any).userId)
    .executeTakeFirst();

  return user ?? null;
}
