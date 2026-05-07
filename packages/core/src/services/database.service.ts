/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database service for ERDwithAI
 * Handles all database operations using Knex.js
 * ALL project data stored in local SQLite at database/generator.sql
 *
 * Note: `any` is used intentionally here — Knex query results are dynamically
 * typed at runtime based on schema and do not have static type information.
 */

import type { Knex } from "knex";
import knex from "knex";
import { resolve } from "path";
import { Database } from "sqlite";

// Create knex configuration with fallback
function createKnex(): Knex {
  const dbPath = resolve(process.cwd(), "database/generator.sql");

  // Try to use sqlite (pure JS implementation) first
  try {
    return knex({
      client: "sqlite3",
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
  } catch (error) {
    // Fallback to better-sqlite3 if sqlite fails
    return knex({
      client: "better-sqlite3",
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
    });
  }
}

// Create a safe wrapper around Knex to handle initialization errors
class SafeDatabase {
  private db: Knex | null = null;
  private error: Error | null = null;
  private initialized = false;

  private initDb() {
    if (this.initialized) return;
    this.initialized = true;
    
    try {
      this.db = createKnex();
      // Test connection
      this.db.raw("SELECT 1");
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      console.error("Database initialization failed:", this.error.message);
      this.db = null;
    }
  }

  getDb(): Knex | null {
    this.initDb();
    return this.db;
  }

  getError(): Error | null {
    this.initDb();
    return this.error;
  }

  table(name: string) {
    const db = this.getDb();
    if (!db) {
      // Return a chainable query builder for when DB is unavailable
      const createChain = () => ({
        where: (_key: string, _value?: any) => createChain(),
        andWhere: (_key: string, _value?: any) => createChain(),
        orWhere: (_key: string, _value?: any) => createChain(),
        orderBy: (_field: string, _dir?: string) => createChain(),
        select: async (_fields?: string | string[]) => [],
        first: async () => null,
        insert: async (data: any) => { return [[data]]; },
        update: async (_data: any) => createChain(),
        delete: async () => null,
        del: async () => null,
        returning: async (_fields?: string | string[]) => [{}],
      });
      return createChain();
    }
    return db(name);
  }

  async destroy() {
    if (this.db) {
      await this.db.destroy();
      this.db = null;
    }
  }
}

// Create singleton instance
let safeDb: SafeDatabase | null = null;
let dbProxy: any = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): any {
  if (!dbProxy) {
    if (!safeDb) {
      safeDb = new SafeDatabase();
    }

    const actualDb = safeDb.getDb();
    const dbError = safeDb.getError();

    if (dbError) {
      console.warn("Database error during initialization:", dbError.message);
    }

    // Use native Knex if available, otherwise wrap with fallback
    if (actualDb) {
      dbProxy = actualDb;
    } else {
      // Create a fallback proxy object
      const fallbackDb = (tableName: string) => {
        const db = safeDb?.getDb();
        if (db) {
          return db(tableName);
        }
        return safeDb!.table(tableName);
      };

      // Attach Knex-like methods
      fallbackDb.schema = {
        hasTable: async (_name: string) => false,
        hasColumn: async (_table: string, _column: string) => false,
        alterTable: async (_name: string, _cb: any) => {},
        createTable: async (_name: string, _cb: any) => {},
      };
      fallbackDb.fn = { now: () => ({ toString: () => 'CURRENT_TIMESTAMP' }) };
      fallbackDb.raw = async () => ({ rows: [] });
      fallbackDb.destroy = () => safeDb?.destroy();

      dbProxy = fallbackDb;
    }
  }
  return dbProxy;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (safeDb) {
    await safeDb.destroy();
    safeDb = null;
  }
}

/**
 * Run database migrations
 * Creates comprehensive schema for ALL project data
 */
export async function runMigrations(): Promise<void> {
  const database = getDatabase();

  // Skip migrations if database failed to initialize
  const actualDb = database.getDb?.() || database;
  if (!actualDb || !actualDb.schema) {
    console.warn("Skipping migrations - database not available");
    return;
  }

  // ============================================
  // PROJECTS TABLE - Core project particulars
  // ============================================
  await actualDb.schema.hasTable("projects").then(async (exists: boolean) => {
    if (!exists) {
      await actualDb.schema.createTable("projects", (table: any) => {
        table.string("id").primary();
        table.string("name").notNullable();
        table.text("description").nullable();
        table.string("icon", 50).defaultTo("📊");
        table.string("icon_color", 20).defaultTo("#3b82f6");
        table.string("status", 20).defaultTo("draft"); // draft, active, archived
        table.boolean("is_deleted").defaultTo(false);

        // Stack Configuration
        table.string("stack_type", 50).defaultTo("nextjs");
        table.string("stack_version", 20).defaultTo("latest"); // e.g., "14.1.0" for Next.js

        // Port Configuration - Generated apps run on port 4001
        table.integer("port").defaultTo(4001);
        table.text("base_url").nullable(); // e.g., "http://localhost:4001"

        // Database Configuration
        table.text("database_url").nullable(); // Connection string
        table.string("database_type", 20).defaultTo("sqlite"); // sqlite, postgres, mysql
        table.text("database_schema").nullable(); // Imported schema

        // Environment Variables - ALL project generated environments
        table.text("environment_variables").nullable(); // JSON: {DEV: {}, PROD: {}, STAGING: {}}
        table.text("secrets").nullable(); // JSON: encrypted secrets storage

        // Generated Application Paths
        table.text("generated_path").nullable(); // Where the app was generated
        table.text("output_directory").nullable(); // e.g., "./output/my-project"

        // Build Configuration
        table.text("build_config").nullable(); // JSON: build options, webpack config, etc.
        table.boolean("is_typescript").defaultTo(true);
        table.boolean("is_tailwind").defaultTo(true);

        // Timestamps
        table.timestamp("created_at").defaultTo(database.fn.now());
        table.timestamp("updated_at").defaultTo(database.fn.now());

        // Indexes
        table.index("status");
        table.index("is_deleted");
        table.index("stack_type");
        table.index("created_at");
      });
    }

    // Add missing columns to existing projects table
    await database.schema.hasColumn("projects", "deployment_status").then(async (exists: boolean) => {
      if (!exists) {
        await database.schema.alterTable("projects", (table: any) => {
          table.string("deployment_status", 20).nullable();
        });
      }
    });

    await database.schema.hasColumn("projects", "deployment_url").then(async (exists: boolean) => {
      if (!exists) {
        await database.schema.alterTable("projects", (table: any) => {
          table.text("deployment_url").nullable();
        });
      }
    });

    await database.schema.hasColumn("projects", "uptime").then(async (exists: boolean) => {
      if (!exists) {
        await database.schema.alterTable("projects", (table: any) => {
          table.text("uptime").nullable();
        });
      }
    });
  });

  // ============================================
  // ERD VERSIONS TABLE - Complete history/versions
  // ============================================
  await database.schema.hasTable("erd_versions").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("erd_versions", (table: any) => {
        table.string("id").primary();
        table.string("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
        table.integer("version_number").notNullable();
        table.text("mermaid_code").notNullable();
        table.text("description").nullable();
        table.boolean("is_current").defaultTo(false);

        // Validation & Analysis
        table.text("validation_errors").nullable(); // JSON: array of validation errors
        table.text("parsed_schema").nullable(); // JSON: parsed entities and relationships
        table.integer("entity_count").defaultTo(0);
        table.integer("relationship_count").defaultTo(0);

        // AI Enhancement Data
        table.text("ai_suggestions").nullable(); // JSON: AI-provided improvements
        table.boolean("ai_enhanced").defaultTo(false);

        // Import Metadata
        table.string("import_source").nullable(); // manual, database_import, ai_generated
        table.text("import_metadata").nullable(); // JSON: source database info, etc.

        // Metadata
        table.string("created_by").nullable(); // user, ai, system
        table.string("commit_message").nullable(); // Version description
        table.text("change_summary").nullable(); // JSON: what changed from previous version
        table.timestamp("created_at").defaultTo(database.fn.now());

        // Indexes
        table.unique(["project_id", "version_number"]);
        table.index("project_id");
        table.index("is_current");
        table.index("created_at");
      });
    }
  });

  // ============================================
  // WORKFLOWS TABLE - All workflow particulars
  // ============================================
  await database.schema.hasTable("workflows").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("workflows", (table: any) => {
        table.string("id").primary();
        table.string("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");

        // Workflow Identification
        table.string("name").notNullable();
        table.string("service_name").notNullable(); // e.g., "UserService", "OrderService"
        table.string("workflow_type", 50).defaultTo("crud"); // crud, custom, event_driven

        // Visual Design
        table.text("mermaid_code").notNullable(); // Workflow diagram
        table.text("description").nullable();

        // Extension Points - BEFORE/AFTER hooks
        table.text("extension_points").nullable(); // JSON: detailed hook configuration
        // Example: {
        //   beforeCreate: { enabled: true, code: "..." },
        //   afterCreate: { enabled: true, code: "..." },
        //   beforeUpdate: { enabled: false },
        //   afterUpdate: { enabled: true, code: "..." },
        //   beforeDelete: { enabled: true, code: "..." },
        //   afterDelete: { enabled: false },
        //   customHooks: [...]
        // }

        // Workflow Configuration
        table.text("config").nullable(); // JSON: timeouts, retries, etc.
        table.json("triggers").nullable(); // Event triggers
        table.json("conditions").nullable(); // Conditional logic

        // Generated Code
        table.text("generated_code").nullable(); // The actual workflow implementation
        table.string("code_language", 20).defaultTo("typescript"); // typescript, javascript, python

        // Status
        table.string("status", 20).defaultTo("draft"); // draft, active, inactive, deprecated
        table.boolean("is_enabled").defaultTo(true);

        // Timestamps
        table.timestamp("created_at").defaultTo(database.fn.now());
        table.timestamp("updated_at").defaultTo(database.fn.now());
        table.timestamp("last_executed_at").nullable();

        // Indexes
        table.index("project_id");
        table.index("service_name");
        table.index("status");
      });
    }
  });

  // ============================================
  // GENERATION HISTORY TABLE - Track all generations
  // ============================================
  await database.schema.hasTable("generation_history").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("generation_history", (table: any) => {
        table.string("id").primary();
        table.string("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");

        // Generation Configuration
        table.string("stack_type").notNullable();
        table.string("stack_version", 50).nullable();
        table.text("generation_options").nullable(); // JSON: additional options

        // Status Tracking
        table.string("status", 20).notNullable(); // pending, generating, completed, failed, cancelled
        table.integer("progress").defaultTo(0); // 0-100
        table.string("current_step").nullable(); // e.g., "Creating models...", "Generating UI..."

        // Output Information - Generated paths and environments
        table.text("generated_path").nullable(); // Main output directory
        table.text("output_structure").nullable(); // JSON: directory structure created
        table.integer("port").nullable(); // Port assigned (4001)

        // File Manifest - ALL generated files
        table.text("file_manifest").nullable(); // JSON: {files: [{path, size, type, hash}]}
        table.text("entry_points").nullable(); // JSON: main files to run

        // Build & Run Configuration
        table.text("build_command").nullable(); // e.g., "bun run build"
        table.text("start_command").nullable(); // e.g., "bun run dev"
        table.text("install_command").nullable(); // e.g., "bun install"
        table.json("dependencies").nullable(); // Package dependencies
        table.json("dev_dependencies").nullable(); // Dev dependencies

        // Environment Configuration
        table.text("environment_config").nullable(); // JSON: {DEV: {}, PROD: {}}
        table.text("docker_config").nullable(); // JSON: docker configuration if generated

        // Logs & Debugging
        table.text("logs").nullable(); // Complete generation logs
        table.text("error_message").nullable(); // Error details if failed
        table.text("warnings").nullable(); // JSON: array of warnings
        table.integer("files_generated").defaultTo(0);
        table.integer("total_size_bytes").defaultTo(0);

        // Timing
        table.timestamp("started_at").defaultTo(database.fn.now());
        table.timestamp("completed_at").nullable();
        table.integer("duration_ms").nullable(); // Generation duration

        // Indexes
        table.index("project_id");
        table.index("status");
        table.index("started_at");
      });
    }
  });

  // ============================================
  // DEPLOYMENTS TABLE - Deployment particulars
  // ============================================
  await database.schema.hasTable("deployments").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("deployments", (table: any) => {
        table.string("id").primary();
        table.string("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");

        // Deployment Status
        table.string("status", 20).defaultTo("stopped"); // running, stopped, error, starting, stopping
        table.string("environment", 20).defaultTo("development"); // development, staging, production

        // Connection Details
        table.string("deployment_url").nullable(); // e.g., "http://localhost:4001"
        table.integer("port").defaultTo(4001);
        table.string("host").defaultTo("localhost");

        // Process Details
        table.string("process_id").nullable(); // PID if running as separate process
        table.text("process_command").nullable(); // Command used to start

        // Health & Monitoring
        table.text("uptime").nullable(); // Formatted uptime string
        table.integer("uptime_seconds").nullable(); // Uptime in seconds
        table.timestamp("last_health_check").nullable();
        table.json("health_status").nullable(); // {status: "healthy", checks: [...]}

        // Resource Usage
        table.json("resource_usage").nullable(); // {cpu: ..., memory: ..., disk: ...}

        // Deployment Configuration
        table.text("deployment_config").nullable(); // JSON: env vars, settings
        table.boolean("auto_restart").defaultTo(false);
        table.integer("restart_count").defaultTo(0);

        // Logs
        table.text("stdout_log").nullable(); // Standard output
        table.text("stderr_log").nullable(); // Error output

        // Timestamps
        table.timestamp("started_at").nullable();
        table.timestamp("stopped_at").nullable();
        table.timestamp("created_at").defaultTo(database.fn.now());
        table.timestamp("updated_at").defaultTo(database.fn.now());

        // Indexes
        table.index("project_id");
        table.index("status");
        table.index("environment");
      });
    }
  });

  // ============================================
  // ENTITIES TABLE - Parsed schema entities
  // ============================================
  await database.schema.hasTable("entities").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("entities", (table: any) => {
        table.string("id").primary();
        table.string("project_id").notNullable().references("id").inTable("projects").onDelete("CASCADE");
        table.string("erd_version_id").nullable().references("id").inTable("erd_versions").onDelete("CASCADE");

        // Entity Details
        table.string("name").notNullable();
        table.text("display_name").nullable();
        table.string("type", 20).defaultTo("entity"); // entity, value_object, enum
        table.text("description").nullable();

        // Schema Definition
        table.text("schema").nullable(); // JSON: complete entity schema
        table.json("fields").nullable(); // JSON: array of fields
        table.json("relationships").nullable(); // JSON: relationships to other entities

        // Generation Options
        table.boolean("generate_api").defaultTo(true);
        table.boolean("generate_ui").defaultTo(true);
        table.boolean("generate_crud").defaultTo(true);

        // Timestamps
        table.timestamp("created_at").defaultTo(database.fn.now());
        table.timestamp("updated_at").defaultTo(database.fn.now());

        // Indexes
        table.index("project_id");
        table.index("erd_version_id");
        table.index("name");
      });
    }
  });

  // ============================================
  // SETTINGS TABLE - Application settings
  // ============================================
  await database.schema.hasTable("settings").then(async (exists: boolean) => {
    if (!exists) {
      await database.schema.createTable("settings", (table: any) => {
        table.string("key").primary();
        table.text("value").nullable();
        table.string("type", 20).defaultTo("string"); // string, number, boolean, json
        table.text("description").nullable();
        table.timestamp("updated_at").defaultTo(database.fn.now());
      });
    }
  });
}

