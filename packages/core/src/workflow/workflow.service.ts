/**
 * Workflow Service
 * Handles workflow triggering and status tracking
 */

import type {
  IWorkflowService,
  TriggerWorkflowPayload,
  WorkflowRunResult,
  WorkflowOptions,
  WorkflowStatus,
} from "./workflow.types.js";
import type { Knex } from "knex";

/**
 * Workflow service implementation
 * This service is responsible for:
 * - Triggering workflows on entity changes
 * - Tracking workflow status
 * - Managing workflow runs
 */
export class WorkflowService implements IWorkflowService {
  private db: Knex;
  private options: WorkflowOptions;

  constructor(db: Knex, options: WorkflowOptions) {
    this.db = db;
    this.options = {
      enabled: true,
      timeout: 300, // 5 minutes default
      ...options,
    };
  }

  /**
   * Trigger a workflow for an entity lifecycle event
   */
  async trigger(payload: TriggerWorkflowPayload): Promise<string> {
    if (!this.options.enabled) {
      // Workflow engine disabled, skip
      return "disabled";
    }

    // Create workflow run record
    const [workflowRun] = await this.db("sys_workflow_runs")
      .insert({
        entity_name: payload.entityName,
        entity_id: payload.entityId,
        operation: payload.operation,
        status: "draft",
        input_payload: JSON.stringify(payload),
        created_by: payload.userId,
        created_at: new Date(),
      })
      .returning("*");

    // Set entity workflow status to draft
    await this.setEntityStatus(
      payload.entityName,
      payload.entityId,
      "draft",
      workflowRun.id
    );

    // TODO: Fire Trigger.dev webhook/task
    // For now, we'll simulate it
    // In production, this would call:
    // await triggerClient.emitEvent('entity-lifecycle-workflow', payload);

    return workflowRun.id;
  }

  /**
   * Get workflow status
   */
  async getStatus(runId: string): Promise<WorkflowRunResult> {
    const run = await this.db("sys_workflow_runs")
      .where("id", runId)
      .first();

    if (!run) {
      throw new Error(`WORKFLOW_RUN_NOT_FOUND: ${runId}`);
    }

    return {
      id: run.id,
      status: run.status as WorkflowStatus,
      completedAt: run.completed_at ? new Date(run.completed_at) : undefined,
      error: run.error_details,
      durationMs: run.duration_ms,
      inputPayload: run.input_payload ? JSON.parse(run.input_payload) : undefined,
      outputPayload: run.output_payload ? JSON.parse(run.output_payload) : undefined,
      mutationsApplied: run.mutations_applied
        ? JSON.parse(run.mutations_applied)
        : undefined,
    };
  }

  /**
   * Retry a failed workflow
   */
  async retry(workflowRunId: string): Promise<string> {
    const workflowRun = await this.db("sys_workflow_runs")
      .where("id", workflowRunId)
      .first();

    if (!workflowRun) {
      throw new Error(`WORKFLOW_RUN_NOT_FOUND: ${workflowRunId}`);
    }

    // Trigger new workflow run with same payload
    const payload: TriggerWorkflowPayload = JSON.parse(workflowRun.input_payload);
    return await this.trigger(payload);
  }

  /**
   * Set workflow status on entity
   */
  async setEntityStatus(
    entityName: string,
    entityId: string,
    status: WorkflowStatus,
    workflowRunId?: string
  ): Promise<void> {
    await this.db(entityName.toLowerCase())
      .where("id", entityId)
      .update({
        workflow_status: status,
        ...(workflowRunId && { workflow_run_id: workflowRunId }),
      });
  }

  /**
   * Complete workflow (called by Trigger.dev worker)
   */
  async completeWorkflow(params: {
    runId: string;
    status: "success" | "error";
    outputPayload?: unknown;
    mutationsApplied?: unknown;
    errorDetails?: string;
    durationMs?: number;
  }): Promise<void> {
    const { runId, status, outputPayload, mutationsApplied, errorDetails, durationMs } =
      params;

    // Get workflow run
    const workflowRun = await this.db("sys_workflow_runs")
      .where("id", runId)
      .first();

    if (!workflowRun) {
      throw new Error(`WORKFLOW_RUN_NOT_FOUND: ${runId}`);
    }

    // Update workflow run record
    await this.db("sys_workflow_runs")
      .where("id", runId)
      .update({
        status,
        output_payload: outputPayload ? JSON.stringify(outputPayload) : null,
        mutations_applied: mutationsApplied
          ? JSON.stringify(mutationsApplied)
          : null,
        error_details: errorDetails,
        duration_ms: durationMs,
        completed_at: new Date(),
      });

    // Update entity workflow status
    await this.setEntityStatus(
      workflowRun.entity_name,
      workflowRun.entity_id,
      status
    );
  }

  /**
   * Get pending workflows
   */
  async getPendingWorkflows(limit: number = 100): Promise<Record<string, unknown>[]> {
    return await this.db("sys_workflow_runs")
      .where("status", "draft")
      .orderBy("created_at", "asc")
      .limit(limit);
  }

  /**
   * Get workflows by entity
   */
  async getEntityWorkflows(
    entityName: string,
    entityId: string,
    limit: number = 10
  ): Promise<Record<string, unknown>[]> {
    return await this.db("sys_workflow_runs")
      .where({
        entity_name: entityName,
        entity_id: entityId,
      })
      .orderBy("created_at", "desc")
      .limit(limit);
  }

  /**
   * Timeout stuck workflows (background job)
   */
  async timeoutStuckWorkflows(timeoutSeconds: number = 300): Promise<number> {
    const timeoutDate = new Date(Date.now() - timeoutSeconds * 1000);

    const stuckWorkflows = await this.db("sys_workflow_runs")
      .where("status", "draft")
      .where("created_at", "<", timeoutDate);

    let count = 0;

    for (const workflow of stuckWorkflows) {
      await this.completeWorkflow({
        runId: workflow.id,
        status: "error",
        errorDetails: `Workflow timeout after ${timeoutSeconds} seconds`,
      });
      count++;
    }

    return count;
  }
}

/**
 * Create workflow service
 */
export function createWorkflowService(
  db: Knex,
  options: WorkflowOptions
): WorkflowService {
  return new WorkflowService(db, options);
}
