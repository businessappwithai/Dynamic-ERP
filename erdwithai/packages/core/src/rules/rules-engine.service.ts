/**
 * Rules Engine Service
 *
 * Main service for business rule evaluation using GoRules zen-engine.
 * Rule storage/versioning is delegated to `rulesDb` (services/database.service.ts,
 * the `rules` + `rule_versions` tables) rather than duplicated here — this
 * service owns evaluation/validation/dry-run only.
 */

import { rulesDb } from "../services/database.service.js";
import { validateJDM } from "./jdm.schema";
import { ruleCache } from "./rule-cache.service";
import type {
  IRulesEngineService,
  JDMContent,
  RuleDefinition,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleValidationResult,
} from "./rules.types";
import { zenEngine } from "./zen-engine.singleton";

type StoredRule = Awaited<ReturnType<typeof rulesDb.findById>>;

function toRuleDefinition(row: NonNullable<StoredRule>): RuleDefinition {
  return {
    id: row.id,
    entityName: row.entityName,
    ruleName: row.ruleName,
    operation: row.operation as RuleDefinition["operation"],
    jdmContent: row.jdmContent,
    version: row.version,
    isActive: row.isActive,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

/**
 * Rules Engine Service implementation
 */
export class RulesEngineService implements IRulesEngineService {
  /**
   * Evaluate a rule against evaluation context.
   *
   * Only executes real GoRules JDM (inputNode/decisionTableNode/outputNode +
   * edges) — see validateRule()'s doc comment. The simplified dialect
   * components/rules/JDMEditor.tsx's visual editor produces today passes
   * validateRule() but has no zen-engine equivalent, so this returns a
   * structured `{success: false, error}` for it rather than a real decision;
   * it does not throw.
   *
   * @param jdmContent - JDM content to evaluate
   * @param context - Evaluation context with entity data and metadata
   * @returns Evaluation result with success flag and mutations or error
   */
  async evaluate(
    jdmContent: JDMContent,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    try {
      // Validate JDM structure before evaluation
      const validation = await this.validateRule(jdmContent);
      if (!validation.valid) {
        return {
          success: false,
          error: "Invalid JDM: " + (validation.errors?.join(", ") || "unknown error"),
          validationErrors: validation.errors,
        };
      }

      // Prepare evaluation input from context
      // Zen-engine expects direct input object, not nested context structure
      const input = {
        ...context.entity,
        _metadata: context.metadata,
      };

      // Evaluate using zen-engine
      const result = await zenEngine.evaluate(jdmContent, input);

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || "Rule evaluation failed",
        };
      }

      // Extract decision output
      const decision = result.decision?.result;

      // Apply mutations if decision returned
      const mutations: {
        entity?: Record<string, unknown>;
        relations?: Record<string, Record<string, unknown>>;
      } = {};

      if (decision && typeof decision === "object") {
        // Apply decision mutations to entity
        mutations.entity = { ...context.entity, ...decision };
      }

      return {
        success: true,
        mutations,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate JDM content against either of the two dialects this codebase
   * actually produces:
   *   1. Real GoRules JDM (inputNode/decisionTableNode/outputNode + edges) —
   *      checked by compiling it in the real zen-engine, the only
   *      authoritative source for "will this decision graph actually
   *      evaluate". This is what admin/rules' JSON tab lets a user paste
   *      directly, and the only shape `evaluate()`/`dryRun()` can execute.
   *   2. The simplified {name, nodes: [{type: "decisionTable"|..., content}]}
   *      shape components/rules/JDMEditor.tsx's visual editor actually
   *      produces today. It has no zen-engine equivalent yet (no
   *      inputNode/outputNode/edges, condition/output cells shaped
   *      differently) — accepted here so saving a rule from that editor
   *      doesn't get rejected, but note `evaluate()` cannot run this shape
   *      until a translation layer exists between the two dialects.
   *
   * @param jdmContent - JDM content to validate
   * @returns Validation result with success flag and errors
   */
  async validateRule(jdmContent: JDMContent): Promise<RuleValidationResult> {
    const engineResult = await zenEngine.validate(jdmContent);
    if (engineResult.valid) {
      return { valid: true };
    }

    const schemaResult = validateJDM(jdmContent);
    if (schemaResult.success) {
      return { valid: true };
    }

    const schemaErrors = schemaResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
    return {
      valid: false,
      errors: [engineResult.error || "Not valid GoRules JDM", ...schemaErrors],
    };
  }

  /**
   * Get active rule for entity and operation
   *
   * Checks cache first, then database (highest-priority active rule).
   *
   * @param entityName - Entity name (e.g., "Patient")
   * @param operation - Operation type (CREATE, READ, UPDATE, DELETE)
   * @returns Rule definition or null if not found
   */
  async getRule(
    entityName: string,
    operation: "CREATE" | "READ" | "UPDATE" | "DELETE"
  ): Promise<RuleDefinition | null> {
    const cached = ruleCache.get(entityName, operation);
    if (cached) {
      return {
        id: cached.id,
        entityName,
        ruleName: cached.ruleName,
        operation,
        jdmContent: cached.jdm,
        version: cached.version,
        isActive: true,
        createdAt: new Date(cached.timestamp),
        updatedAt: new Date(cached.timestamp),
      };
    }

    const row = await rulesDb.findActive(entityName, operation);
    if (!row) return null;

    ruleCache.set(entityName, operation, row.id, row.ruleName, row.version, row.jdmContent);
    return toRuleDefinition(row);
  }

  /**
   * Create a new rule definition
   */
  async createRule(
    entityName: string,
    ruleName: string,
    operation: "CREATE" | "READ" | "UPDATE" | "DELETE" | "ALL",
    jdmContent: JDMContent,
    _userId?: string
  ): Promise<RuleDefinition> {
    const id = this.generateId();
    const row = await rulesDb.create({ id, entityName, ruleName, operation, jdmContent });
    if (!row) {
      throw new Error("Failed to create rule: no row returned");
    }

    ruleCache.set(entityName, operation, row.id, row.ruleName, row.version, jdmContent);
    return toRuleDefinition(row);
  }

  /**
   * Update an existing rule definition. Prior content is snapshotted into
   * rule_versions (see rulesDb.update) so getRuleHistory/rollback can recover it.
   */
  async updateRule(ruleId: string, jdmContent: JDMContent): Promise<RuleDefinition> {
    const row = await rulesDb.update(ruleId, { jdmContent });
    if (!row) {
      throw new Error("Rule not found: " + ruleId);
    }

    ruleCache.invalidate(row.entityName, row.operation);
    return toRuleDefinition(row);
  }

  /**
   * Get rule version history (most recent first)
   */
  async getRuleHistory(ruleId: string): Promise<RuleDefinition[]> {
    const versions = await rulesDb.getHistory(ruleId);
    return versions.map((v) => ({
      id: v.id,
      entityName: v.entityName,
      ruleName: v.ruleName,
      operation: v.operation as RuleDefinition["operation"],
      jdmContent: v.jdmContent,
      version: v.version,
      isActive: false, // historical snapshots are never the active version
      createdAt: new Date(v.createdAt),
      updatedAt: new Date(v.createdAt),
    }));
  }

  /**
   * Roll a rule back to a prior version's JDM content (snapshotting the
   * current content first, same as any other update).
   */
  async rollbackRule(ruleId: string, version: number): Promise<RuleDefinition> {
    const row = await rulesDb.rollback(ruleId, version);
    if (!row) {
      throw new Error(`Version ${version} not found for rule ${ruleId}`);
    }
    ruleCache.invalidate(row.entityName, row.operation);
    return toRuleDefinition(row);
  }

  /**
   * Get all rules with pagination
   */
  async getAllRules(
    page: number = 1,
    limit: number = 10,
    entityName?: string
  ): Promise<{
    rules: RuleDefinition[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const all = await rulesDb.findAll(entityName ? { entityName } : undefined);
    const total = all.length;
    const offset = (page - 1) * limit;
    const rules = all.slice(offset, offset + limit).map(toRuleDefinition);

    return {
      rules,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Dry run rule evaluation without persisting changes
   *
   * @param jdmContent - JDM content to evaluate
   * @param context - Evaluation context
   * @returns Evaluation result (same as evaluate, but explicitly non-persisting)
   */
  async dryRun(
    jdmContent: JDMContent,
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    // Dry run is identical to evaluate in runtime mode
    // The distinction matters more in code-generation mode
    return this.evaluate(jdmContent, context);
  }

  /**
   * Generate a unique ID for new rules
   */
  private generateId(): string {
    return "rule_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  }
}

export default RulesEngineService;