/**
 * Transform database row to camelCase format
 */
function transformProject(dbProject: any): any {
  if (!dbProject) return null;

  return {
    id: dbProject.id,
    name: dbProject.name,
    description: dbProject.description,
    icon: dbProject.icon,
    iconColor: dbProject.icon_color,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
    status: dbProject.status,
    isDeleted: dbProject.is_deleted ? true : false,
    stackType: dbProject.stack_type,
    port: dbProject.port,
    databaseUrl: dbProject.database_url,
    generatedPath: dbProject.generated_path,
    deploymentStatus: dbProject.deployment_status,
    deploymentUrl: dbProject.deployment_url,
    uptime: dbProject.uptime,
    // Include all other fields...
  };
}

/**
 * Project database operations
 */
export const projectDb = {
  /**
   * Get all projects (excluding soft deleted)
   */
  async findAll(options?: { status?: string; includeDeleted?: boolean }) {
    try {
      const database = getDatabase();
      let query = database("projects");

      if (!options?.includeDeleted) {
        query = query.where("is_deleted", false);
      }

      if (options?.status) {
        query = query.where("status", options.status);
      }

      const dbProjects = await query.orderBy("updated_at", "desc").select("*");

      // Transform all projects to camelCase
      return dbProjects.map(transformProject);
    } catch (error) {
      // If database fails, return empty array for now
      console.warn("Database unavailable, returning empty projects list:", error instanceof Error ? error.message : String(error));
      return [];
    }
  },

  /**
   * Search projects by name or description
   */
  async search(searchTerm: string) {
    try {
      const database = getDatabase();
      const dbProjects = await database("projects")
        .where("is_deleted", false)
        .where((builder: any) => {
          builder
            .where("name", "like", `%${searchTerm}%`)
            .orWhere("description", "like", `%${searchTerm}%`);
        })
        .orderBy("updated_at", "desc")
        .select("*");

      // Transform all projects to camelCase
      return dbProjects.map(transformProject);
    } catch (error) {
      // If database fails, return empty array for now
      console.warn("Database unavailable, returning empty search results:", error instanceof Error ? error.message : String(error));
      return [];
    }
  },

  /**
   * Get a project by ID with ALL related data
   */
  async findById(id: string) {
    const database = getDatabase();
    const dbProject = await database("projects")
      .where("id", id)
      .where("is_deleted", false)
      .first();

    if (!dbProject) return null;

    // Transform basic project fields to camelCase
    const project = transformProject(dbProject);

    // Get ALL related data for complete project state
    const [currentErdVersion, erdVersions, workflows, entities, latestGeneration, deployment] = await Promise.all([
      erdVersionDb.getCurrentErdVersion(id),
      erdVersionDb.getVersions(id),
      workflowDb.getWorkflows(id),
      entityDb.getByProject(id),
      generationHistoryDb.getLatest(id),
      deploymentDb.getDeployment(id),
    ]);

    return {
      ...project,
      // ERD Data
      erdCode: currentErdVersion?.mermaid_code,
      erdVersions,
      parsedSchema: currentErdVersion?.parsed_schema ? JSON.parse(currentErdVersion.parsed_schema) : undefined,

      // Workflow Data
      workflows,

      // Schema Entities
      entities,

      // Generation Data
      generatedPath: latestGeneration?.generated_path,
      fileManifest: latestGeneration?.file_manifest ? JSON.parse(latestGeneration.file_manifest) : undefined,
      generationStatus: latestGeneration?.status,
      generationOptions: latestGeneration?.generation_options ? JSON.parse(latestGeneration.generation_options) : undefined,

      // Deployment Data
      deploymentStatus: deployment?.status,
      deploymentUrl: deployment?.deployment_url,
      uptime: deployment?.uptime,
      deploymentEnvironment: deployment?.environment,

      // Configuration Data
      environmentVariables: dbProject.environment_variables ? JSON.parse(dbProject.environment_variables) : {},
      buildConfig: dbProject.build_config ? JSON.parse(dbProject.build_config) : {},
    };
  },

  /**
   * Create a new project
   */
  async create(data: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    icon_color?: string;
    stack_type?: string;
    stack_version?: string;
    port?: number;
    base_url?: string;
    database_url?: string;
    database_type?: string;
    environment_variables?: Record<string, any>;
    secrets?: Record<string, any>;
    generated_path?: string;
    output_directory?: string;
    build_config?: Record<string, any>;
    is_typescript?: boolean;
    is_tailwind?: boolean;
  }) {
    const database = getDatabase();
    const [project] = await database("projects").insert({
      id: data.id,
      name: data.name,
      description: data.description,
      icon: data.icon || "📊",
      icon_color: data.icon_color || "#3b82f6",
      stack_type: data.stack_type || "nextjs",
      stack_version: data.stack_version || "latest",
      port: data.port || 4001,
      base_url: data.base_url || `http://localhost:${data.port || 4001}`,
      database_url: data.database_url,
      database_type: data.database_type || "sqlite",
      environment_variables: JSON.stringify(data.environment_variables || {}),
      secrets: JSON.stringify(data.secrets || {}),
      generated_path: data.generated_path,
      output_directory: data.output_directory,
      build_config: JSON.stringify(data.build_config || {}),
      is_typescript: data.is_typescript !== false,
      is_tailwind: data.is_tailwind !== false,
    }).returning("*");

    return project;
  },

  /**
   * Update a project
   */
  async update(id: string, data: {
    name?: string;
    description?: string;
    icon?: string;
    icon_color?: string;
    status?: string;
    stack_type?: string;
    stack_version?: string;
    port?: number;
    base_url?: string;
    database_url?: string;
    database_type?: string;
    database_schema?: string;
    environment_variables?: Record<string, any>;
    secrets?: Record<string, any>;
    generated_path?: string;
    generatedPath?: string; // Alias for generated_path (camelCase)
    output_directory?: string;
    build_config?: Record<string, any>;
    deployment_url?: string;
    deploymentStatus?: string;
    uptime?: string;
  }) {
    const database = getDatabase();
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.icon_color !== undefined) updateData.icon_color = data.icon_color;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.stack_type !== undefined) updateData.stack_type = data.stack_type;
    if (data.stack_version !== undefined) updateData.stack_version = data.stack_version;
    if (data.port !== undefined) updateData.port = data.port;
    if (data.base_url !== undefined) updateData.base_url = data.base_url;
    if (data.database_url !== undefined) updateData.database_url = data.database_url;
    if (data.database_type !== undefined) updateData.database_type = data.database_type;
    if (data.database_schema !== undefined) updateData.database_schema = data.database_schema;
    if (data.environment_variables !== undefined) updateData.environment_variables = JSON.stringify(data.environment_variables);
    if (data.secrets !== undefined) updateData.secrets = JSON.stringify(data.secrets);
    if (data.generated_path !== undefined) updateData.generated_path = data.generated_path;
    if (data.generatedPath !== undefined) updateData.generated_path = data.generatedPath; // camelCase alias
    if (data.output_directory !== undefined) updateData.output_directory = data.output_directory;
    if (data.build_config !== undefined) updateData.build_config = JSON.stringify(data.build_config);
    if (data.deployment_url !== undefined) updateData.deployment_url = data.deployment_url;
    if (data.uptime !== undefined) updateData.uptime = data.uptime;
    if (data.deploymentStatus !== undefined) updateData.deployment_status = data.deploymentStatus;

    const [project] = await database("projects")
      .where("id", id)
      .update(updateData)
      .returning("*");

    return project;
  },

  /**
   * Soft delete a project
   */
  async softDelete(id: string) {
    const database = getDatabase();
    await database("projects")
      .where("id", id)
      .update({
        is_deleted: true,
      });
  },

  /**
   * Permanently delete a project
   */
  async delete(id: string) {
    const database = getDatabase();
    await database("projects").where("id", id).del();
  },
};

