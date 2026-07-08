/**
 * Full Stack Generator
 *
 * Orchestrates generation of complete full-stack applications using:
 * - tanstackjs-nestjs: NestJS + TanStack Start (Modern Web Stack)
 * - openui5-odatav4: OData + OpenUI5 (Enterprise SAP Stack)
 *
 * Generates both backend and frontend with Application Dictionary
 * infrastructure and runtime UI configuration support.
 */

import type { Entity, Relationship } from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as path from "path";
import {
  ErpClawTanstackFrontendGenerator,
  type ErpClawTanstackFrontendOptions,
} from "./erpclaw-tanstack/erpclaw-tanstack-frontend.generator";
import {
  ODataBackendGenerator,
  type ODataBackendOptions,
} from "./openui5-odatav4/odata-backend.generator";
import {
  OpenUI5FrontendGenerator,
  type OpenUI5FrontendOptions,
} from "./openui5-odatav4/openui5-frontend.generator";
import {
  NestJsBackendGenerator,
  type NestJsBackendOptions,
} from "./tanstack-start-nestjs/nestjs-backend.generator";
import {
  TanStackStartFrontendGenerator,
  type TanStackStartFrontendOptions,
} from "./tanstack-start-nestjs/tanstack-start-frontend.generator";

// "erpclaw-tanstack" is the one canonical name for this stack everywhere:
// this type union, the CLI --stack value, the template directory
// (templates/erpclaw-tanstack/frontend/), and the root package.json script
// (generate:erpclaw). Deliberately not repeating the tanstackjs-nestjs vs.
// tanstack-start-nestjs naming confusion called out elsewhere in this file.
export type StackOption =
  | "tanstackjs-nestjs"
  | "tanstack-start-nestjs"
  | "openui5-odatav4"
  | "erpclaw-tanstack";
export type AIAddonOption = "none" | "basic" | "advanced";

export interface FullStackGeneratorOptions {
  stackOption: StackOption;
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  outputDir: string;
  port: number;

  // AI Natural Language Add-on (optional)
  aiNlAddon?: AIAddonOption;
  aiNlProvider?: "anthropic" | "openai";
  aiNlModel?: string;

  // tanstackjs-nestjs specific
  tanstackStartNestjs?: {
    backend: Partial<NestJsBackendOptions>;
    frontend: Partial<TanStackStartFrontendOptions>;
  };

  // openui5-odatav4 specific
  openui5Odatav4?: {
    backend: Partial<ODataBackendOptions>;
    frontend: Partial<OpenUI5FrontendOptions>;
  };

  // erpclaw-tanstack specific — frontend only, no backend leg (see class docstring)
  erpclawTanstack?: {
    frontend: Partial<ErpClawTanstackFrontendOptions>;
  };
}

export class FullStackGenerator {
  private options: FullStackGeneratorOptions;

  constructor(options: FullStackGeneratorOptions) {
    this.options = options;
  }

  /**
   * Generate complete full-stack application
   */
  async generate(entities: Entity[], relationships: Relationship[]): Promise<void> {
    const outputDir = this.options.outputDir;

    // Create root directory
    await fs.mkdir(outputDir, { recursive: true });

    // Generate based on stack option
    if (this.options.stackOption === "erpclaw-tanstack") {
      // Frontend-only stack: no backend leg to compose, so this skips
      // straight to a single frontend generator writing directly into
      // outputDir (no nested backend/frontend split — there's nothing to
      // disambiguate against). See generateErpClawTanstack's docstring.
      await this.generateErpClawTanstack(entities, relationships, outputDir);
    } else if (this.options.stackOption === "tanstackjs-nestjs") {
      await this.generateTanStackStartNestjs(entities, relationships, outputDir);
    } else {
      await this.generateOpenui5Odatav4(entities, relationships, outputDir);
    }

    // Generate shared files
    await this.generateSharedFiles(outputDir);

    console.log(`\n✅ Full-stack application generated at: ${outputDir}`);
    console.log(`   Stack: ${this.getStackDescription()}`);
    console.log(`   Entities: ${entities.length}`);
    console.log(`   Relationships: ${relationships.length}`);
    if (this.options.aiNlAddon && this.options.aiNlAddon !== "none") {
      console.log(
        `   AI NL Add-on: ${this.options.aiNlAddon} (${this.options.aiNlProvider || "anthropic"})`
      );
    }

    // Run mandatory linting checks
    console.log("\n🔍 Running mandatory linting checks...");
    await this.runLintingChecks(outputDir);
  }

