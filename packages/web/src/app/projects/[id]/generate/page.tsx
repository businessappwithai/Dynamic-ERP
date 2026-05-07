"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  Loader2,
  Database,
  HelpCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import type { Project } from "@/types/project";

type StackType = Project["stackType"];
import { ProgressStepper } from "@/components/ProgressStepper";
import { WizardStepHeader } from "@/components/WizardStepHeader";
import { JourneyArc } from "@/components/JourneyArc";

interface StackOption {
  id: StackType;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  category: "fullstack" | "backend";
}

const stackOptions: StackOption[] = [
  {
    id: "nestjs-nextjs",
    title: "nextjs-nestjs: NestJS + Next.js",
    description: "Enterprise-grade backend with modern React frontend",
    icon: <Database className="w-8 h-8" />,
    features: [
      "NestJS REST API",
      "Knex.js with PostgreSQL",
      "Next.js Frontend",
      "Monorepo Architecture",
      "API on 4001, Frontend on 4002",
    ],
    category: "fullstack",
  },
];

interface LogEntry {
  timestamp: string;
  level: "info" | "success" | "error" | "warning";
  message: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { currentProject, loadProject, updateProject, setCurrentStep } =
    useProjectStore();

  const [localProject, setLocalProject] = useState<Project | null>(null);
  const [selectedStack, setSelectedStack] = useState<StackType | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<"sqlite" | "postgresql">("sqlite");
  const [selectedPort, setSelectedPort] = useState<number>(9001);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Determine if project is already generated
  const isGenerated = localProject?.generatedPath && localProject.deploymentStatus === 'completed';

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Check for available port in 9000-10000 range
  useEffect(() => {
    const checkPort = async () => {
      for (let port = 9001; port <= 9999; port++) {
        try {
          await fetch(`http://localhost:${port}`, { mode: 'no-cors' });
          // If we get here, port is likely in use, try next
        } catch {
          // Port is available (connection failed means port is free)
          setSelectedPort(port);
          return;
        }
      }
      // If all ports fail, use 9001 as fallback
      setSelectedPort(9001);
    };

    if (!isGenerated) {
      checkPort();
    }
  }, [isGenerated]);

  // Load project from API to get latest erdCode
  useEffect(() => {
    const initProject = async () => {
      if (projectId) {
        await loadProject(projectId);
      }
    };
    initProject();
  }, [projectId, loadProject]);

