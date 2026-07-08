/**
 * Better Auth database adapter using Kysely
 */

import type { Kysely } from "kysely";

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a Kysely adapter for Better Auth
 */
export function createKyselyAdapter(db: Kysely<any>): any {
  return {
    // User operations
    createUser: async (user: any) => {
      const newUser = await db
        .insertInto("auth_users" as any)
        .values({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returningAll()
        .executeTakeFirst();
      return newUser as AuthUser;
    },

    getUser: async (id: any) => {
      const user = await db
        .selectFrom("auth_users" as any)
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return user as AuthUser | undefined;
    },

    getUserByEmail: async (email: any) => {
      const user = await db
        .selectFrom("auth_users" as any)
        .selectAll()
        .where("email", "=", email)
        .executeTakeFirst();
      return user as AuthUser | undefined;
    },

    updateUser: async (id: any, data: any) => {
      const updated = await db
        .updateTable("auth_users" as any)
        .set({
          ...data,
          updatedAt: new Date(),
        } as any)
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirst();
      return updated as AuthUser;
    },

    deleteUser: async (id: any) => {
      await db
        .deleteFrom("auth_users" as any)
        .where("id", "=", id)
        .execute();
    },

    // Session operations
    createSession: async (session: any) => {
      const newSession = await db
        .insertInto("auth_sessions" as any)
        .values({
          id: session.id,
          userId: session.userId,
          token: session.token,
          expiresAt: session.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returningAll()
        .executeTakeFirst();
      return newSession as AuthSession;
    },

    getSession: async (token: any) => {
      const session = await db
        .selectFrom("auth_sessions" as any)
        .selectAll()
        .where("token", "=", token)
        .executeTakeFirst();
      return session as AuthSession | undefined;
    },

    updateSession: async (token: any, data: any) => {
      const updated = await db
        .updateTable("auth_sessions" as any)
        .set({
          ...data,
          updatedAt: new Date(),
        } as any)
        .where("token", "=", token)
        .returningAll()
        .executeTakeFirst();
      return updated as AuthSession;
    },

    deleteSession: async (token: any) => {
      await db
        .deleteFrom("auth_sessions" as any)
        .where("token", "=", token)
        .execute();
    },

    // Account operations (for OAuth)
    createAccount: async (account: any) => {
      return await db
        .insertInto("auth_accounts" as any)
        .values(account as any)
        .returningAll()
        .executeTakeFirst();
    },

    getAccount: async (userId: any, provider: any) => {
      return await db
        .selectFrom("auth_accounts" as any)
        .selectAll()
        .where("userId", "=", userId)
        .where("provider", "=", provider)
        .executeTakeFirst();
    },

    deleteAccount: async (userId: any, provider: any) => {
      await db
        .deleteFrom("auth_accounts" as any)
        .where("userId", "=", userId)
        .where("provider", "=", provider)
        .execute();
    },

    // Verification token operations
    createVerificationToken: async (token: any) => {
      return await db
        .insertInto("auth_verification_tokens" as any)
        .values(token as any)
        .returningAll()
        .executeTakeFirst();
    },

    getVerificationToken: async (token: any) => {
      return await db
        .selectFrom("auth_verification_tokens" as any)
        .selectAll()
        .where("token", "=", token)
        .executeTakeFirst();
    },

    deleteVerificationToken: async (token: any) => {
      await db
        .deleteFrom("auth_verification_tokens" as any)
        .where("token", "=", token)
        .execute();
    },
  };
}
