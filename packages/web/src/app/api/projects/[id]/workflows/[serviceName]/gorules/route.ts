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
    const { workflowId, hookType, rules } = body;

    // Validate request body
    if (!workflowId || !hookType || !rules) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: workflowId, hookType, and rules are required",
        },
        { status: 400 }
      );
    }

    // Validate GoRules structure
    if (!rules.name || !Array.isArray(rules.nodes) || !Array.isArray(rules.edges)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid GoRules structure. Must have name, nodes array, and edges array.",
        },
        { status: 400 }
      );
    }

    // Save GoRules configuration to database
    const result = await hookWorkflowDb.saveGoRules({
      projectId,
      serviceName,
      workflowId,
      hookType,
      rules: JSON.stringify(rules),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error saving GoRules:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save GoRules configuration",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved GoRules
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; serviceName: string } }
) {
  try {
    const projectId = params.id;
    const serviceName = params.serviceName;

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get("workflowId");
    const hookType = searchParams.get("hookType");

    if (!workflowId || !hookType) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required query parameters: workflowId and hookType",
        },
        { status: 400 }
      );
    }

    // Retrieve GoRules configuration from database
    const result = await hookWorkflowDb.getGoRules({
      projectId,
      serviceName,
      workflowId,
      hookType,
    });

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: "GoRules configuration not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rules: result.rules ? JSON.parse(result.rules) : null,
    });
  } catch (error) {
    console.error("Error retrieving GoRules:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve GoRules configuration",
      },
      { status: 500 }
    );
  }
}
