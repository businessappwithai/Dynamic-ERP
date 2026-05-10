/**
 * Individual project API route
 * Handles GET, PATCH, DELETE for a specific project
 */

import { projectDb } from "@erdwithai/core/services";

export async function GET(request: Request, params: Record<string, unknown>) {
    try {
  const id = params.id;

  const project = await projectDb.findById(id);

  if (!project) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
  }

  return new Response(JSON.stringify({ project }), {
        headers: { "Content-Type": "application/json" },
  });
    } catch (error) {
  console.error("Error fetching project:", error);
  return new Response(JSON.stringify({ error: "Failed to fetch project" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
  });
    }
  
}

export async function PATCH(request: Request) {
    try {
    const id = params.id;
    const body = await request.json();

    const project = await projectDb.update(id, body);

    if (!project) {
  return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
  });
    }

    return new Response(JSON.stringify({ project }), {
  headers: { "Content-Type": "application/json" },
    });
    } catch (error) {
    console.error("Error updating project:", error);
    return new Response(JSON.stringify({ error: "Failed to update project" }), {
  status: 500,
  headers: { "Content-Type": "application/json" },
    });
    }
  
}

export async function DELETE(request: Request, params: Record<string, unknown>) {
    try {
    const id = params.id;

    await projectDb.softDelete(id);

    return new Response(JSON.stringify({ success: true }), {
  headers: { "Content-Type": "application/json" },
    });
    } catch (error) {
    console.error("Error deleting project:", error);
    return new Response(JSON.stringify({ error: "Failed to delete project" }), {
  status: 500,
  headers: { "Content-Type": "application/json" },
    });
    }
}