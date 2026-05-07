import { NextResponse } from "next/server";
import { hookWorkflowDb } from "@erdwithai/core/services";

export async function GET(
  _request: Request,
  { params }: { params: { id: string; serviceName: string } }
) {
  try {
    const projectId = params.id;
    const serviceName = params.serviceName;

    const workflow = await hookWorkflowDb.getByService(projectId, serviceName);

    if (!workflow) {
      return NextResponse.json({
        success: true,
        workflow: null,
      });
    }

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch workflow",
      },
      { status: 500 }
    );
  }
}
