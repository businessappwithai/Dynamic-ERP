"use client";

import { CopilotKit } from "@copilotkit/react-core";
import type React from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <CopilotKit runtimeUrl="/api/copilotkit">{children}</CopilotKit>;
}
