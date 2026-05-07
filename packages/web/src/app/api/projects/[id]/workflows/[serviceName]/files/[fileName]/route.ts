import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";

const GENERATED_HOOKS_BASE_PATH = join(
  process.cwd(),
  "generated-projects"
);

/**
 * PUT /api/projects/[id]/workflows/[serviceName]/files/[fileName]
 *
 * Saves a generated hook file
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: {
    params: { id: string; serviceName: string; fileName: string };
  }
) {
  try {
    const projectId = params.id;
    const serviceName = params.serviceName;
    const fileName = params.fileName;
    const entityName = serviceName.replace("Service", "");

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Code is required",
        },
        { status: 400 }
      );
    }

    const hooksDir = join(
      GENERATED_HOOKS_BASE_PATH,
      projectId,
      "src",
      "modules",
      entityName.toLowerCase(),
      "hooks"
    );

    // Ensure directory exists
    await mkdir(hooksDir, { recursive: true });

    // Write file
    const filePath = join(hooksDir, fileName);
    await writeFile(filePath, code, "utf-8");

    return NextResponse.json({
      success: true,
      message: `File ${fileName} saved successfully`,
      fileName,
    });
  } catch (error) {
    console.error("Error saving hook file:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save file",
      },
      { status: 500 }
    );
  }
}
