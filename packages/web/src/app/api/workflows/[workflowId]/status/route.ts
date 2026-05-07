import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/middleware/auth";
import { pollWorkflowStatus } from "@erdwithai/core/workflows";

/**
 * GET /api/workflows/[workflowId]/status - Get workflow run status
 *
 * Polls Trigger.dev for the status of a workflow run.
 * Uses the workflow polling helper with exponential backoff.
 *
 * Query parameters:
 * - timeoutMs: Optional polling timeout (default: 2 minutes)
 * - intervalMs: Optional polling interval (default: 500ms)
 *
 * Requires authentication
 *
 * Created by: WEB-002 ticket
 * Week: 3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    // Check authentication
    await requireAuth(request);

    const { workflowId } = params;
    const searchParams = request.nextUrl.searchParams;

    // Parse optional query parameters
    const timeoutMsParam = searchParams.get("timeoutMs");
    const timeoutMs = timeoutMsParam ? parseInt(timeoutMsParam, 10) : undefined;

    const intervalMsParam = searchParams.get("intervalMs");
    const intervalMs = intervalMsParam ? parseInt(intervalMsParam, 10) : undefined;

    // Poll workflow status
    const result = await pollWorkflowStatus(workflowId, {
      timeoutMs,
      intervalMs,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          errorCode: result.errorCode,
          status: result.status,
          attempts: result.attempts,
          durationMs: result.durationMs,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      output: result.output,
      attempts: result.attempts,
      durationMs: result.durationMs,
    });
  } catch (error) {
    console.error("Error polling workflow status:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      {
        error: "Failed to poll workflow status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
