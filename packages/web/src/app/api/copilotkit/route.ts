import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  AnthropicAdapter,
} from "@copilotkit/runtime";
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Simple runtime without complex agent configuration
const runtime = new CopilotRuntime();

// Export POST handler for CopilotKit
export async function POST(req: NextRequest) {
  // Use Anthropic adapter with Claude Sonnet 4
  const serviceAdapter = new AnthropicAdapter({
    anthropic: new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CopilotKit requires Anthropic client type cast
    }) as any,
    model: "claude-3-5-sonnet-20241022",
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
}
