/**
 * Rules DTOs - Zod Validation Schemas
 *
 * Data Transfer Objects for business rules using Zod for runtime validation.
 */

import { z } from 'zod';

export const CreateRuleSchema = z.object({
  entityName: z.string().min(1),
  ruleName: z.string().min(1),
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'ALL']),
  jdmContent: z.string().min(1),
});

export type CreateRuleDto = z.infer<typeof CreateRuleSchema>;

export const UpdateRuleSchema = z.object({
  jdmContent: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRuleDto = z.infer<typeof UpdateRuleSchema>;

export const ValidateJdmSchema = z.object({
  jdmContent: z.string().min(1),
});

export type ValidateJdmDto = z.infer<typeof ValidateJdmSchema>;

export const DryRunSchema = z.object({
  ruleId: z.string().min(1),
  testData: z.record(z.unknown()),
});

export type DryRunDto = z.infer<typeof DryRunSchema>;

export const EvaluateRulesSchema = z.object({
  entityName: z.string().min(1),
  operation: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE']),
  data: z.record(z.unknown()),
});

export type EvaluateRulesDto = z.infer<typeof EvaluateRulesSchema>;
