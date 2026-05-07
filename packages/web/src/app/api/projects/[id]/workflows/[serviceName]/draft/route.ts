import { NextRequest, NextResponse } from "next/server";
import { hookWorkflowDb } from "@erdwithai/core/services";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; serviceName: string } }
) {
  try {
    const projectId = params.id;
    const serviceName = params.serviceName;

    const body = await request.json();
    const { hooks, flowchartCode } = body;

    // Save draft without validation
    const workflow = await hookWorkflowDb.saveDraft({
      projectId,
      serviceName,
      hooks,
      flowchartCode,
    });

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Error saving draft:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save draft",
      },
      { status: 500 }
    );
  }
}
