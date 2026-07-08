/**
 * Type contract for the erpclaw-gateway HTTP API.
 *
 * These shapes are transcribed directly from the gateway's implementation
 * (erpclaw-gateway/app/routes/catalog.py, routes/schema.py, routes/actions.py,
 * catalog/cache.py, catalog/introspect.py) and verified by direct curl
 * testing against a running gateway backed by real Postgres — not derived
 * from any architecture-doc pseudocode.
 */

/** One entry in `GET /api/v1/catalog`'s "domains" array. */
export interface CatalogDomain {
  name: string;
  domain_dir: string;
  action_count: number;
}

/**
 * JSON-Schema-shaped input schema for one action.
 *
 * Every property is optional at the type level even though `required` is
 * present on the wire: erpclaw-gateway deliberately never infers
 * required-ness (see app/catalog/introspect.py's action_input_schema) —
 * required-ness is enforced at runtime by erpclaw itself, not by this
 * schema. `required` is always `[]` today; it is still modeled as
 * `string[]` in case the gateway starts populating it later.
 */
export interface ActionInputSchema {
  type: "object";
  properties: Record<string, { type: string; description?: string }>;
  required: string[];
  description: string;
}

/** Documented generic passthrough — see introspect.py's OUTPUT_SCHEMA. */
export interface ActionOutputSchema {
  type: "object";
  description: string;
}

/** One entry in `GET /api/v1/catalog`'s "actions" array. */
export interface CatalogAction {
  name: string;
  domain: string;
  domain_dir: string;
  kind: "query" | "mutation" | "report";
  description: string;
  destructive: boolean;
  input_schema: ActionInputSchema;
  output_schema: ActionOutputSchema;
}

/** Full response body of `GET /api/v1/catalog`. */
export interface Catalog {
  version: string;
  action_count: number;
  domains: CatalogDomain[];
  actions: CatalogAction[];
  aliases: Record<string, string>;
}

/** One row of `GET /api/v1/schema/{entity}`'s "columns" array. */
export interface EntityColumn {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  character_maximum_length: number | null;
}

/** One row of `GET /api/v1/schema/{entity}`'s "foreign_keys" array. */
export interface ForeignKeyRef {
  column_name: string;
  foreign_table: string;
  foreign_column: string;
}

/** Full response body of `GET /api/v1/schema/{entity}`. */
export interface EntitySchema {
  entity: string;
  columns: EntityColumn[];
  primary_key: string[];
  foreign_keys: ForeignKeyRef[];
}

/**
 * Branded string type for money fields.
 *
 * The gateway always returns money as a JSON string (e.g. `"200.00"`),
 * never a JSON number — this exists purely so callers can't accidentally
 * pass a `number` where a money value is expected. It carries no runtime
 * behavior; use `asMoney()` (or a plain `as Money` cast at the boundary
 * where you've verified the value came from the wire) to construct one.
 */
export type Money = string & { readonly __brand: "Money" };

/** Narrows a raw string into a `Money` value. No validation is performed. */
export function asMoney(value: string): Money {
  return value as Money;
}

/**
 * erpclaw's own response envelope from `POST /api/v1/actions/{domain}/{action}`,
 * returned verbatim by the gateway with the HTTP status conveying outcome.
 * Extra fields vary per action (e.g. a successful create-sales-invoice
 * response also carries `sales_invoice_id`, `total_amount`, etc.), so this
 * is deliberately loose beyond the `status` discriminant.
 */
export type ActionEnvelope =
  | { status: "ok"; [key: string]: unknown }
  | { status: "confirmation_required"; action: string; destructive: true; message: string }
  | { status: "error"; message?: string; error?: string; suggestion?: string; action?: string };
