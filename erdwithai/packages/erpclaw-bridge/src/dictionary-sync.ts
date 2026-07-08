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
import { DictionaryGenerator, type DictionaryContext } from "@erdwithai/generator";
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
