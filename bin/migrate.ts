// bin/migrate.ts
// Rewrites every *.pathway.json in the repo across a catalog major bump.
// Wired into package.json as:
//   "migrate:dry":  "tsx bin/migrate.ts --dry-run",
//   "migrate":      "tsx bin/migrate.ts"
//
// Behavior:
//   1. Load all migration files from catalog/migrations/ (sorted by version).
//   2. Discover every *.pathway.json in the repo (skipping node_modules).
//   3. For each doc, run every migration whose `fromCatalogVersion` matches
//      the doc's `meta.catalogVersion`, in order, until the doc reaches the
//      current catalog version.
//   4. Validate the result with PathwayDocumentSchema + detectCatalogDrift.
//   5. With --dry-run, print a per-file diff and any unresolved drift,
//      suggesting closest matches via findClosestBlockMatches. Without
//      --dry-run, write the migrated docs back in place and bump
//      meta.catalogVersion + meta.updatedAt.
//
// Migration file format (catalog/migrations/<version>-<slug>.ts):
//
//   import type { Migration } from "../../bin/migrate";
//   export const migration: Migration = {
//     fromCatalogVersion: "1.x.x",
//     toCatalogVersion:   "2.0.0",
//     description: "Rename moca → moca_v2 and drop deprecated_field",
//     blockIdRenames: { "moca": "moca_v2", "phq9": "phq9_v3" },
//     branchIdRenames: {
//       "amyloid_status": { "amyloid_pos": "amyloid_positive" }
//     },
//     paramKeyRenames: {
//       "moca_v2": { "cutoff": "cutoffScore" }
//     },
//     paramKeyDrops: {
//       "moca_v2": ["deprecated_field"]
//     },
//     // Escape hatch for anything the declarative API can't express:
//     transform: (doc) => doc,
//   };

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import {
  PathwayDocumentSchema,
  CatalogDocumentSchema,
  detectCatalogDrift,
  findClosestBlockMatches,
  type PathwayDocument,
  type CatalogDocument,
} from "../src/schema/pathway-schema";

/* ------------------------------------------------------------------ */
/* Migration type — exported so migration files can import it          */
/* ------------------------------------------------------------------ */

export interface Migration {
  fromCatalogVersion: string;    // semver range, e.g. "1.x.x"
  toCatalogVersion: string;      // exact, e.g. "2.0.0"
  description: string;
  blockIdRenames?: Record<string, string>;
  branchIdRenames?: Record<string, Record<string, string>>; // blockId -> { oldBranch: newBranch }
  paramKeyRenames?: Record<string, Record<string, string>>; // blockId -> { oldKey: newKey }
  paramKeyDrops?: Record<string, string[]>;                 // blockId -> dropped keys
  transform?: (doc: PathwayDocument) => PathwayDocument;
}

/* ------------------------------------------------------------------ */
/* Semver helpers (tiny — enough for x.y.z and "1.x.x" wildcard)       */
/* ------------------------------------------------------------------ */

function parseSemver(v: string): [number, number, number] {
  const [maj = "0", min = "0", patch = "0"] = v.replace(/^v/, "").split(".");
  return [Number(maj) || 0, Number(min) || 0, Number(patch) || 0];
}

function matchesRange(version: string, range: string): boolean {
  const [vMaj, vMin] = parseSemver(version);
  const [rMaj, rMin] = range.split(".").map((p) => (p === "x" ? "*" : p));
  if (rMaj !== "*" && Number(rMaj) !== vMaj) return false;
  if (rMin !== "*" && Number(rMin) !== vMin) return false;
  return true;
}

function semverCompare(a: string, b: string): number {
  const [aMaj, aMin, aPatch] = parseSemver(a);
  const [bMaj, bMin, bPatch] = parseSemver(b);
  return aMaj - bMaj || aMin - bMin || aPatch - bPatch;
}

/* ------------------------------------------------------------------ */
/* IO helpers                                                          */
/* ------------------------------------------------------------------ */

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function findPathwayFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) findPathwayFiles(full, found);
    else if (entry.endsWith(".pathway.json")) found.push(full);
  }
  return found;
}

async function loadMigrations(migrationsDir: string): Promise<Migration[]> {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".js"))
    .sort();
  const migrations: Migration[] = [];
  for (const file of files) {
    const mod = await import(resolve(migrationsDir, file));
    if (!mod.migration) {
      console.error(`✗ ${file} missing named export "migration"`);
      process.exit(1);
    }
    migrations.push(mod.migration as Migration);
  }
  return migrations.sort((a, b) => semverCompare(a.toCatalogVersion, b.toCatalogVersion));
}

/* ------------------------------------------------------------------ */
/* Applying a migration                                                */
/* ------------------------------------------------------------------ */

