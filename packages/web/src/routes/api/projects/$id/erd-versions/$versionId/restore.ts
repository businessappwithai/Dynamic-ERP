/**
 * Restore ERD version API route
 * Sets a specific version as the current version
 */

import { erdVersionDb } from "@erdwithai/core/services";

export async function POST(request: Request, params: Record<string, unknown>) {
  try {
    const versionId = params.versionId;

    const version = await erdVersionDb.setCurrentVersion(versionId);

    if (!version) {
      return new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ version }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error restoring ERD version:", error);
    return new Response(JSON.stringify({ error: "Failed to restore ERD version" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function DELETE(request: Request, params: Record<string, unknown>) {
  try {
    const versionId = params.versionId;

    await erdVersionDb.delete(versionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting ERD version:", error);
    return new Response(JSON.stringify({ error: "Failed to delete ERD version" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
