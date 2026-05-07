import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@erdwithai/core/services";
import { requireAuth } from "@/middleware/auth";

/**
 * GET /api/rules - List all rules
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const db = getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const entity = searchParams.get("entity");
    const operation = searchParams.get("operation");

    let query = db("sys_rule as r")
      .select(
        "r.id",
        "r.name",
        "r.entity",
        "r.trigger",
        "r.version",
        "r.active",
        "r.created_at",
        "r.updated_at"
      )
      .where("r.active", true);

    if (entity) {
      query = query.where("r.entity", entity);
    }

    if (operation) {
      query = query.where("r.trigger", operation);
    }

    const rules = await query.orderBy([
      { column: "entity", order: "asc" },
      { column: "trigger", order: "asc" }
    ]);

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching rules:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rules - Create new rule
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    await requireAuth(request);

    const body = await request.json();
    const { entityName, ruleName, operation, jdmContent } = body;

    if (!entityName || !ruleName || !operation || !jdmContent) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Use RulesEngineService to create rule (includes validation)
    // For now, use direct DB insert with basic validation
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

    const [rule] = await db("sys_rule")
      .insert({
        name: ruleName,
        entity: entityName,
        trigger: operation,
        execution_mode: "runtime",
        decision_model: JSON.stringify(jdmContent),
        generated_code: null,
        active: true,
        priority: 0,
        version: 1,
        created_by: "current-user", // TODO: Get from session
        updated_by: "current-user",
      })
      .returning("*");

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("Error creating rule:", error);

    // Check if it's an auth error (NextResponse)
    if (error instanceof NextResponse) {
      return error;
    }

    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 }
    );
  }
}
