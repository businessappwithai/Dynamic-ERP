import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@erdwithai/core/services";

export async function POST(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const db = getDatabase();

    // Get workflow run
    const workflow = await db("sys_workflow_runs")
      .where("id", params.workflowId)
      .first();

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Update retry count and reset status
    await db("sys_workflow_runs")
      .where("id", params.workflowId)
      .update({
        retry_count: workflow.retry_count + 1,
        status: "draft",
        error_message: null,
        updated_at: new Date(),
      });

    // Reset entity status to draft
    const tableName = `bus_${workflow.entity_name.toLowerCase()}`;
    await db(tableName)
      .where("id", workflow.entity_id)
      .update({
        workflow_status: "draft",
      });

    // In production, this would trigger the actual workflow job
    // For now, we'll simulate it by setting to success after a delay
    setTimeout(async () => {
      await db("sys_workflow_runs")
        .where("id", params.workflowId)
        .update({
          status: "success",
          updated_at: new Date(),
        });

      await db(tableName)
        .where("id", workflow.entity_id)
        .update({
          workflow_status: "success",
        });
    }, 2000);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error retrying workflow:", error);
    return NextResponse.json(
      { error: "Failed to retry workflow" },
      { status: 500 }
    );
  }
}
