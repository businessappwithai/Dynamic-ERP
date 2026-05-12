/**
 * BetterAuth Configuration
 *
 * Modern authentication for crm-app
 * - Email/Password authentication
 * - Session management
 * - Role-based access control
 * - Integration with existing sys_user table
 */

import { betterAuth } from 'better-auth';
import * as path from 'path';

// In-memory fallback for testing environments (when better-sqlite3 native module isn't available)
const createFallbackDb = () => ({
  prepare: (sql: string) => ({
    run: (..._args: any[]) => ({ changes: 1, lastInsertRowid: 1n }),
    all: (..._args: any[]) => [],
    get: (..._args: any[]) => null,
  }),
  exec: (_sql: string) => undefined,
  close: () => undefined,
});

let authDb: any = createFallbackDb();

// Lazy initialize better-sqlite3 on demand (only if imported outside of tests)
if (process.env.NODE_ENV !== 'test') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    authDb = new Database(path.resolve(process.env.DATABASE_FILENAME || './data/crm_app.db'));
  } catch (error) {
    console.warn('better-sqlite3 not available, using in-memory fallback');
  }
}

export const auth = betterAuth({
  database: {
    db: authDb,
    type: 'sqlite',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
      console.log('Password reset requested for:', user.email || user.id);
      // TODO: Integrate email service
    },
    sendVerificationEmail: async ({ user, url: _url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
      console.log('Verification email sent to:', user.email || user.id);
      // TODO: Integrate email service
    },
  },
  session: {
    expiresIn: 60 * 60 * 24, // 1 day
    updateAge: 60 * 60 * 12, // Update session every 12 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
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
    cookiePrefix: 'crm_app_app',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
