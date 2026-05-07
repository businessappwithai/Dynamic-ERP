/**
 * Hook Translator Module
 *
 * Parses hook definitions from Mermaid flowcharts and generates TypeScript code
 * using the Visitor pattern for AST traversal and code generation.
 *
 * @module hook-translator
 */

// Parser
export { HookSyntaxParser, hookParser } from "./parser";

// Visitor
export {
  HookCodeGenerationVisitor,
  createVisitor,
  type VisitorOptions,
} from "./visitor";

// Types
export {
  type HookType,
  type Parameter,
  type ParsedHook,
  type GeneratedHook,
  type ParseResult,
  type ParseError,
  type HookDefinitionNode,
  type ParameterNode,
  type HookVisitor,
  type BaseHookVisitor,
} from "./types";

// Utility functions
export { parseHookDefinition, parseHooksFromFlowchart, generateFlowchartFromHooks, generateHookComment, validateHookDefinition, generateHookCodeFile, toHookDefinition, fromHookDefinition } from "./utils";
