/**
 * Orchestrates a full erpclaw -> Studio dictionary sync: fetch the live
 * Postgres schema for every real erpclaw table via erpclaw-client, map it
 * onto Entity[]/Relationship[] (mapping.ts), then feed the SAME
 * DictionaryGenerator the hand-designed-ERD path already uses, so an
 * ERP-origin table is indistinguishable from a designed one to every
 * downstream consumer (templates, RBAC, admin UI).
 *
 * Deliberately does NOT persist anything itself — erdwithai's own DB layer
 * (packages/core, Kysely + mysql2 today) is a separate, not-yet-migrated
 * concern (studio's Postgres migration is a documented follow-up, out of
 * scope for this package). Callers persist the result however their storage
 * layer works — e.g. writing `result.mermaid` into a project's
 * `erd_versions.mermaid_code` and `JSON.stringify({entities, relationships})`
 * into `erd_versions.parsed_schema`, exactly as if a user had hand-drawn
 * this ERD (see the README for the intended call site).
 */
import {
  DictionaryGenerator,
  GeneratorOrchestrator,
  type DictionaryContext,
  type GenerationResult,
} from "@erdwithai/generator";
import type { Entity, Relationship } from "@erdwithai/core/types";
import type { ErpClawClient } from "@erdwithai/erpclaw-client";

import { mapErpSchemasToEntities } from "./mapping";
import { entitiesToMermaid } from "./mermaid";

export interface SyncResult {
  erpclawVersion: string;
  entities: Entity[];
  relationships: Relationship[];
  dictionaryContext: DictionaryContext;
  mermaid: string;
}

export interface SyncAndGenerateOptions {
  /** Where erpclaw-tanstack's generated app should point for its data layer.
   * Typically the same URL the ErpClawClient passed to DictionarySyncService
   * itself talks to — the caller already has it, pass it through. */
  gatewayUrl: string;
  projectName: string;
  outputDir: string;
  projectVersion?: string;
  projectDescription?: string;
  port?: number;
}

export class DictionarySyncService {
  constructor(private readonly client: ErpClawClient) {}

  /** Full sync: every real table in the erpclaw database becomes an Entity. */
  async syncAll(): Promise<SyncResult> {
    const catalog = await this.client.catalog();
    const entityNames = await this.client.listEntities();
    const schemas = await Promise.all(entityNames.map((name) => this.client.schema(name)));

    const { entities, relationships } = mapErpSchemasToEntities(schemas);

    const generator = new DictionaryGenerator({
      databaseType: "postgresql", // the platform is Postgres-only end to end; never expose mysql/sqlite here
      includeRbac: true,
      randomizeFieldOrder: false,
    });
    const dictionaryContext = generator.generateDictionaryContext(entities, relationships);
    const mermaid = entitiesToMermaid(entities, relationships);

    return {
      erpclawVersion: catalog.version,
      entities,
      relationships,
      dictionaryContext,
      mermaid,
    };
  }

  /**
   * The full loop: sync erpclaw's live schema, then actually generate an
   * app from it (erpclaw-tanstack by default — no generated backend/DB,
   * since erpclaw already is the backend). The generated app's own
   * migration templates are what materialize `sys_table`/`sys_column` as
   * real rows — DictionarySyncService itself never writes to any database;
   * GeneratorOrchestrator computes the same DictionaryContext internally
   * (visible in its own console output as "sys_table entries: N" etc.)
   * before handing it to the stack's generator.
   */
  async syncAndGenerate(options: SyncAndGenerateOptions): Promise<{ sync: SyncResult; generation: GenerationResult }> {
    const sync = await this.syncAll();

    const orchestrator = new GeneratorOrchestrator({
      stackOption: "erpclaw-tanstack",
      projectName: options.projectName,
      projectVersion: options.projectVersion ?? "0.1.0",
      projectDescription:
        options.projectDescription ?? `Generated from erpclaw ${sync.erpclawVersion} (${sync.entities.length} entities).`,
      outputDir: options.outputDir,
      port: options.port ?? 3000,
      databaseType: "postgresql",
      includeRbac: true,
      randomizeFieldOrder: false,
      erpclawTanstack: { frontend: { gatewayUrl: options.gatewayUrl } },
    });

    const generation = await orchestrator.generate(sync.entities, sync.relationships);
    return { sync, generation };
  }

  /** Sync a specific subset of tables (e.g. just the ones a project cares about). */
  async syncEntities(tableNames: string[]): Promise<SyncResult> {
    const catalog = await this.client.catalog();
    const schemas = await Promise.all(tableNames.map((name) => this.client.schema(name)));
    const { entities, relationships } = mapErpSchemasToEntities(schemas);

    const generator = new DictionaryGenerator({
      databaseType: "postgresql",
      includeRbac: true,
      randomizeFieldOrder: false,
    });
    const dictionaryContext = generator.generateDictionaryContext(entities, relationships);
    const mermaid = entitiesToMermaid(entities, relationships);

    return { erpclawVersion: catalog.version, entities, relationships, dictionaryContext, mermaid };
  }
}
