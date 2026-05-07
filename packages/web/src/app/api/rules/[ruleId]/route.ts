import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@erdwithai/core/services";
import { requireAuth } from "@/middleware/auth";

/**
 * GET /api/rules/[ruleId] - Get single rule
 * Requires authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check authentication
    await requireAuth(request);

    const db = getDatabase();
    const rule = await db("sys_rule")
      .where("id", params.ruleId)
      .first();

    if (!rule) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Parse JDM content
    rule.jdmContent = JSON.parse(rule.decision_model || "{}");

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error fetching rule:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to fetch rule" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rules/[ruleId] - Update rule
 * Requires authentication
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check authentication
    await requireAuth(request);

    const body = await request.json();
    const { jdmContent } = body;

    if (!jdmContent) {
      return NextResponse.json(
        { error: "Missing JDM content" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Get current rule
    const current = await db("sys_rule")
      .where("id", params.ruleId)
      .first();

    if (!current) {
      return NextResponse.json(
        { error: "Rule not found" },
        { status: 404 }
      );
    }

    // Validate JDM content
    const errors: string[] = [];
    if (!jdmContent.name) {
      errors.push("Rule name is required");
    }
    if (!jdmContent.nodes || jdmContent.nodes.length === 0) {
      errors.push("At least one node is required");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Invalid JDM content", errors },
        { status: 400 }
      );
    }

    // Update rule (increment version)
    const [rule] = await db("sys_rule")
      .where("id", params.ruleId)
      .update({
        decision_model: JSON.stringify(jdmContent),
        version: current.version + 1,
        updated_at: new Date(),
        updated_by: "current-user", // TODO: Get from session
      })
      .returning("*");

    rule.jdmContent = JSON.parse(rule.decision_model || "{}");

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Error updating rule:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rules/[ruleId] - Delete rule
 * Requires authentication
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    // Check authentication
    await requireAuth(request);

    const db = getDatabase();

    await db("sys_rule")
      .where("id", params.ruleId)
      .delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting rule:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to delete rule" },
      { status: 500 }
    );
  }
}
