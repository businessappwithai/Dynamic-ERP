/**
 * Deployment API route
 * Handles deployment operations for a project
 */

import { NextRequest, NextResponse } from "next/server";
import { deploymentApi } from "@/lib/api/deployment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/deployment
 * Get deployment status for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    return NextResponse.json(await deploymentApi.getDeployment(id));
  } catch (error) {
    console.error("Error fetching deployment:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployment" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/deployment
 * Start the project server with logging
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, port } = body;

    if (status === "running") {
      const result = await deploymentApi.start(id, port);
      return NextResponse.json(result);
    } else {
      // Just update status in database
      const result = await deploymentApi.upsert(id, body);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error updating deployment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update deployment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/deployment
 * Stop and remove deployment with logging
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deploymentApi.stop(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error stopping deployment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop deployment" },
      { status: 500 }
    );
  }
}
