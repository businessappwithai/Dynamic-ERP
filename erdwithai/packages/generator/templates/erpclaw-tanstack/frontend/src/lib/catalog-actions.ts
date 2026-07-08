import type { Catalog, CatalogAction } from "@erdwithai/erpclaw-client";

/** erpclaw action names are kebab-case; table names are snake_case. */
function toKebab(tableName: string): string {
  return tableName.replace(/_/g, "-");
}

/**
 * Best-effort catalog lookup for the action that lists/searches rows of
 * `entityTable`. erpclaw's catalog has no declared "this action lists this
 * table" relationship (see @erdwithai/erpclaw-client's contract.ts) — this
 * is a naming heuristic, same posture as erpclaw-bridge's schema-mapping
 * heuristics (packages/erpclaw-bridge/src/mapping.ts).
 */
export function findListAction(catalog: Catalog, entityTable: string): CatalogAction | undefined {
  const kebab = toKebab(entityTable);
  const candidates = new Set([`list-${kebab}`, `search-${kebab}`, `list-${kebab}s`, `get-${kebab}-list`]);
  return catalog.actions.find((action) => candidates.has(action.name));
}

/**
 * Best-effort lookup for the create/update action backing DynamicForm.
 * Falls back to a couple of common verb synonyms before giving up.
 */
export function findSaveAction(catalog: Catalog, entityTable: string, isNew: boolean): CatalogAction | undefined {
  const kebab = toKebab(entityTable);
  const verbs = isNew ? ["create", "add", "new"] : ["update", "edit", "set"];
  for (const verb of verbs) {
    const found = catalog.actions.find((action) => action.name === `${verb}-${kebab}`);
    if (found) return found;
  }
  return undefined;
}

const ROW_ACTION_VERBS = ["submit", "cancel", "approve", "reject", "post", "void", "close"];

/** Actions shaped like "<verb>-<entity>" for a small set of common ERP document verbs. */
export function findRowActions(catalog: Catalog, entityTable: string): CatalogAction[] {
  const kebab = toKebab(entityTable);
  return catalog.actions.filter((action) => ROW_ACTION_VERBS.some((verb) => action.name === `${verb}-${kebab}`));
}

/** Populates an action's declared args from whatever the row/values already has under matching keys. */
export function buildActionArgs(action: CatalogAction, source: Record<string, unknown>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const propName of Object.keys(action.input_schema.properties)) {
    if (propName in source) args[propName] = source[propName];
  }
  return args;
}
