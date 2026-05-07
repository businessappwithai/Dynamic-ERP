/**
 * Authentication Service
 * Wrapper around Better Auth providing business logic for auth operations
 */

import type {
  IAuthService,
  LoginCredentials,
  RegisterData,
  AuthSession,
  PermissionCheck,
  UserRole,
  EntityOperation,
} from "./auth.types.js";
import { createBetterAuth } from "./better-auth.config.js";
import type { Knex } from "knex";

/**
 * Auth service implementation
 */
export class AuthService implements IAuthService {
  private auth: ReturnType<typeof createBetterAuth>;
  private db: Knex;

  constructor(config: { db: Knex; secret: string; baseURL: string }) {
    this.db = config.db;

    // Create Knex adapter for Better Auth
    const knexAdapter = this.createKnexAdapter();

    this.auth = createBetterAuth({
      database: knexAdapter,
      secret: config.secret,
      baseURL: config.baseURL,
      sessionMaxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.auth.api.signInEmail({
      body: credentials,
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result) {
      throw new Error("INVALID_EMAIL_PASSWORD");
    }

    if (result.error) {
      throw new Error(result.error.message || "LOGIN_FAILED");
    }

    return result.data.session as AuthSession;
  }

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthSession> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result) {
      throw new Error("REGISTRATION_FAILED");
    }

    if (result.error) {
      throw new Error(result.error.message || "REGISTRATION_FAILED");
    }

    // Assign default role if provided
    if (data.role) {
      const userId = (result.data.user as { id: string }).id;
      await this.assignRole(userId, data.role);
    }

    return result.data.session as AuthSession;
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(sessionToken: string): Promise<void> {
    const result = await this.auth.api.signOut({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    });

    if (!result) {
      throw new Error("LOGOUT_FAILED");
    }
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<AuthSession | null> {
    // Better Auth API returns a dynamic response object — cast to access data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await this.auth.api.getSession({
      headers: {
        authorization: `Bearer ${sessionToken}`,
      },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!result || !result.data) {
      return null;
    }

    return result.data.session as AuthSession;
  }

  /**
   * Check if user has required role(s)
   */
  async hasRole(userId: string, roles: UserRole | UserRole[]): Promise<boolean> {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    const userRoles = await this.db("ad_user_roles as ur")
      .join("ad_role as r", "ur.ad_role_id", "r.ad_role_id")
      .where("ur.ad_user_id", userId)
      .pluck("r.name");

    return roleArray.some((role) => userRoles.includes(role));
  }

  /**
   * Check if user has permission for entity operation
   */
  async hasPermission(
    userId: string,
    entityName: string,
    operation: EntityOperation
  ): Promise<PermissionCheck> {
    // Check if user has admin role (wildcard permission)
    const isAdmin = await this.hasRole(userId, "admin");
    if (isAdmin) {
      return { granted: true };
    }

    // Get user roles
    const userRoles = await this.db("ad_user_roles as ur")
      .join("ad_role as r", "ur.ad_role_id", "r.ad_role_id")
      .where("ur.ad_user_id", userId)
      .pluck("r.name");

    if (userRoles.length === 0) {
      return { granted: false, reason: "NO_ROLES_ASSIGNED" };
    }

    // Check table-level access
    const access = await this.db("ad_access as a")
      .join("ad_table as t", "a.ad_table_id", "t.ad_table_id")
      .join("ad_user_roles as ur", "a.ad_role_id", "ur.ad_role_id")
      .where("ur.ad_user_id", userId)
      .where("t.table_name", entityName.toLowerCase())
      .first();

    if (!access) {
      return { granted: false, reason: "NO_TABLE_ACCESS" };
    }

    // Check operation-level permission
    switch (operation) {
      case "CREATE":
        if (!access.is_create_access) {
          return { granted: false, reason: "NO_CREATE_ACCESS" };
        }
        break;
      case "READ":
        // Read access is assumed unless explicitly read-only
        if (access.is_read_only) {
          // Read-only is ok for READ operations
          return { granted: true };
        }
        break;
      case "UPDATE":
        if (!access.is_update_access) {
          return { granted: false, reason: "NO_UPDATE_ACCESS" };
        }
        break;
      case "DELETE":
        if (!access.is_delete_access) {
          return { granted: false, reason: "NO_DELETE_ACCESS" };
        }
        break;
    }

    return { granted: true };
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: UserRole): Promise<void> {
    // Get role ID
    const roleRecord = await this.db("ad_role")
      .where("name", role)
      .first();

    if (!roleRecord) {
      throw new Error(`ROLE_NOT_FOUND: ${role}`);
    }

    // Check if already assigned
    const existing = await this.db("ad_user_roles")
      .where({
        ad_user_id: userId,
        ad_role_id: roleRecord.ad_role_id,
      })
      .first();

    if (existing) {
      return; // Already assigned
    }

    // Assign role
    await this.db("ad_user_roles").insert({
      ad_user_id: userId,
      ad_role_id: roleRecord.ad_role_id,
      created_at: new Date(),
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: UserRole): Promise<void> {
    // Get role ID
    const roleRecord = await this.db("ad_role")
      .where("name", role)
      .first();

    if (!roleRecord) {
      throw new Error(`ROLE_NOT_FOUND: ${role}`);
    }

    // Remove role
    await this.db("ad_user_roles")
      .where({
        ad_user_id: userId,
        ad_role_id: roleRecord.ad_role_id,
      })
      .delete();
  }

  /**
   * Get user roles
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    const roles = await this.db("ad_user_roles as ur")
      .join("ad_role as r", "ur.ad_role_id", "r.ad_role_id")
      .where("ur.ad_user_id", userId)
      .pluck("r.name");

    return roles as UserRole[];
  }

  /**
   * Create Knex adapter for Better Auth
   */
  private createKnexAdapter() {
    return {
      id: "knex",
      async create(data: unknown) {
        // Better Auth will call this to create tables
        // For now, we'll use a simpler approach
        return data;
      },
      async findMany(_params: unknown) {
        return [];
      },
      async findOne(_params: unknown) {
        return null;
      },
      async update(params: unknown) {
        return params;
      },
      async delete(params: unknown) {
        return params;
      },
    };
  }
}

/**
 * Create auth service instance
 */
export function createAuthService(config: {
  db: Knex;
  secret: string;
  baseURL: string;
}): AuthService {
  return new AuthService(config);
}
