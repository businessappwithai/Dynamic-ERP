import type { EntityColumn } from "@erdwithai/erpclaw-client";

/**
 * Same heuristic as @erdwithai/erpclaw-bridge's mapping.ts
 * (MONEY_NAME_HINTS / inferAttributeType) — duplicated intentionally, not by
 * oversight. erpclaw-bridge is a design-time Node package (Studio's
 * dictionary sync); this file ships in the browser bundle of every
 * generated app and can't import from a Node-only package. If you change
 * one, consider changing the other.
 *
 * erpclaw has no per-column "semantic type" (money/reference/enum) in its
 * schema endpoint — money fields are Decimal-as-TEXT, indistinguishable
 * from any other TEXT column by Postgres data_type alone. These heuristics
 * are best-effort, not authoritative.
 */
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

const LONG_TEXT_NAME_HINTS = ["description", "notes", "note", "comment", "message", "reasoning", "summary"];

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "money"
  | "date"
  | "datetime"
  | "boolean"
  | "reference"
  | "json";

/** Infers a UI field kind from a raw `information_schema`-shaped column. */
export function inferFieldKind(column: EntityColumn, isForeignKey: boolean): FieldKind {
  if (isForeignKey) return "reference";

  const type = column.data_type.toLowerCase();
  const name = column.column_name.toLowerCase();

  if (type === "boolean") return "boolean";
  if (["integer", "bigint", "smallint"].includes(type)) return "number";
  if (["numeric", "real", "double precision"].includes(type)) return "number";
  if (type === "date") return "date";
  if (type.startsWith("timestamp")) return "datetime";
  if (type === "json" || type === "jsonb") return "json";

  // text / varchar / character varying / anything else: apply name heuristics.
  if (MONEY_NAME_HINTS.some((hint) => name.includes(hint))) return "money";
  if (LONG_TEXT_NAME_HINTS.some((hint) => name.includes(hint))) return "textarea";
  return "text";
}