function applyMigration(doc: PathwayDocument, m: Migration): PathwayDocument {
  const next: PathwayDocument = JSON.parse(JSON.stringify(doc));

  for (const node of next.graph.nodes) {
    const oldBlockId = node.data.blockId;
    const newBlockId = m.blockIdRenames?.[oldBlockId];
    if (newBlockId) node.data.blockId = newBlockId;
    const resolvedBlockId = newBlockId ?? oldBlockId;

    if (node.data.branchSelection) {
      const branchMap = m.branchIdRenames?.[resolvedBlockId];
      if (branchMap?.[node.data.branchSelection]) {
        node.data.branchSelection = branchMap[node.data.branchSelection];
      }
    }

    const renames = m.paramKeyRenames?.[resolvedBlockId];
    if (renames) {
      for (const [oldKey, newKey] of Object.entries(renames)) {
        if (oldKey in node.data.params) {
          node.data.params[newKey] = node.data.params[oldKey];
          delete node.data.params[oldKey];
        }
      }
    }

    const drops = m.paramKeyDrops?.[resolvedBlockId];
    if (drops) for (const key of drops) delete node.data.params[key];
  }

  next.meta.catalogVersion = m.toCatalogVersion;
  next.meta.updatedAt = new Date().toISOString();

  return m.transform ? m.transform(next) : next;
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const repoRoot = process.cwd();
  const migrationsDir = resolve(repoRoot, "catalog/migrations");
  const catalogPath = resolve(repoRoot, "catalog/catalog.json");

  const catalogParse = CatalogDocumentSchema.safeParse(readJson(catalogPath));
  if (!catalogParse.success) {
    console.error("✗ catalog/catalog.json failed schema validation. Aborting.");
    console.error(catalogParse.error.format());
    process.exit(1);
  }
  const catalog: CatalogDocument = catalogParse.data;
  const targetVersion = catalog.catalogVersion;

  const migrations = await loadMigrations(migrationsDir);
  console.log(
    `Loaded ${migrations.length} migration(s). Target catalog v${targetVersion}.`
  );

  const files = findPathwayFiles(repoRoot);
  if (files.length === 0) {
    console.log("No pathway files found.");
    return;
  }

  let touched = 0;
  let blocked = 0;

  for (const file of files) {
    const rel = relative(repoRoot, file);
    const parse = PathwayDocumentSchema.safeParse(readJson(file));
    if (!parse.success) {
      console.error(`✗ ${rel} failed schema validation; skipping.`);
      blocked++;
      continue;
    }
    let doc = parse.data;
    const startVersion = doc.meta.catalogVersion;

    if (startVersion === targetVersion) {
      console.log(`✓ ${rel} already at v${targetVersion}`);
      continue;
    }

    const chain = migrations.filter((m) => {
      const matchesFrom = matchesRange(doc.meta.catalogVersion, m.fromCatalogVersion);
      const isForward = semverCompare(m.toCatalogVersion, doc.meta.catalogVersion) > 0;
      return matchesFrom && isForward;
    });

    if (chain.length === 0) {
      console.warn(
        `⚠ ${rel} at v${startVersion} has no migration path to v${targetVersion}`
      );
      blocked++;
      continue;
    }

    for (const m of chain) {
      doc = applyMigration(doc, m);
      console.log(
        `  ${rel}: applied "${m.description}" → v${m.toCatalogVersion}`
      );
    }

    const drift = detectCatalogDrift(doc, catalog);
    if (drift.missingBlockIds.length > 0 || drift.missingBranchIds.length > 0) {
      console.warn(`⚠ ${rel} still has unresolved drift after migration:`);
      for (const id of drift.missingBlockIds) {
        const suggestions = findClosestBlockMatches(id, catalog, { limit: 3 });
        console.warn(`    missing block "${id}". Closest matches:`);
        for (const s of suggestions) {
          console.warn(
            `      - ${s.blockId} (${(s.confidence * 100).toFixed(0)}% confidence, ${s.reason})`
          );
        }
      }
      for (const m of drift.missingBranchIds) {
        console.warn(`    missing branch "${m.branchId}" on node ${m.nodeId}`);
      }
      blocked++;
      continue;
    }

    if (dryRun) {
      console.log(`  ${rel}: dry-run OK (would write)`);
    } else {
      writeFileSync(file, JSON.stringify(doc, null, 2) + "\n");
      console.log(`  ${rel}: written → v${doc.meta.catalogVersion}`);
    }
    touched++;
  }

  console.log(
    `\n${dryRun ? "[dry-run] " : ""}Done. ${touched} migrated, ${blocked} blocked, ${files.length - touched - blocked} unchanged.`
  );
  if (blocked > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