  /**
   * Generate tanstackjs-nestjs: TanStack Start + NestJS
   */
  private async generateTanStackStartNestjs(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    const backendDir = path.join(outputDir, "backend");
    const frontendDir = path.join(outputDir, "frontend");

    // AI NL Add-on config (passed to templates)
    const aiConfig = {
      aiNlAddon: this.options.aiNlAddon || "none",
      aiNlProvider: this.options.aiNlProvider || "anthropic",
      aiNlModel: this.options.aiNlModel || "claude-sonnet-4-20250514",
    };

    // Backend options
    const backendOptions: NestJsBackendOptions = {
      projectName: this.options.projectName,
      projectVersion: this.options.projectVersion,
      projectDescription: this.options.projectDescription,
      databaseType: "postgresql",
      port: this.options.port,
      enableSwagger: true,
      enableCors: true,
      ...aiConfig,
      ...this.options.tanstackStartNestjs?.backend,
    };

    console.log("📦 Generating NestJS backend...");
    const backendGenerator = new NestJsBackendGenerator(backendOptions);
    await backendGenerator.generate(entities, relationships, backendDir);

    if (this.options.stackOption === "tanstackjs-nestjs" || this.options.stackOption === "tanstack-start-nestjs") {
      // Frontend options for TanStack Start
      const frontendOptions: TanStackStartFrontendOptions = {
        projectName: this.options.projectName,
        projectVersion: this.options.projectVersion,
        projectDescription: this.options.projectDescription,
        apiBaseUrl: `http://localhost:${this.options.port}`,
        enableDarkMode: false,
        stackOption: this.options.stackOption as "tanstackjs-nestjs" | "tanstack-start-nestjs",
        ...aiConfig,
        ...this.options.tanstackStartNestjs?.frontend,
      };

      console.log("📦 Generating TanStack Start frontend...");
      const frontendGenerator = new TanStackStartFrontendGenerator(frontendOptions);
      await frontendGenerator.generate(entities, relationships, frontendDir);
    } else {
      console.log("📦 Skipping frontend generation (non-TanStack stack selected)");
    }
  }

  /**
   * Generate erpclaw-tanstack: TanStack Start frontend ONLY.
   *
   * No backend generator to compose, no database, no migrations — erpclaw
   * (via a live erpclaw-gateway) already IS the backend. Writes directly
   * into `outputDir` rather than an `outputDir/frontend` subdirectory: the
   * backend/frontend split the other two stacks use exists to disambiguate
   * two generated halves, which doesn't apply here since there's only one.
   */
  private async generateErpClawTanstack(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    const frontendOptions: ErpClawTanstackFrontendOptions = {
      projectName: this.options.projectName,
      projectVersion: this.options.projectVersion,
      projectDescription: this.options.projectDescription,
      gatewayUrl: "http://localhost:8000",
      ...this.options.erpclawTanstack?.frontend,
    };

    console.log("📦 Generating erpclaw-tanstack frontend (no backend, no database)...");
    const frontendGenerator = new ErpClawTanstackFrontendGenerator(frontendOptions);
    await frontendGenerator.generate(entities, relationships, outputDir);
  }

