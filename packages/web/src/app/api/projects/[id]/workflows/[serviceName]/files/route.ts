import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readdir, readFile } from "fs/promises";

const GENERATED_HOOKS_BASE_PATH = join(
  process.cwd(),
  "generated-projects"
);

/**
 * GET /api/projects/[id]/workflows/[serviceName]/files
 *
 * Lists all generated hook files for a service
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; serviceName: string } }
) {
  try {
    const projectId = params.id;
    const serviceName = params.serviceName;
    const entityName = serviceName.replace("Service", "");

    const hooksDir = join(
      GENERATED_HOOKS_BASE_PATH,
      projectId,
      "src",
      "modules",
      entityName.toLowerCase(),
      "hooks"
    );

    // Check if directory exists
    let files: string[] = [];
    try {
      files = await readdir(hooksDir);
    } catch (error) {
      // Directory doesn't exist yet, return empty list
      return NextResponse.json({
        success: true,
        files: [],
      });
    }

    // Filter for .ts files and read their content
    const hookFiles = await Promise.all(
      files
        .filter((file) => file.endsWith(".ts"))
        .map(async (fileName) => {
          const filePath = join(hooksDir, fileName);
          const code = await readFile(filePath, "utf-8");

          // Extract hook type and name from filename
          // Format: beforeCreate.hookName.ts
          const parts = fileName.replace(".ts", "").split(".");
          const hookType = parts[0] as string;
          const hookName = parts[1];

          return {
            fileName,
            hookType,
            hookName,
            code,
          };
        })
    );

    return NextResponse.json({
      success: true,
      files: hookFiles,
    });
  } catch (error) {
    console.error("Error listing hook files:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list files",
      },
      { status: 500 }
    );
  }
}
