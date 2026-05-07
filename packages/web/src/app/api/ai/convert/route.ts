import { NextRequest, NextResponse } from "next/server";
import { convertToMermaid } from "@erdwithai/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 },
      );
    }

    // Convert natural language to Mermaid syntax
    const mermaidSyntax = await convertToMermaid(description);

    if (!mermaidSyntax) {
      return NextResponse.json(
        { success: false, error: "Failed to generate Mermaid syntax" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      mermaidSyntax,
    });
  } catch (error) {
    console.error("AI conversion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
