/* eslint-disable @typescript-eslint/no-explicit-any -- template context objects are dynamically shaped */
/**
 * erpclaw-tanstack Frontend Generator
 *
 * Generates a TanStack Start frontend ONLY — no backend, no database, no
 * migrations. Unlike every other stack in this package (tanstack-start-nestjs,
 * openui5-odatav4), which each generate a full CRUD app with its own
 * database, this stack's entire data layer is @erdwithai/erpclaw-client
 * talking to a live erpclaw-gateway instance: erpclaw already IS the
 * backend (a real, Postgres-backed ERP engine with ~462 real actions), so
 * generating a second throwaway CRUD backend on top of it would be
 * pointless.
 *
 * "Runtime mode": the generated app fetches entity schemas
 * (`client.schema(entity)`) and discovers actions (`client.catalog()`) live,
 * in the browser, at request time — NOT at generation time. This generator
 * class therefore does no erpclaw introspection of its own; it only needs
 * entity NAMES (from the same Mermaid-parsed Entity[]/Relationship[] every
 * other frontend generator receives) to seed navigation. Two generic
 * catch-all routes (src/routes/$entity/index.tsx, src/routes/$entity/$id.tsx)
 * serve every entity — including ones erpclaw grows after this app was
 * generated — without a rebuild.
 *
 * Generated from templates in erpclaw-tanstack/frontend/.
 */
import type { Entity, Relationship } from "@erdwithai/core/types";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";
import { BaseGenerator } from "../base.generator";

/**
 * Resolve template directory path, handling both dev and bundled environments.
 * Duplicated per-generator-file rather than shared — this is the established
 * pattern in this package (see tanstack-start-nestjs/*.generator.ts's own
 * copies of the same function).
 */
function resolveTemplateDir(subpath: string): string {
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, "packages/generator/templates", subpath),
    path.join(cwd, "../../../packages/generator/templates", subpath),
    path.join(cwd, "../../packages/generator/templates", subpath),
    path.join(__dirname, "../../../templates", subpath),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      if (fsSync.statSync(possiblePath).isDirectory()) {
        return possiblePath;
      }
    } catch {
      // Continue to next path
    }
  }

  const fallbackPath = path.join(__dirname, "../../../templates", subpath);
  console.error(`Template directory not found. Tried paths:`);
  possiblePaths.forEach((p) => console.error(`  - ${p}`));
  console.error(`Using fallback: ${fallbackPath}`);
  return fallbackPath;
}

/**
 * Resolve the on-disk location of the @erdwithai/erpclaw-client package
 * itself, so the generated app's package.json can depend on it via a `file:`
 * reference computed relative to wherever the caller pointed `-o` (see
 * `erpclawClientDependencySpecifier` in prepareContext for why: erpclaw-client
 * isn't published to npm, and generated-projects/ — the documented output
 * convention, see packages/web/src/routes/api/generate.ts — isn't a bun/pnpm
 * workspace member, so `workspace:*` doesn't resolve there).
 */
function resolveErpclawClientDir(): string {
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, "packages/erpclaw-client"),
    path.join(cwd, "../../packages/erpclaw-client"),
    path.join(cwd, "../erpclaw-client"),
    path.join(__dirname, "../../../../erpclaw-client"),
  ];

  for (const possiblePath of possiblePaths) {
    try {
      if (fsSync.statSync(path.join(possiblePath, "package.json")).isFile()) {
        return possiblePath;
      }
    } catch {
      // Continue to next path
    }
  }

  return path.resolve(__dirname, "../../../../erpclaw-client");
}

export interface ErpClawTanstackFrontendOptions {
  projectName: string;
  projectVersion: string;
  projectDescription: string;
  /** erpclaw-gateway base URL, e.g. "http://localhost:8000". Never a generated backend URL — there is none. */
  gatewayUrl: string;
  /** Dev server port for this app (NOT the gateway's port). Default: 3002. */
  port?: number;
}

export class ErpClawTanstackFrontendGenerator extends BaseGenerator {
  private options: ErpClawTanstackFrontendOptions;
  private resolvedTemplateDir: string;

  constructor(options: ErpClawTanstackFrontendOptions) {
    const templateDir = resolveTemplateDir("erpclaw-tanstack/frontend");
    super(templateDir);
    this.options = options;
    this.resolvedTemplateDir = templateDir;
  }

  async generate(
    entities: Entity[],
    relationships: Relationship[],
    outputDir: string
  ): Promise<void> {
    await fs.mkdir(outputDir, { recursive: true });

    const context = this.prepareContext(entities, relationships, outputDir);

    console.log(`\n📦 Generating erpclaw-tanstack frontend (runtime mode, no generated backend)...`);
    await this.renderTree(this.resolvedTemplateDir, outputDir, context);

    console.log(`✅ erpclaw-tanstack frontend generation complete!`);
  }

  private prepareContext(
    entities: Entity[],
    _relationships: Relationship[],
    outputDir: string
  ): Record<string, unknown> {
    const port = this.options.port ?? 3002;

    const erpclawClientAbsDir = resolveErpclawClientDir();
    const relToClient = path.relative(outputDir, erpclawClientAbsDir).split(path.sep).join("/");
    const erpclawClientDependencySpecifier = `file:${relToClient.startsWith(".") ? relToClient : `./${relToClient}`}`;

    // Only entity NAMES are needed (for EntityNav's sidebar) — no per-entity
    // schema/attribute data flows into these templates. See module docstring.
    const entityList = entities.map((entity) => ({
      name: entity.name,
      tableName: entity.tableName,
    }));

    return {
      project: {
        name: this.options.projectName,
        version: this.options.projectVersion,
        description: this.options.projectDescription,
      },
      config: {
        port,
        gatewayUrl: this.options.gatewayUrl,
      },
      entities: entityList,
      erpclawClientDependencySpecifier,
      now: new Date().toISOString(),
    };
  }

  /**
   * Recursively walks the template directory: `.hbs` files are rendered
   * through Handlebars (with the `.hbs` suffix stripped) and written to the
   * matching output path; everything else is copied byte-for-byte. Several
   * components/routes in this template pack are plain (non-`.hbs`) files by
   * design — same reasoning as tanstack-start-nestjs's "these have complex
   * JSX that doesn't work well with Handlebars" static-copy components: they
   * carry zero per-generation variables (schema is fetched at runtime, not
   * baked in), so there's nothing to template and no reason to risk a
   * `{{`/JSX-brace collision (e.g. `params={{...}}`).
   */
  private async renderTree(
    srcDir: string,
    destDir: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);

      if (entry.isDirectory()) {
        await this.renderTree(srcPath, path.join(destDir, entry.name), context);
        continue;
      }

      if (entry.name.endsWith(".hbs")) {
        const destName = entry.name.slice(0, -".hbs".length);
        const relTemplatePath = path.relative(this.resolvedTemplateDir, srcPath);
        const rendered = await this.renderTemplate(relTemplatePath, context);
        await fs.writeFile(path.join(destDir, destName), rendered);
      } else {
        await fs.copyFile(srcPath, path.join(destDir, entry.name));
      }
    }
  }
}

export default ErpClawTanstackFrontendGenerator;
