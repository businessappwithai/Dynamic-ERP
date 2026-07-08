/**
 * Entity[]/Relationship[] -> Mermaid erDiagram syntax.
 *
 * Deliberately NOT reusing @erdwithai/ai's generateMermaidProgrammatic: that
 * function lives behind a barrel export (@erdwithai/ai -> agents/index.ts)
 * that also re-exports domain-agent.ts/entity-agent.ts, which construct
 * Mastra Agent instances as a module-load side effect. Depending on
 * @erdwithai/ai here would mean erpclaw-bridge's schema-sync path silently
 * requires Mastra/Anthropic configuration just to build a string. This is a
 * small, dependency-free reimplementation of the same syntax convention
 * (kept compatible with Studio's existing Mermaid rendering), operating
 * directly on Entity/Relationship (erpclaw-bridge's native shape) instead of
 * the AI package's EntityCandidate/RelationshipCandidate.
 */
import type { Entity, Relationship } from "@erdwithai/core/types";

const CARDINALITY_SYMBOL: Record<Relationship["cardinality"], string> = {
  oneToOne: "||--||",
  oneToMany: "||--o{",
  manyToOne: "}o--||",
  manyToMany: "}o--o{",
};

export function entitiesToMermaid(entities: Entity[], relationships: Relationship[]): string {
  let syntax = "erDiagram\n";

  for (const rel of relationships) {
    syntax += `    ${rel.sourceEntity} ${CARDINALITY_SYMBOL[rel.cardinality]} ${rel.targetEntity} : ${rel.name}\n`;
  }

  syntax += "\n";

  for (const entity of entities) {
    syntax += `    ${entity.name} {\n`;
    for (const attr of entity.attributes) {
      const modifiers: string[] = [];
      if (attr.name === entity.primaryKey) modifiers.push("PK");
      if (attr.unique) modifiers.push("UK");
      syntax += `        ${attr.type} ${attr.name}${modifiers.length ? " " + modifiers.join(" ") : ""}\n`;
    }
    syntax += `    }\n\n`;
  }

  return syntax;
}
