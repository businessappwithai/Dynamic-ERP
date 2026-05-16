/**
 * BetterAuth Configuration
 *
 * Modern authentication for CRM Regenerated 2
 * - Email/Password authentication
 * - Session management
 * - Role-based access control
 */

import { betterAuth } from 'better-auth';
import { kyselyAdapter } from '@better-auth/kysely-adapter';
import { Kysely } from 'kysely';

let authInstance: any = null;

/**
 * Initialize BetterAuth using a shared Kysely instance from DatabaseModule.
 * This avoids the two-PGLite-connections-to-same-dir problem.
 */
export async function initAuth(sharedKysely: Kysely<any>) {
  if (!authInstance) {
    const kysely = sharedKysely;

    authInstance = betterAuth({
      database: kyselyAdapter(kysely),
      baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
      secret: process.env.BETTER_AUTH_SECRET || 'crm_regenerated_2-dev-secret',
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
        sendResetPassword: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
          console.log('Password reset requested for:', user.email || user.id);
        },
        sendVerificationEmail: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
          console.log('Verification email sent to:', user.email || user.id);
        },
      },
      session: {
        expiresIn: 60 * 60 * 24,
        updateAge: 60 * 60 * 12,
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
      account: {
        accountLinking: {
          enabled: false,
        },
      },
      user: {
        additionalFields: {
          role: {
            type: 'string',
            required: false,
            defaultValue: 'user',
          },
          sysUserId: {
            type: 'string',
            required: false,
          },
        },
      },
      advanced: {
        cookiePrefix: 'crm_regenerated_2_app',
        crossSubDomainCookies: {
          enabled: false,
        },
      },
    });
  }

  return authInstance;
}

export function getAuth(): any {
  if (!authInstance) {
    throw new Error('Auth not initialized. Call initAuth() first.');
  }
  return authInstance;
}

export { getAuth as auth };
export type Session = any;
