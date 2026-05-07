"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ServiceWorkflowError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="."
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-bold text-xl tracking-tight">Service Configuration</h1>
          </div>
        </div>
      </header>

      {/* Error Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0-12a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            We encountered an error loading this service configuration. Please try again.
          </p>

          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
              <p className="text-xs font-mono text-red-500 break-words">{error?.message || "Unknown error"}</p>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg transition-all"
              style={{ backgroundColor: "#FF8400" }}
            >
              Try again
            </button>
            <Link
              href=".."
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold rounded-lg transition-all text-center"
            >
              Go back
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
