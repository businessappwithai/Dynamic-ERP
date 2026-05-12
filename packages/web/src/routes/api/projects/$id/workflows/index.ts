/**
 * Workflows API route
 * Handles workflow operations for a project
 */

import { workflowDb } from "@erdwithai/core/services";

export async function GET(request: Request, params: Record<string, unknown>) {
  try {
    const id = params.id;

    const workflows = await workflowDb.getWorkflows(id);

    return new Response(JSON.stringify({ workflows }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch workflows" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST(request: Request) {
  try {
    const id = params.id;
    const body = await request.json();
    const { name, serviceName, mermaidCode, description, extensionPoints } = body;

    if (!name || !serviceName || !mermaidCode) {
      return new Response(
        JSON.stringify({
          error: "Name, serviceName, and mermaidCode are required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
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

    return new Response(JSON.stringify({ workflow }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating workflow:", error);
    return new Response(JSON.stringify({ error: "Failed to create workflow" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
