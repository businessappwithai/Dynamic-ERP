/**
 * Rules Engine Module
 *
 * Business rules evaluation using GoRules zen-engine.
 *
 * Created by: CORE-002 ticket
 * Week: 1
 */

// Public API exports
export { zenEngine, default as ZenEngineSingleton } from "./zen-engine.singleton";
export type { EvaluationResult, EvaluationOptions } from "./zen-engine.singleton";

export {
  ruleCache,
  RuleCacheService,
} from "./rule-cache.service";
export type { CacheStats } from "./rule-cache.service";

export { RulesEngineService } from "./rules-engine.service";

export {
  JDMContentSchema,
  JDMNodeSchema,
  JDMDecisionTableNodeSchema,
  JDMExpressionNodeSchema,
  JDMFunctionNodeSchema,
  JDMRuleSchema,
  validateJDM,
  assertValidJDM,
} from "./jdm.schema";
export type {
  JDMContent,
  JDMNode,
  JDMDecisionTableNode,
  JDMExpressionNode,
  JDMFunctionNode,
} from "./jdm.schema";

export type {
  JDMContent as JDM,
  RuleEvaluationContext,
  RuleEvaluationResult,
  RuleDefinition,
  RuleValidationResult,
  IRulesEngineService,
} from "./rules.types";

// Default export
export { RulesEngineService as default } from "./rules-engine.service";
