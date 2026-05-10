import { convertToMermaid } from "@erdwithai/ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Description is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const mermaidSyntax = await convertToMermaid(description);

    if (!mermaidSyntax) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate Mermaid syntax",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        mermaidSyntax,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI conversion error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
