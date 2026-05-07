/**
 * Projects API route
 * Handles CRUD operations for projects
 */

import { NextRequest, NextResponse } from "next/server";
import {
  projectDb,
} from "@erdwithai/core/services";

/**
 * GET /api/projects
 * Get all projects with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let projects;

    if (search) {
      projects = await projectDb.search(search);
    } else {
      projects = await projectDb.findAll(
        status ? { status } : undefined
      );
    }

    return NextResponse.json({ projects });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("Error fetching projects:", errorMessage, errorStack);
    return NextResponse.json(
      { error: "Failed to fetch projects", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon, iconColor, stackType, port, databaseUrl, environmentVariables } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const project = await projectDb.create({
      id: projectId,
      name,
      description,
      icon,
      icon_color: iconColor,
      stack_type: stackType,
      port,
      database_url: databaseUrl,
      environment_variables: environmentVariables,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
