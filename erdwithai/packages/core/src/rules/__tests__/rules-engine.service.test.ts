/**
 * RulesEngineService integration tests — exercised against a real Postgres
 * instance (same DATABASE_URL contract as database.service.ts). Uses the
 * real zen-engine JDM shape (inputNode/decisionTableNode/outputNode + edges),
 * not the incompatible hand-rolled schema jdm.schema.ts used to (wrongly)
 * validate against.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RulesEngineService } from "../rules-engine.service";
import { runMigrations, closeDatabase } from "../../services/database.service";

const ageCheckJDM = {
  nodes: [
    { id: "input", type: "inputNode", name: "Input", position: { x: 0, y: 0 } },
    {
      id: "age_check",
      type: "decisionTableNode",
      name: "Age Validation",
      position: { x: 300, y: 0 },
      content: {
        hitPolicy: "first",
        inputs: [{ id: "i1", name: "Age", field: "age" }],
        outputs: [{ id: "o1", name: "Allowed", field: "allowed" }],
        rules: [
          { _id: "adult", i1: ">= 18", o1: "true" },
          { _id: "minor", i1: "< 18", o1: "false" },
        ],
      },
    },
    { id: "output", type: "outputNode", name: "Output", position: { x: 600, y: 0 } },
  ],
  edges: [
    { id: "e1", sourceId: "input", targetId: "age_check" },
    { id: "e2", sourceId: "age_check", targetId: "output" },
  ],
};

const invalidJDM = {
  nodes: [{ id: "bad", type: "invalid_type", name: "Bad", position: { x: 0, y: 0 } }],
  edges: [],
};

// The shape components/rules/JDMEditor.tsx's visual editor actually produces
// (see admin/rules/new.tsx) — not real GoRules JDM, but must still pass
// validateRule() or every rule saved from that UI would be rejected.
const visualEditorDialectJDM = {
  name: "Age check",
  nodes: [
    {
      id: "rule-1",
      type: "decisionTable",
      name: "Decision Table",
      content: {
        inputs: ["age"],
        outputs: ["allowed"],
        rules: [{ condition: "age >= 18", output: { allowed: true } }],
      },
    },
  ],
};

describe.skipIf(!process.env.DATABASE_URL)("RulesEngineService (live Postgres)", () => {
  const service = new RulesEngineService();
  let ruleId: string;

  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("validates real GoRules JDM as valid via the actual engine", async () => {
    const result = await service.validateRule(ageCheckJDM as any);
    expect(result.valid).toBe(true);
  });

  it("rejects a structurally invalid JDM", async () => {
    const result = await service.validateRule(invalidJDM as any);
    expect(result.valid).toBe(false);
  });

  it("also accepts the visual JDMEditor's simplified dialect (not real GoRules JDM)", async () => {
    const result = await service.validateRule(visualEditorDialectJDM as any);
    expect(result.valid).toBe(true);
  });

  it("creates a rule and evaluates it end to end", async () => {
    const created = await service.createRule(
      "Patient", "Age check", "CREATE", ageCheckJDM as any
    );
    ruleId = created.id;
    expect(created.version).toBe(1);
    expect(created.isActive).toBe(true);

    const evalResult = await service.evaluate(ageCheckJDM as any, {
      entity: { age: 25 },
      relations: {},
      metadata: { entityName: "Patient", entityId: "p1", operation: "CREATE", timestamp: new Date().toISOString() },
    });
    expect(evalResult.success).toBe(true);
    expect(evalResult.mutations?.entity?.allowed).toBe(true);
  });

  it("finds the active rule via getRule", async () => {
    const found = await service.getRule("Patient", "CREATE");
    expect(found).not.toBeNull();
    expect(found?.id).toBe(ruleId);
  });

  it("snapshots version history on update and can roll back", async () => {
    const updatedJDM = JSON.parse(JSON.stringify(ageCheckJDM));
    updatedJDM.nodes[1].content.hitPolicy = "collect";
    const updated = await service.updateRule(ruleId, updatedJDM as any);
    expect(updated.version).toBe(2);

    const history = await service.getRuleHistory(ruleId);
    expect(history.length).toBe(1);
    expect(history[0].version).toBe(1);

    const rolledBack = await service.rollbackRule(ruleId, 1);
    expect(rolledBack.version).toBe(3);
  });

  it("lists rules with pagination", async () => {
    const page = await service.getAllRules(1, 10, "Patient");
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.rules.some((r) => r.id === ruleId)).toBe(true);
  });
});
