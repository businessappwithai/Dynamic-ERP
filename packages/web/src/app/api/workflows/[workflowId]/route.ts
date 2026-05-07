import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@erdwithai/core/services";

export async function GET(
  _request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const db = getDatabase();
    const workflow = await db("sys_workflow_runs")
      .where("id", params.workflowId)
      .first();

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(workflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}
