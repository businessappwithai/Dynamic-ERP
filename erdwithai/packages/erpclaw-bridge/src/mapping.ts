/**
 * Maps erpclaw's live Postgres schema (fetched via @erdwithai/erpclaw-client)
 * onto erdwithai's existing generic Entity/Relationship types — the same
 * shape the Mermaid parser produces from a hand-drawn ERD. This is the whole
 * point: ERP-origin tables ride the exact pipeline a designed entity does
 * (DictionaryGenerator, templates, RBAC), no parallel representation.
 *
 * erpclaw has no per-column "semantic type" (money/reference/enum) in its
 * schema endpoint — money fields are Decimal-as-TEXT, indistinguishable from
 * any other TEXT column by Postgres data_type alone. The heuristics below are
 * best-effort, not authoritative (same posture as the gateway's own action
 * schemas) — a human reviewing a synced entity in Studio can always correct
 * a field's type.
 */
import { tableNameToEntityName } from "@erdwithai/core/utils";
import type { Entity, EntityAttribute, Relationship } from "@erdwithai/core/types";
import type { EntitySchema as ErpEntitySchema, EntityColumn } from "@erdwithai/erpclaw-client";

const PG_TYPE_TO_ATTRIBUTE_TYPE: Record<string, EntityAttribute["type"]> = {
  boolean: "boolean",
  integer: "integer",
  bigint: "integer",
  smallint: "integer",
  numeric: "decimal",
  real: "decimal",
  "double precision": "decimal",
  date: "date",
  "timestamp without time zone": "datetime",
  "timestamp with time zone": "datetime",
  json: "json",
  jsonb: "json",
};

// erpclaw stores money as Decimal-as-TEXT (never a numeric Postgres type,
// deliberately — see the platform's own "never float" invariant), so a money
// column's Postgres data_type is just "text" like everything else. Recover
// the semantic via a name heuristic instead.
const MONEY_NAME_HINTS = [
  "amount",
  "total",
  "rate",
  "price",
  "balance",
  "outstanding",
  "grand_total",
  "credit_limit",
  "subtotal",
];

// TEXT columns default to "string" (most erpclaw text fields are short
// identifiers/labels/codes, not free-form content); bump known long-content
// field names to "text" instead.
const LONG_TEXT_NAME_HINTS = ["description", "notes", "note", "comment", "message", "reasoning", "summary"];

function inferAttributeType(column: EntityColumn): EntityAttribute["type"] {
  const mapped = PG_TYPE_TO_ATTRIBUTE_TYPE[column.data_type];
  if (mapped) return mapped;

  // data_type "text" (erpclaw's near-universal column type) needs the name
  // heuristics; anything else unrecognized falls back to "string".
  if (column.data_type !== "text") return "string";

  const name = column.column_name.toLowerCase();
  if (MONEY_NAME_HINTS.some((hint) => name.includes(hint))) return "decimal";
  if (LONG_TEXT_NAME_HINTS.some((hint) => name.includes(hint))) return "text";
  return "string";
}

/** Convert one erpclaw table's schema into an Entity + its outgoing Relationships. */
export function mapErpTableToEntity(erpSchema: ErpEntitySchema): {
  entity: Entity;
  relationships: Relationship[];
} {
  const entityName = tableNameToEntityName(erpSchema.entity);
  const fkColumns = new Set(erpSchema.foreign_keys.map((fk) => fk.column_name));

  const attributes: EntityAttribute[] = erpSchema.columns
    .filter((col) => !fkColumns.has(col.column_name)) // FKs become Relationships, not attributes
    .map((col) => ({
      name: col.column_name,
      type: inferAttributeType(col),
      required: col.is_nullable === "NO" && col.column_default === null,
      maxLength: col.character_maximum_length ?? undefined,
    }));

  const entity: Entity = {
    name: entityName,
    tableName: erpSchema.entity,
    description: `Synced from erpclaw (origin: erpclaw). Structural changes flow through erpclaw module upgrades, not manual editing.`,
    attributes,
    primaryKey: erpSchema.primary_key[0] ?? "id",
    timestamps: erpSchema.columns.some((c) => c.column_name === "created_at"),
  };

  const relationships: Relationship[] = erpSchema.foreign_keys.map((fk) => ({
    name: `${erpSchema.entity}_${fk.column_name}`,
    sourceEntity: entityName,
    targetEntity: tableNameToEntityName(fk.foreign_table),
    cardinality: "manyToOne",
    foreignKey: fk.column_name,
  }));

  return { entity, relationships };
}

export function mapErpSchemasToEntities(schemas: ErpEntitySchema[]): {
  entities: Entity[];
  relationships: Relationship[];
} {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  for (const schema of schemas) {
    const mapped = mapErpTableToEntity(schema);
    entities.push(mapped.entity);
    relationships.push(...mapped.relationships);
  }
  // A relationship's targetEntity may reference a table not itself synced
  // (e.g. a bookkeeping table excluded by the gateway's entity list) —
  // drop relationships whose target isn't among the synced entities so
  // downstream consumers (DictionaryGenerator, Mermaid) never see a dangling
  // reference.
  const knownEntityNames = new Set(entities.map((e) => e.name));
  const validRelationships = relationships.filter((r) => knownEntityNames.has(r.targetEntity));
  return { entities, relationships: validRelationships };
}