/**
 * ERD Version database operations
 */
export const erdVersionDb = {
  /**
   * Get all versions for a project
   */
  async getVersions(projectId: string) {
    const database = getDatabase();
    return await database("erd_versions")
      .where("project_id", projectId)
      .orderBy("version_number", "desc")
      .select("*");
  },

  /**
   * Get the current ERD version for a project
   */
  async getCurrentErdVersion(projectId: string) {
    const database = getDatabase();
    return await database("erd_versions")
      .where("project_id", projectId)
      .where("is_current", true)
      .first();
  },

  /**
   * Create a new ERD version
   */
  async createVersion(data: {
    project_id: string;
    mermaid_code: string;
    description?: string;
    is_current?: boolean;
    created_by?: string;
    validation_errors?: any[];
    parsed_schema?: any;
    entity_count?: number;
    relationship_count?: number;
    ai_suggestions?: any;
    ai_enhanced?: boolean;
    import_source?: string;
    import_metadata?: any;
    commit_message?: string;
    change_summary?: any;
  }) {
    const database = getDatabase();

    // Get the next version number
    const lastVersion = await database("erd_versions")
      .where("project_id", data.project_id)
      .orderBy("version_number", "desc")
      .first();

    const versionNumber = (lastVersion?.version_number || 0) + 1;

    // If this is the current version, unset previous current versions
    if (data.is_current) {
      await database("erd_versions")
        .where("project_id", data.project_id)
        .update({ is_current: false });
    }

    const [version] = await database("erd_versions").insert({
      id: `erd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      project_id: data.project_id,
      version_number: versionNumber,
      mermaid_code: data.mermaid_code,
      description: data.description,
      is_current: data.is_current ?? true,
      created_by: data.created_by,
      validation_errors: JSON.stringify(data.validation_errors || []),
      parsed_schema: JSON.stringify(data.parsed_schema || {}),
      entity_count: data.entity_count || 0,
      relationship_count: data.relationship_count || 0,
      ai_suggestions: JSON.stringify(data.ai_suggestions || {}),
      ai_enhanced: data.ai_enhanced || false,
      import_source: data.import_source,
      import_metadata: JSON.stringify(data.import_metadata || {}),
      commit_message: data.commit_message,
      change_summary: JSON.stringify(data.change_summary || {}),
    }).returning("*");

    return version;
  },

  /**
   * Update the current version for a project
   */
  async setCurrentVersion(versionId: string) {
    const database = getDatabase();

    const version = await database("erd_versions")
      .where("id", versionId)
      .first();

    if (!version) return null;

    // Unset previous current versions
    await database("erd_versions")
      .where("project_id", version.project_id)
      .update({ is_current: false });

    // Set this as current
    await database("erd_versions")
      .where("id", versionId)
      .update({ is_current: true });

    return await database("erd_versions")
      .where("id", versionId)
      .first();
  },

  /**
   * Delete a version
   */
  async delete(versionId: string) {
    const database = getDatabase();
    await database("erd_versions").where("id", versionId).del();
  },
};

/**
 * Workflow database operations
 */
export const workflowDb = {
  /**
   * Get all workflows for a project
   */
  async getWorkflows(projectId: string) {
    const database = getDatabase();
    return await database("workflows")
      .where("project_id", projectId)
      .orderBy("created_at", "desc")
      .select("*");
  },

  /**
   * Get a workflow by ID
   */
  async findById(id: string) {
    const database = getDatabase();
    return await database("workflows").where("id", id).first();
  },

  /**
   * Create a workflow
   */
  async create(data: {
    project_id: string;
    name: string;
    service_name: string;
    workflow_type?: string;
    mermaid_code: string;
    description?: string;
    extension_points?: any;
    config?: any;
    triggers?: any;
    conditions?: any;
    generated_code?: string;
    code_language?: string;
  }) {
    const database = getDatabase();
    const [workflow] = await database("workflows").insert({
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      project_id: data.project_id,
      name: data.name,
      service_name: data.service_name,
      workflow_type: data.workflow_type || "crud",
      mermaid_code: data.mermaid_code,
      description: data.description,
      extension_points: JSON.stringify(data.extension_points || {}),
      config: JSON.stringify(data.config || {}),
      triggers: JSON.stringify(data.triggers || []),
      conditions: JSON.stringify(data.conditions || []),
      generated_code: data.generated_code,
      code_language: data.code_language || "typescript",
    }).returning("*");

    return workflow;
  },

  /**
   * Update a workflow
   */
  async update(id: string, data: {
    name?: string;
    service_name?: string;
    mermaid_code?: string;
    description?: string;
    status?: string;
    extension_points?: any;
    config?: any;
    triggers?: any;
    conditions?: any;
    generated_code?: string;
  }) {
    const database = getDatabase();
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.service_name !== undefined) updateData.service_name = data.service_name;
    if (data.mermaid_code !== undefined) updateData.mermaid_code = data.mermaid_code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.extension_points !== undefined) updateData.extension_points = JSON.stringify(data.extension_points);
    if (data.config !== undefined) updateData.config = JSON.stringify(data.config);
    if (data.triggers !== undefined) updateData.triggers = JSON.stringify(data.triggers);
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
    if (data.generated_code !== undefined) updateData.generated_code = data.generated_code;

    const [workflow] = await database("workflows")
      .where("id", id)
      .update(updateData)
      .returning("*");

    return workflow;
  },

  /**
   * Delete a workflow
   */
  async delete(id: string) {
    const database = getDatabase();
    await database("workflows").where("id", id).del();
  },
};

/**
 * Hook Workflow database operations
 * Extends workflow functionality for hook-based workflows
 */
export const hookWorkflowDb = {
  /**
   * Get hook workflow by service name
   */
  async getByService(projectId: string, serviceName: string) {
    const database = getDatabase();
    const workflow = await database("workflows")
      .where("project_id", projectId)
      .where("service_name", serviceName)
      .where("workflow_type", "hooks")
      .first();

    if (!workflow) return null;

    // Parse hook_definitions JSON
    return {
      ...workflow,
      hook_definitions: workflow.hook_definitions
        ? JSON.parse(workflow.hook_definitions)
        : [],
      is_draft: Boolean(workflow.is_draft),
    };
  },

  /**
   * Get all hook workflows for a project
   */
  async getAllHookWorkflows(projectId: string) {
    const database = getDatabase();
    const workflows = await database("workflows")
      .where("project_id", projectId)
      .where("workflow_type", "hooks")
      .orderBy("updated_at", "desc")
      .select("*");

    return workflows.map((workflow: any) => ({
      ...workflow,
      hook_definitions: workflow.hook_definitions
        ? JSON.parse(workflow.hook_definitions)
        : [],
      is_draft: Boolean(workflow.is_draft),
    }));
  },

  /**
   * Create or update hook workflow
   */
  async upsert(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
    generatedHookCode?: string;
    isDraft: boolean;
    description?: string;
  }) {
    const database = getDatabase();

    // Check if workflow exists
    const existing = await this.getByService(data.projectId, data.serviceName);

    const workflowData = {
      project_id: data.projectId,
      name: `${data.serviceName} Hooks`,
      service_name: data.serviceName,
      workflow_type: "hooks",
      hook_definitions: JSON.stringify(data.hooks),
      flowchart_code: data.flowchartCode,
      generated_hook_code: data.generatedHookCode,
      is_draft: data.isDraft ? 1 : 0,
      description: data.description,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update existing
      const [workflow] = await database("workflows")
        .where("id", existing.id)
        .update(workflowData)
        .returning("*");

      return {
        ...workflow,
        hook_definitions: data.hooks,
        is_draft: data.isDraft,
      };
    } else {
      // Create new
      const [workflow] = await database("workflows")
        .insert({
          id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...workflowData,
          status: data.isDraft ? "draft" : "active",
          created_at: new Date().toISOString(),
        })
        .returning("*");

      return {
        ...workflow,
        hook_definitions: data.hooks,
        is_draft: data.isDraft,
      };
    }
  },

  /**
   * Save draft workflow
   */
  async saveDraft(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
  }) {
    return await this.upsert({
      ...data,
      isDraft: true,
    });
  },

  /**
   * Apply workflow (full save with validation)
   */
  async apply(data: {
    projectId: string;
    serviceName: string;
    hooks: any[];
    flowchartCode: string;
    generatedHookCode?: string;
    description?: string;
  }) {
    return await this.upsert({
      ...data,
      isDraft: false,
    });
  },

  /**
   * Delete hook workflow by service
   */
  async deleteByService(projectId: string, serviceName: string) {
    const database = getDatabase();
    await database("workflows")
      .where("project_id", projectId)
      .where("service_name", serviceName)
      .where("workflow_type", "hooks")
      .del();
  },

  /**
   * Save GoRules configuration for a specific workflow step
   */
  async saveGoRules(data: {
    projectId: string;
    serviceName: string;
    workflowId: string;
    hookType: string;
    rules: string; // JSON stringified GoRules model
  }) {
    const database = getDatabase();

    // Get the workflow
    const workflow = await this.getByService(data.projectId, data.serviceName);
    if (!workflow) {
      throw new Error(`Workflow not found for service ${data.serviceName}`);
    }

    // Parse existing hook definitions
    const hookDefinitions = workflow.hook_definitions || [];

    // Find or create the hook that matches this hookType
    const hookIndex = hookDefinitions.findIndex((h: any) => h.type === data.hookType);
    if (hookIndex === -1) {
      throw new Error(`Hook of type ${data.hookType} not found in workflow`);
    }

    // Store GoRules configuration in the hook
    hookDefinitions[hookIndex].goRules = data.rules;

    // Update the workflow with the modified hook definitions
    const [updatedWorkflow] = await database("workflows")
      .where("id", workflow.id)
      .update({
        hook_definitions: JSON.stringify(hookDefinitions),
        updated_at: new Date().toISOString(),
      })
      .returning("*");

    return {
      ...updatedWorkflow,
      hook_definitions: hookDefinitions,
      is_draft: updatedWorkflow.is_draft === 1,
    };
  },

  /**
   * Get GoRules configuration for a specific workflow step
   */
  async getGoRules(data: {
    projectId: string;
    serviceName: string;
    workflowId: string;
    hookType: string;
  }) {
    // Get the workflow
    const workflow = await this.getByService(data.projectId, data.serviceName);
    if (!workflow) {
      return null;
    }

    // Parse hook definitions
    const hookDefinitions = workflow.hook_definitions || [];

    // Find the hook that matches this hookType
    const hook = hookDefinitions.find((h: any) => h.type === data.hookType);
    if (!hook) {
      return null;
    }

    // Return GoRules configuration
    return {
      workflowId: data.workflowId,
      hookType: data.hookType,
      rules: hook.goRules || null,
      updatedAt: workflow.updated_at,
    };
  },
};

/**
 * Generation History database operations
 */
export const generationHistoryDb = {
  /**
   * Get all generation history for a project
   */
  async getAll(projectId: string) {
    const database = getDatabase();
    return await database("generation_history")
      .where("project_id", projectId)
      .orderBy("started_at", "desc")
      .select("*");
  },

  /**
   * Get the latest generation for a project
   */
  async getLatest(projectId: string) {
    const database = getDatabase();
    return await database("generation_history")
      .where("project_id", projectId)
      .orderBy("started_at", "desc")
      .first();
  },

  /**
   * Get by status
   */
  async getByStatus(projectId: string, status: string) {
    const database = getDatabase();
    return await database("generation_history")
      .where("project_id", projectId)
      .where("status", status)
      .orderBy("started_at", "desc")
      .select("*");
  },

  /**
   * Create a generation record
   */
  async create(data: {
    project_id: string;
    stack_type: string;
    stack_version?: string;
    generation_options?: any;
    status: string;
  }) {
    const database = getDatabase();
    const [generation] = await database("generation_history").insert({
      id: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      project_id: data.project_id,
      stack_type: data.stack_type,
      stack_version: data.stack_version,
      generation_options: JSON.stringify(data.generation_options || {}),
      status: data.status,
      progress: 0,
    }).returning("*");

    return generation;
  },

  /**
   * Update generation progress
   */
  async updateProgress(id: string, data: {
    progress?: number;
    current_step?: string;
    status?: string;
    logs?: string;
    error_message?: string;
    warnings?: any;
    files_generated?: number;
    total_size_bytes?: number;
  }) {
    const database = getDatabase();
    const updateData: any = { ...data };

    if (data.warnings !== undefined) updateData.warnings = JSON.stringify(data.warnings);

    const [generation] = await database("generation_history")
      .where("id", id)
      .update(updateData)
      .returning("*");

    return generation;
  },

  /**
   * Complete generation with output details
   */
  async complete(id: string, data: {
    generated_path: string;
    output_structure?: any;
    port?: number;
    file_manifest?: any;
    entry_points?: any;
    build_command?: string;
    start_command?: string;
    install_command?: string;
    dependencies?: any;
    dev_dependencies?: any;
    environment_config?: any;
    docker_config?: any;
    duration_ms?: number;
    files_generated?: number;
    total_size_bytes?: number;
  }) {
    const database = getDatabase();
    const updateData: any = {
      status: "completed",
      progress: 100,
      completed_at: database.fn.now(),
      ...data,
    };

    // Convert objects to JSON
    if (data.output_structure !== undefined) updateData.output_structure = JSON.stringify(data.output_structure);
    if (data.file_manifest !== undefined) updateData.file_manifest = JSON.stringify(data.file_manifest);
    if (data.entry_points !== undefined) updateData.entry_points = JSON.stringify(data.entry_points);
    if (data.dependencies !== undefined) updateData.dependencies = JSON.stringify(data.dependencies);
    if (data.dev_dependencies !== undefined) updateData.dev_dependencies = JSON.stringify(data.dev_dependencies);
    if (data.environment_config !== undefined) updateData.environment_config = JSON.stringify(data.environment_config);
    if (data.docker_config !== undefined) updateData.docker_config = JSON.stringify(data.docker_config);

    const [generation] = await database("generation_history")
      .where("id", id)
      .update(updateData)
      .returning("*");

    return generation;
  },

  /**
   * Mark generation as failed
   */
  async fail(id: string, errorMessage: string, logs?: string) {
    const database = getDatabase();
    const [generation] = await database("generation_history")
      .where("id", id)
      .update({
        status: "failed",
        error_message: errorMessage,
        logs,
        completed_at: database.fn.now(),
      })
      .returning("*");

    return generation;
  },
};

/**
 * Deployment database operations
 */
export const deploymentDb = {
  /**
   * Get deployment for a project
   */
  async getDeployment(projectId: string, environment: string = "development") {
    const database = getDatabase();
    return await database("deployments")
      .where("project_id", projectId)
      .where("environment", environment)
      .first();
  },

  /**
   * Get all deployments for a project
   */
  async getAllDeployments(projectId: string) {
    const database = getDatabase();
    return await database("deployments")
      .where("project_id", projectId)
      .orderBy("created_at", "desc")
      .select("*");
  },

  /**
   * Create or update deployment
   */
  async upsert(data: {
    project_id: string;
    status: string;
    environment?: string;
    deployment_url?: string;
    port?: number;
    host?: string;
    process_id?: string;
    process_command?: string;
    uptime?: string;
    uptime_seconds?: number;
    deployment_config?: any;
    stdout_log?: string;
    stderr_log?: string;
  }) {
    const database = getDatabase();
    const existing = await this.getDeployment(
      data.project_id,
      data.environment || "development"
    );

    const updateData: any = {
      ...data,
      updated_at: database.fn.now(),
    };

    if (data.deployment_config !== undefined) updateData.deployment_config = JSON.stringify(data.deployment_config);

    if (existing) {
      // Handle running state
      if (data.status === "running" && existing.status !== "running") {
        updateData.started_at = database.fn.now();
        updateData.restart_count = (existing.restart_count || 0) + 1;
      } else if (data.status === "stopped" && existing.status === "running") {
        updateData.stopped_at = database.fn.now();
        // Calculate uptime
        if (existing.started_at) {
          const started = new Date(existing.started_at).getTime();
          const now = Date.now();
          updateData.uptime_seconds = Math.floor((now - started) / 1000);
        }
      }

      const [deployment] = await database("deployments")
        .where("id", existing.id)
        .update(updateData)
        .returning("*");
      return deployment;
    } else {
      // New deployment
      if (data.status === "running") {
        updateData.started_at = database.fn.now();
      }

      const [deployment] = await database("deployments").insert({
        id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...updateData,
      }).returning("*");
      return deployment;
    }
  },

  /**
   * Update deployment health
   */
  async updateHealth(id: string, healthData: {
    health_status?: any;
    resource_usage?: any;
    last_health_check?: Date;
    stdout_log?: string;
    stderr_log?: string;
    uptime?: string;
    uptime_seconds?: number;
  }) {
    const database = getDatabase();
    const updateData: any = { ...healthData };

    if (healthData.health_status !== undefined) updateData.health_status = JSON.stringify(healthData.health_status);
    if (healthData.resource_usage !== undefined) updateData.resource_usage = JSON.stringify(healthData.resource_usage);

    const [deployment] = await database("deployments")
      .where("id", id)
      .update(updateData)
      .returning("*");

    return deployment;
  },

  /**
   * Stop and delete deployment
   */
  async delete(projectId: string, environment: string = "development") {
    const database = getDatabase();

    // First stop it
    await database("deployments")
      .where("project_id", projectId)
      .where("environment", environment)
      .update({
        status: "stopped",
        stopped_at: database.fn.now(),
      });

    // Then delete
    await database("deployments")
      .where("project_id", projectId)
      .where("environment", environment)
      .del();
  },
};

/**
 * Entity database operations
 */
export const entityDb = {
  /**
   * Get all entities for a project
   */
  async getByProject(projectId: string) {
    const database = getDatabase();
    return await database("entities")
      .where("project_id", projectId)
      .orderBy("name")
      .select("*");
  },

  /**
   * Get entities for an ERD version
   */
  async getByErdVersion(erdVersionId: string) {
    const database = getDatabase();
    return await database("entities")
      .where("erd_version_id", erdVersionId)
      .orderBy("name")
      .select("*");
  },

  /**
   * Create or update entities from schema
   */
  async upsert(data: {
    project_id: string;
    erd_version_id?: string;
    name: string;
    display_name?: string;
    type?: string;
    description?: string;
    schema?: any;
    fields?: any[];
    relationships?: any[];
    generate_api?: boolean;
    generate_ui?: boolean;
    generate_crud?: boolean;
  }) {
    const database = getDatabase();

    // Check if entity exists
    const existing = await database("entities")
      .where("project_id", data.project_id)
      .where("name", data.name)
      .first();

    if (existing) {
      const [entity] = await database("entities")
        .where("id", existing.id)
        .update({
          ...data,
          schema: JSON.stringify(data.schema || {}),
          fields: JSON.stringify(data.fields || []),
          relationships: JSON.stringify(data.relationships || []),
          updated_at: database.fn.now(),
        })
        .returning("*");
      return entity;
    } else {
      const [entity] = await database("entities").insert({
        id: `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        schema: JSON.stringify(data.schema || {}),
        fields: JSON.stringify(data.fields || []),
        relationships: JSON.stringify(data.relationships || []),
      }).returning("*");
      return entity;
    }
  },

  /**
   * Delete entities for a project
   */
  async deleteByProject(projectId: string) {
    const database = getDatabase();
    await database("entities").where("project_id", projectId).del();
  },
};

