/**
 * TanStack Query key helpers, scoped per erpclaw entity (table name).
 * Deliberately small and generic — every entity is served by the same
 * generic routes/components, so there's no per-entity key to hand-write.
 */
export const entityKeys = {
  all: (entity: string) => ["erp-entity", entity] as const,
  list: (entity: string) => ["erp-entity", entity, "list"] as const,
  detail: (entity: string, id: string) => ["erp-entity", entity, "detail", id] as const,
  schema: (entity: string) => ["erp-entity", entity, "schema"] as const,
};
