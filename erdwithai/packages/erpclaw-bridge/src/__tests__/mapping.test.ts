import { describe, expect, it } from "vitest";
import { mapErpSchemasToEntities, mapErpTableToEntity } from "../mapping";
import { entitiesToMermaid } from "../mermaid";
import type { EntitySchema } from "@erdwithai/erpclaw-client";

const customerSchema: EntitySchema = {
  entity: "customer",
  columns: [
    { column_name: "id", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
    { column_name: "name", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
    { column_name: "credit_limit", data_type: "text", is_nullable: "YES", column_default: null, character_maximum_length: null },
    { column_name: "created_at", data_type: "timestamp without time zone", is_nullable: "NO", column_default: "now()", character_maximum_length: null },
    { column_name: "company_id", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
  ],
  primary_key: ["id"],
  foreign_keys: [{ column_name: "company_id", foreign_table: "company", foreign_column: "id" }],
};

const companySchema: EntitySchema = {
  entity: "company",
  columns: [
    { column_name: "id", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
    { column_name: "name", data_type: "text", is_nullable: "NO", column_default: null, character_maximum_length: null },
  ],
  primary_key: ["id"],
  foreign_keys: [],
};

describe("mapErpTableToEntity", () => {
  it("converts columns to attributes, excluding FK columns", () => {
    const { entity } = mapErpTableToEntity(customerSchema);
    const attrNames = entity.attributes.map((a) => a.name);
    expect(attrNames).toContain("name");
    expect(attrNames).toContain("credit_limit");
    expect(attrNames).not.toContain("company_id"); // FK -> Relationship, not an attribute
  });

  it("infers money fields from TEXT columns via name heuristic", () => {
    const { entity } = mapErpTableToEntity(customerSchema);
    const creditLimit = entity.attributes.find((a) => a.name === "credit_limit");
    expect(creditLimit?.type).toBe("decimal");
  });

  it("defaults plain TEXT columns to string", () => {
    const { entity } = mapErpTableToEntity(customerSchema);
    const name = entity.attributes.find((a) => a.name === "name");
    expect(name?.type).toBe("string");
  });

  it("detects timestamps from a created_at column", () => {
    const { entity } = mapErpTableToEntity(customerSchema);
    expect(entity.timestamps).toBe(true);
  });

  it("builds a manyToOne relationship from each foreign key", () => {
    const { relationships } = mapErpTableToEntity(customerSchema);
    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      sourceEntity: "Customer",
      targetEntity: "Company",
      cardinality: "manyToOne",
      foreignKey: "company_id",
    });
  });

  it("marks NOT NULL, no-default columns as required", () => {
    const { entity } = mapErpTableToEntity(customerSchema);
    const name = entity.attributes.find((a) => a.name === "name");
    expect(name?.required).toBe(true);
    const creditLimit = entity.attributes.find((a) => a.name === "credit_limit");
    expect(creditLimit?.required).toBe(false);
  });
});

describe("mapErpSchemasToEntities", () => {
  it("drops relationships whose target entity was not synced", () => {
    const { entities, relationships } = mapErpSchemasToEntities([customerSchema]); // company not included
    expect(entities).toHaveLength(1);
    expect(relationships).toHaveLength(0);
  });

  it("keeps relationships whose target entity is present", () => {
    const { entities, relationships } = mapErpSchemasToEntities([customerSchema, companySchema]);
    expect(entities).toHaveLength(2);
    expect(relationships).toHaveLength(1);
  });
});

describe("entitiesToMermaid", () => {
  it("emits a valid erDiagram block with PK annotation", () => {
    const { entities, relationships } = mapErpSchemasToEntities([customerSchema, companySchema]);
    const mermaid = entitiesToMermaid(entities, relationships);
    expect(mermaid).toContain("erDiagram");
    expect(mermaid).toContain("Customer }o--|| Company");
    expect(mermaid).toContain("string id PK");
  });
});
