/**
 * ERD Versions API route
 * Handles history/versions for ERD diagrams
 */

import { NextRequest, NextResponse } from "next/server";
import { erdVersionDb } from "@erdwithai/core/services";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/erd-versions
 * Get all ERD versions for a project
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const versions = await erdVersionDb.getVersions(id);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Error fetching ERD versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch ERD versions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/erd-versions
 * Create a new ERD version
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await _request.json();
    const { mermaidCode, description, createdBy, validationErrors } = body;

    if (!mermaidCode) {
      return NextResponse.json(
        { error: "Mermaid code is required" },
        { status: 400 }
      );
    }

    const version = await erdVersionDb.createVersion({
      project_id: id,
      mermaid_code: mermaidCode,
      description,
      created_by: createdBy,
      validation_errors: validationErrors,
      is_current: true,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error("Error creating ERD version:", error);
    return NextResponse.json(
      { error: "Failed to create ERD version" },
      { status: 500 }
    );
  }
}
