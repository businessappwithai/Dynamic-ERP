/**
 * Workflows API route
 * Handles workflow operations for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { workflowDb } from "@erdwithai/core/services";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/workflows
 * Get all workflows for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const workflows = await workflowDb.getWorkflows(id);

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/workflows
 * Create a new workflow
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await _request.json();
    const { name, serviceName, mermaidCode, description, extensionPoints } = body;

    if (!name || !serviceName || !mermaidCode) {
      return NextResponse.json(
        { error: "Name, serviceName, and mermaidCode are required" },
        { status: 400 }
      );
    }

    const workflow = await workflowDb.create({
      project_id: id,
      name,
      service_name: serviceName,
      mermaid_code: mermaidCode,
      description,
      extension_points: extensionPoints,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
