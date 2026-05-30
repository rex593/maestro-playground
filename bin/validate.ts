// bin/validate.ts
// Five CLI entry points wired into package.json:
//   pnpm catalog:build                                    (catalog.ts → catalog.json)
//   pnpm catalog:check                                    (TS vs committed JSON in sync?)
//   pnpm validate:catalog <catalog.json>
//   pnpm validate:pathway <pathway.json> <catalog.json>
//   pnpm drift:report     <catalog.json>                  (scans all *.pathway.json under cwd)
//
// Exit codes:
//   0 = OK / report generated
//   1 = schema parse failure, breaking drift, or catalog out of sync
//
// Used by the app's CLI tooling and by .github/workflows/validate-pathways.yml.

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CatalogDocumentSchema,
  PathwayDocumentSchema,
  detectCatalogDrift,
  type CatalogDocument,
  type PathwayDocument,
} from "../src/schema/pathway-schema";

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`✗ ${path} — cannot read or parse JSON: ${(err as Error).message}`);
    process.exit(1);
  }
}

function parseCatalog(path: string): CatalogDocument {
  const result = CatalogDocumentSchema.safeParse(readJson(path));
  if (!result.success) {
    console.error(`✗ ${path} — catalog schema validation failed:`);
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

function parsePathway(path: string): PathwayDocument {
  const result = PathwayDocumentSchema.safeParse(readJson(path));
  if (!result.success) {
    console.error(`✗ ${path} — pathway schema validation failed:`);
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

function findPathwayFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) findPathwayFiles(full, found);
    else if (entry.endsWith(".pathway.json")) found.push(full);
  }
  return found;
}

const [, , command, ...args] = process.argv;

// ------- catalog:build -----------------------------------------------
// Compiles catalog/catalog.ts → catalog/catalog.json. Validates against
// CatalogDocumentSchema before writing. Idempotent.
if (command === "build-catalog") {
  (async () => {
    const tsPath = resolve(process.cwd(), "catalog/catalog.ts");
    const jsonPath = resolve(process.cwd(), "catalog/catalog.json");
    const mod = await import(tsPath);
    const data = mod.catalog ?? mod.default;
    if (!data) {
      console.error(`✗ ${tsPath} must export { catalog } or default`);
      process.exit(1);
    }
    const parsed = CatalogDocumentSchema.safeParse(data);
    if (!parsed.success) {
      console.error(`✗ catalog/catalog.ts failed schema validation:`);
      console.error(parsed.error.format());
      process.exit(1);
    }
    writeFileSync(jsonPath, JSON.stringify(parsed.data, null, 2) + "\n");
    console.log(`✓ wrote catalog/catalog.json (v${parsed.data.catalogVersion}, ${parsed.data.blocks.length} blocks)`);
  })();
}

// ------- catalog:check -----------------------------------------------
// CI guard: ensures catalog/catalog.ts and catalog/catalog.json are in sync,
// so nobody can hand-edit the generated JSON without also editing the TS source.
else if (command === "check-catalog") {
  (async () => {
    const tsPath = resolve(process.cwd(), "catalog/catalog.ts");
    const jsonPath = resolve(process.cwd(), "catalog/catalog.json");
    const mod = await import(tsPath);
    const fromTs = CatalogDocumentSchema.parse(mod.catalog ?? mod.default);
    const fromJson = CatalogDocumentSchema.parse(readJson(jsonPath));

    // Normalize updatedAt before comparing (it's regenerated on each build)
    fromTs.updatedAt = "";
    fromJson.updatedAt = "";

    const a = JSON.stringify(fromTs);
    const b = JSON.stringify(fromJson);
    if (a !== b) {
      console.error(
        `✗ catalog/catalog.ts and catalog/catalog.json are out of sync. ` +
        `Run \`pnpm catalog:build\` and commit the result.`
      );
      process.exit(1);
    }
    console.log(`✓ catalog TS and JSON in sync (v${fromTs.catalogVersion})`);
  })();
}

else if (command === "catalog" && args[0]) {
  const cat = parseCatalog(resolve(args[0]));
  console.log(`✓ catalog OK (v${cat.catalogVersion}, ${cat.blocks.length} blocks)`);
  process.exit(0);
}

else if (command === "pathway" && args[0] && args[1]) {
  const doc = parsePathway(resolve(args[0]));
  const cat = parseCatalog(resolve(args[1]));
  const drift = detectCatalogDrift(doc, cat);
  console.log(`✓ ${args[0]} schema OK`);
  if (drift.missingBlockIds.length > 0) {
    console.error(`✗ BREAKING drift: missing blockIds → ${drift.missingBlockIds.join(", ")}`);
    process.exit(1);
  }
  if (drift.missingBranchIds.length > 0) {
    console.error(`✗ BREAKING drift: missing branchIds`);
    for (const m of drift.missingBranchIds) console.error(`  ${m.nodeId} → ${m.branchId}`);
    process.exit(1);
  }
  if (drift.paramSchemaChanges.length > 0) {
    console.warn(`⚠ soft drift: ${drift.paramSchemaChanges.length} node(s) have dropped params`);
  }
  process.exit(0);
}

else if (command === "drift" && args[0]) {
  const cat = parseCatalog(resolve(args[0]));
  const files = findPathwayFiles(process.cwd());
  if (files.length === 0) {
    console.log("No pathway files found.\n");
    process.exit(0);
  }
  let anyBreaking = false;
  console.log(`Scanned ${files.length} pathway file(s) against catalog v${cat.catalogVersion}.\n`);
  for (const file of files) {
    const doc = parsePathway(file);
    const drift = detectCatalogDrift(doc, cat);
    const breaking =
      drift.missingBlockIds.length > 0 || drift.missingBranchIds.length > 0;
    if (breaking) anyBreaking = true;
    const status = breaking ? "**BREAKING:**" : drift.paramSchemaChanges.length > 0 ? "⚠" : "✓";
    console.log(`### ${status} \`${file.replace(process.cwd() + "/", "")}\``);
    console.log(`- authored against catalog v${drift.authoredAgainst}`);
    if (drift.missingBlockIds.length > 0)
      console.log(`- missing blocks: ${drift.missingBlockIds.join(", ")}`);
    if (drift.missingBranchIds.length > 0)
      console.log(
        `- missing branches: ${drift.missingBranchIds
          .map((m) => `${m.nodeId}→${m.branchId}`)
          .join(", ")}`
      );
    if (drift.paramSchemaChanges.length > 0)
      console.log(`- soft drift on ${drift.paramSchemaChanges.length} node(s)`);
    console.log("");
  }
  process.exit(anyBreaking ? 1 : 0);
}

else {
  console.error(
    `Usage:
    pnpm catalog:build                                  # catalog.ts → catalog.json
    pnpm catalog:check                                  # TS vs committed JSON
    pnpm validate:catalog <catalog.json>
    pnpm validate:pathway <pathway.json> <catalog.json>
    pnpm drift:report     <catalog.json>`
  );
  process.exit(1);
}