  // Update local project state when currentProject changes
  useEffect(() => {
    if (currentProject && currentProject.id === projectId) {
      setLocalProject(currentProject);
      setSelectedStack(currentProject.stackType);
      setCurrentStep("generate");
    }
  }, [currentProject, projectId, setCurrentStep]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ]);
  };

  const handleGenerate = async () => {
    if (!selectedStack || !localProject) return;

    setIsGenerating(true);
    setGenerationComplete(false);
    setError(null);
    setLogs([]);

    try {
      addLog("info", "Starting generation process...");
      addLog("info", `Selected stack: ${selectedStack}`);
      addLog("info", `Reading ERD definition...`);

      // Debug: log what we're sending
      console.log("Generate request:", {
        projectId,
        stackType: selectedStack,
        erdCode: localProject.erdCode ? `SET (${localProject.erdCode.length} chars)` : "MISSING",
      });

      // Check if we have the required data
      if (!localProject.erdCode || localProject.erdCode.trim().length === 0) {
        setError("No ERD code found. Please design your ERD first in the Design step.");
        addLog("error", "No ERD code available. Please go to Design step first.");
        setIsGenerating(false);
        return;
      }

      // Call generation API
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stackType: selectedStack,
          erdCode: localProject.erdCode,
          database: selectedDatabase,
          port: selectedPort,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.log) {
                  addLog(data.level || "info", data.log);
                }
                if (data.complete) {
                  setGenerationComplete(true);
                  updateProject(projectId, {
                    generatedPath: data.path,
                    deploymentStatus: "completed",
                  });
                }
                if (data.error) {
                  setError(data.error);
                  addLog("error", data.error);
                }
              } catch (e) {
                console.error("Failed to parse log:", e);
              }
            }
          }
        }
      }

      addLog("success", "Generation completed successfully!");
      addLog("info", `Output: ${localProject?.generatedPath || "./generated"}`);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMsg);
      addLog("error", errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!localProject) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <WizardStepHeader
            stepNumber={3}
            title="Generate Your Application"
            description={isGenerated
              ? "Your application has been generated. You can regenerate it with your current ERD to apply any changes."
              : "Based on your ERD, we'll generate production-ready code for your chosen tech stack."}
            estimatedTime="2-3 min"
          />

          <ProgressStepper
            currentStep="generate"
            onStepClick={(step) => {
              if (step === "init") {
                router.push(`/projects/${projectId}/init`);
              } else if (step === "design") {
                router.push(`/projects/${projectId}/design`);
              } else if (step === "enhance") {
                router.push(`/projects/${projectId}/enhance`);
              } else if (step === "deploy") {
                router.push(`/projects/${projectId}/deploy`);
              }
            }}
          />

          <JourneyArc currentStep="generate" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Stack Selection */}
          {!isGenerating && !generationComplete && (
            <>
              {/* Show different UI for generated vs new projects */}
              {isGenerated ? (
                <>
                  {/* Generated Project: Read-only Configuration */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-semibold rounded-full uppercase tracking-wide">
                        Already Generated
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Stack and configuration are locked. Regenerate to apply ERD changes.
                      </p>
                    </div>

                    {/* Configuration Summary Card */}
                    {selectedStack && (
                      <div className="p-6 bg-card rounded-2xl border border-border">
                        <div className="flex items-center gap-3 mb-4">
                          <Settings className="w-5 h-5 text-muted-foreground" />
                          <h3 className="font-bold text-foreground">Configuration Summary</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stack Type</p>
                            <p className="font-semibold text-foreground">{stackOptions.find(s => s.id === selectedStack)?.title}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Port</p>
                            <p className="font-semibold" style={{ color: "#FF8400" }}>{localProject?.port}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Database</p>
                            <p className="font-semibold text-foreground capitalize">{localProject?.databaseUrl ? "Custom" : "SQLite"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                      style={{ backgroundColor: "#FF8400" }}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Regenerate Application
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* New Project: Stack Selection */}
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Choose Your Technology Stack
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Your application will run on port <span className="font-bold text-primary" style={{ color: "#FF8400" }}>9001</span> by default (9000-9999 range)
                  </p>

                  {/* Full-Stack Options */}
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Full-Stack Applications
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      {stackOptions.filter(s => s.category === "fullstack").map((stack) => (
                        <button
                          key={stack.id}
                          onClick={() => setSelectedStack(stack.id)}
                          className={`relative p-5 bg-card border-2 rounded-2xl text-left transition-all hover:scale-[1.02] ${selectedStack === stack.id
                            ? "border-primary ring-4 ring-primary/20"
                            : "border-border hover:border-primary/50"
                          }`}
                          style={selectedStack === stack.id ? { borderColor: "#FF8400", boxShadow: "0 0 0 4px rgba(255, 132, 0, 0.2)" } : {}}
                        >
                          {selectedStack === stack.id && (
                            <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: "#FF8400" }}>
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                          )}

                          <div className="flex items-start gap-3 mb-4">
                            <div className="p-2.5 bg-primary/10 rounded-xl" style={{ color: "#FF8400" }}>
                              {stack.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-base font-bold text-foreground mb-1">
                                {stack.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {stack.description}
                              </p>
                            </div>
                          </div>

                          <ul className="space-y-1.5">
                            {stack.features.slice(0, 4).map((feature, idx) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 text-xs text-foreground"
                              >
                                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: "#FF8400" }} />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Database & Port Selection */}
                  {selectedStack && (
                    <div className="mb-8 p-6 bg-card rounded-2xl border border-border">
                      <div className="flex items-center gap-3 mb-6">
                        <HardDrive className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-bold text-foreground">Database & Port Configuration</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Database Selection */}
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Database Type</p>
                          <div className="space-y-2">
                            <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                              selectedDatabase === "sqlite"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`} style={selectedDatabase === "sqlite" ? { borderColor: "#FF8400", backgroundColor: "rgba(255, 132, 0, 0.05)" } : {}}>
                              <input
                                type="radio"
                                name="database"
                                value="sqlite"
                                checked={selectedDatabase === "sqlite"}
                                onChange={(e) => setSelectedDatabase(e.target.value as "sqlite")}
                                className="sr-only"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-sm">SQLite</p>
                                <p className="text-xs text-muted-foreground">File-based, development friendly</p>
                              </div>
                              {selectedDatabase === "sqlite" && (
                                <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#FF8400", backgroundColor: "#FF8400" }} />
                              )}
                            </label>

                            <label className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                              selectedDatabase === "postgresql"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`} style={selectedDatabase === "postgresql" ? { borderColor: "#FF8400", backgroundColor: "rgba(255, 132, 0, 0.05)" } : {}}>
                              <input
                                type="radio"
                                name="database"
                                value="postgresql"
                                checked={selectedDatabase === "postgresql"}
                                onChange={(e) => setSelectedDatabase(e.target.value as "postgresql")}
                                className="sr-only"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-sm">PostgreSQL</p>
                                <p className="text-xs text-muted-foreground">Production-ready, remote support</p>
                              </div>
                              {selectedDatabase === "postgresql" && (
                                <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: "#FF8400", backgroundColor: "#FF8400" }} />
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Port Selection */}
                        <div>
                          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold block">
                            API Port (9000-9999)
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="9000"
                              max="9999"
                              value={selectedPort}
                              onChange={(e) => setSelectedPort(Math.min(9999, Math.max(9000, parseInt(e.target.value))))}
                              className="flex-1 bg-background border border-border text-foreground rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                              style={{ borderColor: "#2E2E2E" }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">Current port: <span className="font-semibold text-foreground">{selectedPort}</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Configuration Summary */}
                  {selectedStack && (
                    <div className="mb-8 p-6 bg-card rounded-2xl border border-border">
                      <div className="flex items-center gap-3 mb-4">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-bold text-foreground">Configuration Summary</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stack Type</p>
                          <p className="font-semibold text-foreground">{stackOptions.find(s => s.id === selectedStack)?.title}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Port</p>
                          <p className="font-semibold" style={{ color: "#FF8400" }}>{selectedPort}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Database</p>
                          <p className="font-semibold text-foreground capitalize">{selectedDatabase === "postgresql" ? "PostgreSQL" : "SQLite"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center">
                    <button
                      onClick={handleGenerate}
                      disabled={!selectedStack}
                      className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#FF8400" }}
                    >
                      <Zap className="w-5 h-5" />
                      Generate Application
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Generation Logs */}
          {(isGenerating || generationComplete || error) && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                {isGenerating && (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#FF8400" }} />
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Generating Application...
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        This may take a few moments
                      </p>
                    </div>
                  </>
                )}
                {generationComplete && !error && (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Generation Complete!
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Your application has been generated successfully
                      </p>
                    </div>
                  </>
                )}
                {error && (
                  <>
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Generation Failed
                      </h2>
                      <p className="text-sm text-red-400">
                        {error}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Terminal-style logs */}
              <div className="bg-card rounded-2xl p-6 border border-border font-mono text-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="ml-4 text-muted-foreground">Generation Logs</span>
                  {isGenerating && (
                    <span className="ml-auto px-3 py-1 text-xs rounded-full font-sans" style={{ backgroundColor: "rgba(255, 132, 0, 0.2)", color: "#FF8400" }}>
                      IN PROGRESS
                    </span>
                  )}
                  {generationComplete && (
                    <span className="ml-auto px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-sans">
                      COMPLETED
                    </span>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 ${log.level === "error"
                          ? "text-red-400"
                          : log.level === "success"
                            ? "text-emerald-400"
                            : log.level === "warning"
                              ? "text-yellow-400"
                              : "text-muted-foreground"
                        }`}
                    >
                      <span className="text-muted-foreground select-none">
                        [{log.timestamp}]
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  {isGenerating && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Action buttons after generation */}
              {generationComplete && !error && (
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => router.push(`/projects/${projectId}/enhance`)}
                    className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
                    style={{ backgroundColor: "#FF8400" }}
                  >
                    <Zap className="w-5 h-5" />
                    Continue to Enhance
                  </button>
                  <button
                    onClick={() => router.push(`/projects/${projectId}/deploy`)}
                    className="flex-1 px-8 py-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-lg rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Skip to Deploy
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Help Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg shadow-primary/50 flex items-center justify-center transition-all active:scale-95 z-40" style={{ backgroundColor: "#FF8400" }}>
        <HelpCircle className="w-6 h-6" />
      </button>
    </div>
  );
}
