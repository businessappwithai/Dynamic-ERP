#!/usr/bin/env node

/**
 * erpclaw-codegen CLI
 *
 * Fetches a live erpclaw-gateway's catalog (GET /api/v1/catalog) and emits
 * one generated/<domain>.ts file per domain plus a generated/index.ts
 * barrel exporting `buildSdk(client)`.
 *
 * Requires a reachable gateway; not runnable in this package's own test
 * suite (no Postgres/gateway available there). See the package README.
 */
import { Command } from "commander";

import { generate } from "../codegen";

const program = new Command();

program
  .name("erpclaw-codegen")
  .description("Generate a typed action SDK from a live erpclaw-gateway's catalog")
  .option("--base-url <url>", "Gateway base URL, e.g. http://localhost:8000")
  .option("--token <jwt>", "Bearer token to authenticate with the gateway")
  .option("--token-env <VAR_NAME>", "Name of an environment variable holding the bearer token")
  .option("--out-dir <dir>", "Output directory for generated files", "src/generated")
  .action(async (opts: { baseUrl?: string; token?: string; tokenEnv?: string; outDir: string }) => {
    if (!opts.baseUrl) {
      console.error("erpclaw-codegen: --base-url is required.");
      process.exitCode = 1;
      return;
    }

    let token = opts.token;
    if (!token && opts.tokenEnv) {
      token = process.env[opts.tokenEnv];
      if (!token) {
        console.error(`erpclaw-codegen: environment variable '${opts.tokenEnv}' is not set.`);
        process.exitCode = 1;
        return;
      }
    }
    if (!token) {
      console.error("erpclaw-codegen: either --token or --token-env is required.");
      process.exitCode = 1;
      return;
    }

    try {
      const result = await generate({ baseUrl: opts.baseUrl, token, outDir: opts.outDir });
      console.log(
        `erpclaw-codegen: wrote ${result.files.length} file(s) to ${result.outDir} ` +
          `(${result.catalog.action_count} actions across ${result.catalog.domains.length} domains).`,
      );
    } catch (err) {
      console.error("erpclaw-codegen: generation failed.", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