  /**
   * Generate openui5-odatav4: OData + OpenUI5
   */
  private async generateOpenui5Odatav4(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    const backendDir = path.join(outputDir, "backend");
    const frontendDir = path.join(outputDir, "frontend");

    // AI NL Add-on config (passed to templates)
    const aiConfig = {
      aiNlAddon: this.options.aiNlAddon || "none",
      aiNlProvider: this.options.aiNlProvider || "anthropic",
      aiNlModel: this.options.aiNlModel || "claude-sonnet-4-20250514",
    };

    // Backend options
    const backendOptions: ODataBackendOptions = {
      projectName: this.options.projectName,
      projectVersion: this.options.projectVersion,
      projectDescription: this.options.projectDescription,
      databaseType: "postgresql",
      port: this.options.port,
      odataPath: "/odata",
      ...aiConfig,
      ...this.options.openui5Odatav4?.backend,
    };

    // Frontend options
    const frontendOptions: OpenUI5FrontendOptions = {
      projectName: this.options.projectName,
      projectVersion: this.options.projectVersion,
      projectDescription: this.options.projectDescription,
      odataBaseUrl: `http://localhost:${this.options.port}`,
      ui5Theme: "sap_horizon",
      ...aiConfig,
      ...this.options.openui5Odatav4?.frontend,
    };

    console.log("📦 Generating OData V4 backend...");
    const backendGenerator = new ODataBackendGenerator(backendOptions);
    await backendGenerator.generate(entities, relationships, backendDir);

    console.log("📦 Generating OpenUI5 frontend...");
    const frontendGenerator = new OpenUI5FrontendGenerator(frontendOptions);
    await frontendGenerator.generate(entities, relationships, frontendDir);
  }

  /**
   * Generate shared configuration files
   */
  private async generateSharedFiles(outputDir: string): Promise<void> {
    // erpclaw-tanstack is a single-project stack (no backend/frontend split):
    // ErpClawTanstackFrontendGenerator already wrote outputDir/package.json
    // as the one real package.json for the app. Writing the
    // workspaces:["backend","frontend"] root package.json below would
    // clobber it with a config that assumes two subdirectories neither of
    // which exist for this stack.
    if (this.options.stackOption === "erpclaw-tanstack") {
      const readme = this.generateReadme();
      await fs.writeFile(path.join(outputDir, "README.md"), readme);
      await fs.writeFile(path.join(outputDir, ".gitignore"), this.generateGitignore());
      return;
    }

    // Root package.json for monorepo
    const rootPackageJson = {
      name: this.options.projectName,
      version: this.options.projectVersion,
      description: this.options.projectDescription,
      private: true,
      workspaces: ["backend", "frontend"],
      scripts: {
        dev: 'concurrently "npm run dev:backend" "npm run dev:frontend"',
        "dev:backend": "cd backend && npm run start:dev",
        "dev:frontend": "cd frontend && npm run dev",
        build: "npm run build:backend && npm run build:frontend",
        "build:backend": "cd backend && npm run build",
        "build:frontend": "cd frontend && npm run build",
        "db:migrate": "cd backend && npm run migrate",
        "db:seed": "cd backend && npm run seed",
        test: "npm run test:backend && npm run test:frontend",
        "test:backend": "cd backend && npm run test",
        "test:frontend": "cd frontend && npm run test",
        "test:e2e": "cd frontend && npm run test:e2e",
        "test:all": "npm run test && npm run test:e2e",
      },
      devDependencies: {
        concurrently: "^8.2.0",
      },
      overrides: {
        "@tanstack/router-generator": "1.97.1",
        "@tanstack/router-plugin": "1.97.1",
        "@tanstack/start-plugin": "1.97.19",
        "@tanstack/server-functions-plugin": "1.97.19",
        "@tanstack/react-cross-context": "1.97.18",
        "@tanstack/directive-functions-plugin": "1.97.19",
        "@tanstack/virtual-file-routes": "1.97.8",
      },
    };

    await fs.writeFile(
      path.join(outputDir, "package.json"),
      JSON.stringify(rootPackageJson, null, 2)
    );

    // README.md
    const readme = this.generateReadme();
    await fs.writeFile(path.join(outputDir, "README.md"), readme);

    // .gitignore
    await fs.writeFile(path.join(outputDir, ".gitignore"), this.generateGitignore());

    // Copy GitHub Actions workflows
    await this.copyGitHubWorkflows(outputDir);
  }

  private generateGitignore(): string {
    return `# Dependencies
node_modules/

# Build output
dist/
.next/
out/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Database
*.db
*.sqlite
`;
  }

