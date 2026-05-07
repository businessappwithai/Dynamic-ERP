import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@erdwithai/core/services";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const entity = searchParams.get("entity");

    let query = db("sys_workflow_runs");

    if (status) {
      query = query.where("status", status);
    }

    if (entity) {
      query = query.where("entity_name", entity);
    }

    const workflows = await query
      .orderBy("created_at", "desc")
      .limit(100);

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}
