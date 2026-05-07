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
import Database from 'better-sqlite3';
import * as path from 'path';

const authDb = new Database(path.resolve(process.env.DATABASE_FILENAME || './data/crm-app.db'));

export const auth = betterAuth({
  database: {
    db: authDb,
    type: 'sqlite',
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
      console.log('Password reset requested for:', user.email || user.id);
    },
    sendVerificationEmail: async ({ user, url }: { user: { email?: string; id: string; name: string }; url: string; token: string }) => {
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
    cookiePrefix: 'crm_app',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
