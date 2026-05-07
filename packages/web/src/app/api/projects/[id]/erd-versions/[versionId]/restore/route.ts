/**
 * Restore ERD version API route
 * Sets a specific version as the current version
 */

import { NextRequest, NextResponse } from "next/server";
import { erdVersionDb } from "@erdwithai/core/services";

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

/**
 * POST /api/projects/[id]/erd-versions/[versionId]/restore
 * Restore a specific version as current
 */
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { versionId } = await context.params;

    const version = await erdVersionDb.setCurrentVersion(versionId);

    if (!version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Error restoring ERD version:", error);
    return NextResponse.json(
      { error: "Failed to restore ERD version" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/erd-versions/[versionId]
 * Delete a specific version
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { versionId } = await context.params;

    await erdVersionDb.delete(versionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ERD version:", error);
    return NextResponse.json(
      { error: "Failed to delete ERD version" },
      { status: 500 }
    );
  }
}
