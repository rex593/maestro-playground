# Contributing to the Pathway Builder

Two loops, depending on what you're changing.

## Loop A — Authoring a new pathway (no code knowledge needed)

This is the loop Mirza and the clinical team use.

1. Open the app at the deployed URL or run `pnpm dev` locally.
2. Use the palette on the left to drag blocks onto the canvas. Use the inspector on the right to set parameters.
3. When the pathway is ready, click **Save to file** in the top menu. The browser downloads a `<slug>.pathway.json`.
4. Open a PR in this repo with the file dropped into `examples/`. CI will validate it against the current catalog. If you see a red ✗ on the PR, click into the "Catalog drift report" comment — it tells you exactly which block is missing.

You never touch TypeScript for this loop.

## Loop B — Editing the catalog (one developer in the loop)

This is the loop for adding a new block type, renaming a block, or changing a parameter schema. Only the catalog reviewers listed in `.github/CODEOWNERS` can merge this.

1. Open `catalog/catalog.ts`. TypeScript will autocomplete every field as you type.
2. Edit the block, branch, or parameter schema you need.
3. Bump `CATALOG_VERSION` at the top of the file:
   - **Patch** (`1.0.0` → `1.0.1`) — added metadata like a description or cost change.
   - **Minor** (`1.0.0` → `1.1.0`) — added a new block, new branch, or new optional paramSchema key.
   - **Major** (`1.0.0` → `2.0.0`) — renamed or removed a `blockId`, `branchId`, or `paramKey`. **You must write a migration.**
4. Run `pnpm catalog:build`. This validates your TS source and regenerates `catalog/catalog.json`. Both files get committed.
5. **If major:** create `catalog/migrations/<newVersion>-<slug>.ts` declaring the renames. Format:
   ```ts
   import type { Migration } from "../../bin/migrate";
   export const migration: Migration = {
     fromCatalogVersion: "1.x.x",
     toCatalogVersion: "2.0.0",
     description: "Rename moca → moca_v2",
     blockIdRenames: { "moca": "moca_v2" }
   };
   ```
   Then run `pnpm migrate:dry` to preview, and `pnpm migrate` to rewrite every `examples/*.pathway.json`.
6. Open the PR. CI runs catalog-sync → validate-catalog → validate-pathways → migrate-dry-run → drift-report. All five must pass.

## Where to ask for help

- Schema or migration confusion: comment on the PR and tag the schema CODEOWNER.
- Pathway authoring UX problems: file an issue with the `pathway-authoring` label.
- React Flow / canvas bugs: file an issue with the `canvas` label.