  /**
   * Copy GitHub Actions workflow templates to the output directory
   */
  private async copyGitHubWorkflows(outputDir: string): Promise<void> {
    const workflowsDir = path.join(outputDir, ".github", "workflows");
    await fs.mkdir(workflowsDir, { recursive: true });

    if (this.options.stackOption === "tanstackjs-nestjs") {
      console.log("📋 Setting up GitHub Actions workflows...");

      // Find the templates directory by traversing up from the dist directory
      let templatesDir = path.resolve(__dirname, "../../../templates");

      // If __dirname doesn't point to the right place, try to find the root
      if (!(await this.directoryExists(templatesDir))) {
        // Try alternate paths
        const currentDir = process.cwd();
        const possiblePaths = [
          path.join(currentDir, "packages/generator/templates"),
          path.join(currentDir, "../packages/generator/templates"),
          path.join(currentDir, "../../packages/generator/templates"),
        ];

        for (const possiblePath of possiblePaths) {
          if (await this.directoryExists(possiblePath)) {
            templatesDir = possiblePath;
            break;
          }
        }
      }

      // Copy frontend workflows
      try {
        const frontendWorkflowsSource = path.join(
          templatesDir,
          "tanstack-start-nestjs/frontend/.github/workflows"
        );

        if (await this.directoryExists(frontendWorkflowsSource)) {
          const entries = await fs.readdir(frontendWorkflowsSource);
          for (const entry of entries) {
            if (entry.endsWith(".hbs")) {
              const source = path.join(frontendWorkflowsSource, entry);
              const destName = entry.replace(".hbs", "");
              const dest = path.join(workflowsDir, destName);
              const content = await fs.readFile(source, "utf-8");
              const rendered = this.renderWorkflowTemplate(content);
              await fs.writeFile(dest, rendered);
              console.log(`   ✓ Created frontend workflow: ${destName}`);
            }
          }
        }
      } catch (e) {
        // Workflows may not exist yet
      }

      // Copy backend workflows
      try {
        const backendWorkflowsSource = path.join(
          templatesDir,
          "tanstack-start-nestjs/backend/.github/workflows"
        );

        if (await this.directoryExists(backendWorkflowsSource)) {
          const entries = await fs.readdir(backendWorkflowsSource);
          for (const entry of entries) {
            if (entry.endsWith(".hbs")) {
              const source = path.join(backendWorkflowsSource, entry);
              const destName = `backend-${entry.replace(".hbs", "")}`;
              const dest = path.join(workflowsDir, destName);
              const content = await fs.readFile(source, "utf-8");
              const rendered = this.renderWorkflowTemplate(content);
              await fs.writeFile(dest, rendered);
              console.log(`   ✓ Created backend workflow: ${destName}`);
            }
          }
        }
      } catch (e) {
        // Workflows may not exist yet
      }
    }
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Render template variables in workflow files
   */
  private renderWorkflowTemplate(content: string): string {
    return content
      .replace(/\{\{project\.name\}\}/g, this.options.projectName)
      .replace(
        /\{\{project\.id\}\}/g,
        this.options.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      )
      .replace(/\{\{project\.version\}\}/g, this.options.projectVersion)
      .replace(/\{\{project\.description\}\}/g, this.options.projectDescription);
  }

  private generateErpClawTanstackReadme(): string {
    const gatewayUrl = this.options.erpclawTanstack?.frontend?.gatewayUrl ?? "http://localhost:8000";
    return `# ${this.options.projectName}

${this.options.projectDescription}

## Tech Stack

- **Frontend**: TanStack Start + TanStack Query
- **Data layer**: @erdwithai/erpclaw-client talking directly to a live erpclaw-gateway — **no generated backend, no generated database, no migrations**. erpclaw already IS the backend.

## Runtime mode

Entity schemas (\`GET /api/v1/schema/{entity}\`) and available actions (\`GET /api/v1/catalog\`) are fetched live, in the browser, at request time — not baked in at generation time. A newly-provisioned erpclaw entity is usable in this app within seconds of being queryable, with no rebuild. See \`src/routes/$entity/index.tsx\` and \`src/routes/$entity/$id.tsx\`.

## Getting Started

### Prerequisites

- **Bun.js 1.1.0+** (REQUIRED runtime)
- A reachable erpclaw-gateway instance (default: \`${gatewayUrl}\`)

### Installation

\`\`\`bash
bun install
cp .env.example .env.local
# Edit .env.local: VITE_ERP_GATEWAY_URL, VITE_ERP_GATEWAY_TOKEN (or paste a
# token into the app's Connect screen at runtime instead)

# Optional: regenerate a fully typed action SDK (src/generated/) from the
# gateway's live catalog. Without this, erp.<domain>.<action>(...) calls
# still compile (src/generated/ ships with a stub) but resolve to undefined.
ERP_GATEWAY_TOKEN=<jwt> bun run codegen:erp

bun run dev
\`\`\`

## Project Structure

\`\`\`
${this.options.projectName}/
├── src/
│   ├── lib/erp.ts          # ErpClawClient singleton + bound action SDK
│   ├── lib/catalog-actions.ts  # best-effort catalog action lookups (list/save/row actions)
│   ├── components/DynamicForm.tsx   # schema-driven form (client.schema(entity))
│   ├── components/DynamicTable.tsx  # schema-driven table + row actions
│   └── routes/$entity/         # generic list/detail routes for ANY erpclaw table
└── package.json
\`\`\`

## License

MIT
`;
  }

  /**
   * Generate README content
   */
  private generateReadme(): string {
    if (this.options.stackOption === "erpclaw-tanstack") {
      return this.generateErpClawTanstackReadme();
    }

    const stackInfo =
      this.options.stackOption === "tanstackjs-nestjs"
        ? "- **Backend**: NestJS + Fastify + Knex.js\n- **Frontend**: TanStack Start + Shadcn UI + TanStack Query/Table/Form"
        : "- **Backend**: OData V4 Server (jaystack)\n- **Frontend**: OpenUI5 Flexible Column Layout";

    return `# ${this.options.projectName}

${this.options.projectDescription}

## Tech Stack

${stackInfo}

## Features

- **Compiere-style Application Dictionary**: Runtime-configurable UI via sys_field metadata
- **sys_ Tables**: System/dictionary tables for configuration
- **bus_ Tables**: Business entity tables generated from ERD
- **Dynamic UI**: Form and table layouts driven by seq_no ordering
- **Admin Interface**: Drag-drop field reordering with immediate effect
- **ETag Concurrency**: Optimistic locking for safe concurrent edits

## Getting Started

### Prerequisites

- **Bun.js 1.1.0+** (REQUIRED runtime)
- PostgreSQL 14+ (or SQLite for development)

### Installation

\`\`\`bash
# Install dependencies
bun install

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# Run migrations
bun run db:migrate

# Seed initial data (sys_reference, sys_table, sys_column, sys_field)
bun run db:seed
\`\`\`

### Development

\`\`\`bash
# Start both backend and frontend
bun run dev

# Or start individually
bun run dev:backend   # Backend on http://localhost:3000
bun run dev:frontend  # Frontend on http://localhost:${this.options.stackOption === "tanstackjs-nestjs" ? "3001" : "8080"}
\`\`\`

### Production Build

\`\`\`bash
bun run build
\`\`\`

## Project Structure

\`\`\`
${this.options.projectName}/
├── backend/           # ${this.options.stackOption === "tanstackjs-nestjs" ? "NestJS API" : "OData V4 Server"}
│   ├── src/
│   │   ├── modules/
│   │   │   ├── sys/   # Application Dictionary modules
│   │   │   └── bus/   # Business entity modules
│   │   └── ...
│   ├── migrations/    # Database migrations
│   └── seeds/         # Seed data
├── frontend/          # ${this.options.stackOption === "tanstackjs-nestjs" ? "TanStack Start App" : "OpenUI5 App"}
│   ├── ${this.options.stackOption === "tanstackjs-nestjs" || this.options.stackOption === "tanstack-start-nestjs" ? "src/routes/" : "webapp/"}
│   └── ...
└── package.json       # Root workspace config
\`\`\`

## Runtime UI Configuration

The UI layout can be modified at runtime through the admin interface:

1. Navigate to /admin (tanstackjs-nestjs) or #/admin (openui5-odatav4)
2. Select an entity to configure
3. Drag and drop fields to reorder
4. Changes take effect immediately

Field ordering is controlled by:
- \`seq_no\`: Order in detail forms
- \`seq_no_grid\`: Order in list/table views

## License

MIT
`;
  }

  /**
   * Run mandatory linting checks after generation
   */
  private async runLintingChecks(outputDir: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execFileSync } = require("child_process") as typeof import("child_process");

    const runLint = (command: string, args: string[], cwd: string): boolean => {
      try {
        execFileSync(command, args, { cwd, stdio: "pipe", timeout: 60000 });
        return true;
      } catch (_error: unknown) {
        return false;
      }
    };

    if (this.options.stackOption === "erpclaw-tanstack") {
      // Single-project stack with no lint script generated by default (see
      // package.json.hbs) — nothing to run here, unlike the two-tier
      // backend/frontend stacks below.
      console.log("\n✨ Skipping linting checks (erpclaw-tanstack has no generated lint script).");
      return;
    }

    try {
      if (this.options.stackOption === "tanstackjs-nestjs") {
        // tanstackjs-nestjs: TanStack Start + NestJS
        console.log("\n  📋 Linting NestJS backend...");
        const backendLintPassed = runLint("npm", ["run", "lint"], path.join(outputDir, "backend"));
        if (backendLintPassed) {
          console.log("  ✅ Backend linting passed");
        } else {
          console.warn(
            '  ⚠️  Backend linting found issues (run "cd backend && npm run lint:fix" to auto-fix)'
          );
        }

        console.log("\n  📋 Linting TanStack Start frontend...");
        const frontendLintPassed = runLint(
          "npm",
          ["run", "lint"],
          path.join(outputDir, "frontend")
        );
        if (frontendLintPassed) {
          console.log("  ✅ Frontend linting passed");
        } else {
          console.warn(
            '  ⚠️  Frontend linting found issues (run "cd frontend && npm run lint:fix" to auto-fix)'
          );
        }
      } else {
        // openui5-odatav4: OData + OpenUI5
        console.log("\n  📋 Linting OData backend...");
        const backendLintPassed = runLint("npm", ["run", "lint"], path.join(outputDir, "backend"));
        if (backendLintPassed) {
          console.log("  ✅ Backend linting passed");
        } else {
          console.warn(
            '  ⚠️  Backend linting found issues (run "cd backend && npm run lint:fix" to auto-fix)'
          );
        }

        console.log("\n  📋 Linting OpenUI5 frontend with UI5 linter...");
        const ui5LintPassed = runLint("npx", ["ui5-lint"], path.join(outputDir, "frontend"));
        if (ui5LintPassed) {
          console.log("  ✅ Frontend UI5 linting passed");
        } else {
          console.warn("  ⚠️  UI5 linting found issues (check ui5lint.yaml for rules)");
        }
      }

      console.log("\n✨ Linting checks completed!");
      console.log(
        '   Tip: Run "npm run lint:fix" in backend/frontend directories to auto-fix issues'
      );
    } catch (error) {
      console.warn("  ⚠️  Linting could not be completed (dependencies not installed?)");
      console.log('   Tip: Run "bun install" first, then run linting manually');
    }
  }

  /**
   * Get human-readable stack description
   */
  private getStackDescription(): string {
    switch (this.options.stackOption) {
      case "tanstackjs-nestjs":
        return "tanstackjs-nestjs - Modern Web (TanStack Start + NestJS)";
      case "erpclaw-tanstack":
        return "erpclaw-tanstack - TanStack Start frontend over a live erpclaw-gateway (no generated backend)";
      default:
        return "openui5-odatav4 - Enterprise SAP (OData + OpenUI5)";
    }
  }
}

export default FullStackGenerator;