/**
 * Settings database operations
 */
export const settingsDb = {
  /**
   * Get a setting value
   */
  async get(key: string) {
    const database = getDatabase();
    const setting = await database("settings").where("key", key).first();
    if (!setting) return null;

    // Parse value based on type
    switch (setting.type) {
      case "number":
        return Number(setting.value);
      case "boolean":
        return setting.value === "true";
      case "json":
        return JSON.parse(setting.value || "{}");
      default:
        return setting.value;
    }
  },

  /**
   * Set a setting value
   */
  async set(key: string, value: any, type: string = "string", description?: string) {
    const database = getDatabase();

    let stringValue: string;
    switch (type) {
      case "json":
        stringValue = JSON.stringify(value);
        break;
      case "boolean":
        stringValue = String(value);
        break;
      default:
        stringValue = String(value);
    }

    const existing = await database("settings").where("key", key).first();
    if (existing) {
      await database("settings")
        .where("key", key)
        .update({
          value: stringValue,
          type,
          description,
          updated_at: database.fn.now(),
        });
    } else {
      await database("settings").insert({
        key,
        value: stringValue,
        type,
        description,
      });
    }
  },
};

// Export all database operations
export const dbOperations = {
  projects: projectDb,
  erdVersions: erdVersionDb,
  workflows: workflowDb,
  generationHistory: generationHistoryDb,
  deployments: deploymentDb,
  entities: entityDb,
  settings: settingsDb,
};
