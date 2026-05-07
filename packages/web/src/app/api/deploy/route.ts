import { NextRequest } from "next/server";
import { Client } from "pg";
import { projectDb, processManagerService } from "@erdwithai/core/services";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (level: string, message: string) => {
        const data = `data: ${JSON.stringify({ log: message, level })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendComplete = (url: string) => {
        const data = `data: ${JSON.stringify({ complete: true, url })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const sendError = (error: string) => {
        const data = `data: ${JSON.stringify({ error })}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        const body = await request.json();
        const { projectId, envVars } = body;

        if (!projectId) {
          sendError("Missing required field: projectId");
          controller.close();
          return;
        }

        // Get project details to get the port
        const project = await projectDb.findById(projectId);
        if (!project) {
          sendError("Project not found");
          controller.close();
          return;
        }

        const projectPort = project.port || 4001;

        sendLog("info", "Initializing local deployment...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Validate environment variables
        sendLog("info", "Validating environment variables...");
        const requiredVars = envVars.filter(
          (v: { isSecret: boolean; value: string }) => v.isSecret && !v.value,
        );
        if (requiredVars.length > 0) {
          sendError("Missing required environment variables");
          controller.close();
          return;
        }

        // Handle database setup if DATABASE_URL is provided
        const databaseUrlVar = envVars.find((v: { key: string; value: string }) => v.key === "DATABASE_URL");
        const databaseNameVar = envVars.find((v: { key: string; value: string }) => v.key === "DATABASE_NAME");

        if (databaseUrlVar && databaseNameVar) {
          sendLog("info", "Setting up database...");
          const baseUrl = databaseUrlVar.value;
          const dbName = databaseNameVar.value;

          try {
            // Parse base URL to get connection details
            const url = new URL(baseUrl);
            const isPostgres = url.protocol === "postgres:" || url.protocol === "postgresql:";

            if (isPostgres) {
              sendLog("info", `Connecting to PostgreSQL at ${url.hostname}:${url.port}...`);

              // Connect to postgres database to create the target database
              const adminUrl = `${url.protocol}//${url.username || "postgres"}${url.password ? ":" + url.password : ""}@${url.hostname}:${url.port}/postgres`;

              const client = new Client({ connectionString: adminUrl });

              try {
                await client.connect();
                sendLog("success", "✓ Connected to PostgreSQL server");

                // Check if database exists
                const checkDbResult = await client.query(
                  `SELECT 1 FROM pg_database WHERE datname = $1`,
                  [dbName]
                );

                if (checkDbResult.rows.length === 0) {
                  sendLog("info", `Creating database '${dbName}'...`);
                  await client.query(`CREATE DATABASE ${dbName}`);
                  sendLog("success", `✓ Database '${dbName}' created`);
                } else {
                  sendLog("info", `✓ Database '${dbName}' already exists`);
                }

                // Update DATABASE_URL env var to include the database name
                const fullUrl = `${url.protocol}//${url.username || "postgres"}${url.password ? ":" + url.password : ""}@${url.hostname}:${url.port}/${dbName}`;
                databaseUrlVar.value = fullUrl;

                sendLog("success", `✓ Database ready`);
              } finally {
                await client.end();
              }
            } else {
              sendLog("warning", "⚠ Only PostgreSQL is supported for automatic database setup");
              sendLog("info", "Using provided DATABASE_URL as-is");
            }
          } catch (dbError: unknown) {
            sendLog("warning", `⚠ Could not auto-setup database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
            sendLog("info", "Continuing with provided DATABASE_URL...");
          }

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        sendLog("success", "✓ Environment variables validated");
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Determine project path based on stack type
        let projectPath = "backend"; // Default for OData/UI5 stack
        if (project.stackType === "nestjs-nextjs") {
          projectPath = "backend"; // Could also be frontend for Next.js
        }

        sendLog("info", `Starting server at path: ${projectPath}...`);

        // Use process manager to actually start the server
        const result = await processManagerService.startProject(
          projectId,
          projectPath,
          projectPort,
          "backend"
        );

        if (!result.success) {
          sendError(result.error || "Failed to start server");
          controller.close();
          return;
        }

        sendLog("success", "✓ Dependencies installed");
        sendLog("success", "✓ Server started");

        const deploymentUrl = result.url;
        sendLog("success", "Application deployed successfully!");
        sendLog("info", `Running locally at: ${deploymentUrl}`);
        sendLog("info", "Press Stop to shut down the server");
        sendComplete(deploymentUrl);
      } catch (error) {
        console.error("Deployment error:", error);
        sendError(
          error instanceof Error ? error.message : "Unknown error occurred",
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
