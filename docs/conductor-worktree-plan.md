# Conductor Worktree Plan — Care Pathway Builder Rebuild

Confirmed scope: self-contained JSON schema (no external runtime), single-author with GitHub PRs, four parallel worktrees in Conductor.

## 0. Pre-flight (must finish before you fork)

Conductor runs each agent in an isolated git worktree off the same repo, so anything that lives on `main` is free shared context and anything that doesn't will collide at merge. The job here is to push the **smallest possible base scaffold** to `main` so the four parallel branches share a contract.

Create the repo `mindspan-pathway-builder` on GitHub, then on `main` land **one initial commit** with:

- **Vite + React 19 + TypeScript** scaffold (`pnpm create vite@latest pathway-builder --template react-ts`).
- **Tailwind CSS** + **shadcn/ui** (`pnpm dlx shadcn@latest init`) with `Sidebar`, `Resizable`, `Command`, `Button`, `Input`, `Select`, `Slider`, `Tabs`, `Dialog`, `Tooltip`, `Sonner` added.
- **Dependencies**: `@xyflow/react`, `@dnd-kit/react`, `zustand`, `zundo`, `react-hook-form`, `zod`, `@hookform/resolvers`, `dagre`, `elkjs`, `lucide-react`, `nanoid`, `date-fns`.
- **`src/schema/pathway-schema.ts`** — the Zod contract (see `pathway-schema.ts` artifact). This file is the single most important pre-flight item; once the worktrees fork, they all import from this path.
- **`src/state/usePathwayStore.ts`** — empty Zustand store wrapped in `temporal()` from zundo. Just the shell: `nodes`, `edges`, `selectedNodeId`, `selectedEdgeId`, `setNodes`, `setEdges`, `addNode`, `updateNode`, `removeNode`, `connect`. No logic, just typed actions so every worktree calls the same names.
- **`catalog/catalog.ts`** — the **source of truth** for the block catalog and branch map, authored in TypeScript so block authors get IntelliSense, exhaustive enum checks, and compile-time errors. Port the `gf` block catalog and `cf` branch map from the prototype (the full ~50 blocks). Exports `const catalog: CatalogDocument`. Start at `catalogVersion: "1.0.0"` and bump per semver on every change (patch for additive, minor for additive paramSchema, major for removed/renamed blockIds). See the `catalog-source.ts` artifact for the template.
- **`catalog/catalog.json`** — **generated** by `pnpm catalog:build` from `catalog/catalog.ts`. Committed to the repo so PRs show diffs, but never hand-edited (CI's `catalog:check` job blocks that). Referenced by id from every `.pathway.json`.
- **`catalog/migrations/`** — directory of TS migration files (named `<version>-<slug>.ts`, e.g. `2.0.0-rename-moca.ts`), each exporting `const migration: Migration`. Empty at v0.1.0; populated only when a major catalog bump renames or removes a block, branch, or paramKey. See section 7 for the workflow.
- **`src/state/catalog.ts`** — a tiny module that imports `catalog/catalog.json` via Vite's `?json` loader, validates it with `CatalogDocumentSchema` at module init (throws on bad data), and exports `catalog`, `getBlock(id)`, `getBranches(blockId)`, `catalogVersion`. Every pane reads through this module so swapping the catalog source later is a one-file change.
- **`bin/validate.ts`** + **`bin/migrate.ts`** — the CLIs from the `validate-cli.ts` and `migrate-cli.ts` artifacts, wired into `package.json`:
  ```
  "catalog:build":    "tsx bin/validate.ts build-catalog",
  "catalog:check":    "tsx bin/validate.ts check-catalog",
  "validate:catalog": "tsx bin/validate.ts catalog",
  "validate:pathway": "tsx bin/validate.ts pathway",
  "drift:report":     "tsx bin/validate.ts drift",
  "migrate:dry":      "tsx bin/migrate.ts --dry-run",
  "migrate":          "tsx bin/migrate.ts",
  "prebuild":         "pnpm catalog:build"
  ```
- **`.github/workflows/validate-pathways.yml`** — the CI workflow from the `validate-pathways.yml` artifact. Runs five sequenced jobs on every PR that touches `catalog/`, any `*.pathway.json`, or `src/schema/`: catalog TS↔JSON sync check, catalog validation, per-file pathway validation, migration dry-run, and a sticky PR comment with a drift report. Fails the PR on **breaking drift** (missing blockId or branchId) or **out-of-sync catalog**, warns on **soft drift** (dropped paramSchema keys).
- **`.github/CODEOWNERS`** — restrict `catalog/**` and `src/schema/**` to a small set of reviewers so accidental catalog edits inside feature PRs are surfaced.
- **`src/lib/cn.ts`**, **`src/styles/tokens.css`** — neutral grayscale tokens plus the six semantic block-category accents (`--block-entry`, `--block-assessment`, `--block-decision`, `--block-treatment`, `--block-monitoring`, `--block-outcome`) and the single `--accent-active` (#FF2D95). Same palette decision as the recommendations report.
- **`src/App.tsx`** — a three-pane shadcn `ResizablePanelGroup`: left = `<PalettePane />` (stub), center = `<CanvasPane />` (stub renders `<ReactFlow nodes={[]} edges={[]} />`), right = `<InspectorPane />` (stub). Each pane is exported from its own file so two agents editing different panes don't touch the same file.
- **`.github/PULL_REQUEST_TEMPLATE.md`** — checklist that every PR must update `pathway-schema.ts` only via additive change, and must include a screenshot or screen recording of the affected pane.
- **`docs/MERGE_ORDER.md`** — the order below, so each agent knows what to expect at PR time.

Commit, push to `main`, then in Conductor click `New Task` four times against this repo. Each new task auto-creates a fresh worktree on a new branch off `main`.

## 1. The four worktrees

Each branch owns exactly one file area, plus read-only access to `src/schema/*` and `src/state/*`. This is the conflict-free seam.

| Branch | Owns (writes) | Reads | Depends on |
|---|---|---|---|
| `feat/canvas` | `src/canvas/*`, `src/App.tsx` (center pane only) | schema, store, catalog | — |
| `feat/palette` | `src/palette/*`, `src/App.tsx` (left pane only) | schema, store, catalog | — |
| `feat/properties` | `src/inspector/*`, `src/App.tsx` (right pane only) | schema, store, catalog | — |
| `feat/io` | `src/io/*`, `src/state/usePathwayStore.ts` (load/save actions only) | schema, store | — |

The `App.tsx` collision is intentional but narrow — each agent only touches their own pane's import + JSX placement, which `git` merges fine 95% of the time and conflicts cleanly the other 5%.

## 2. Starter prompts (paste these into Conductor)

Each prompt assumes the agent already has the base scaffold from `main`. Each is self-contained, names exact files, and ends with a verification step.

### Prompt for `feat/canvas`

```
Build the canvas pane for the Care Pathway Builder rebuild on this worktree.

Context: the repo is a Vite + React + TS app with shadcn/ui, Tailwind, and
@xyflow/react already installed. The data contract lives at src/schema/pathway-schema.ts
(do NOT modify it). The Zustand store at src/state/usePathwayStore.ts exposes
nodes, edges, setNodes, setEdges, addNode, updateNode, removeNode, connect.
The block catalog lives at src/state/catalog.ts.

Tasks, in order:
1. Create src/canvas/PathwayNode.tsx — a custom React Flow node that reads
   { blockId, params, branchSelection, whoDecides } from data, looks up the
   BlockDefinition in catalog, and renders a card whose left border color is
   the matching var(--block-{type}) token. Show label, shortLabel, evidenceGrade
   chip, costPerPatient, and a `whoDecides` tag in the accent color. Use lucide
   icons for type. Top + bottom Handles.
2. Create src/canvas/PathwayEdge.tsx — animated dashed bezier with three marker
   variants (sequential/out_of_sequence/parallel/handoff) keyed off data.kind.
3. Create src/canvas/CanvasPane.tsx — full-height ReactFlow with Background,
   Controls, MiniMap. Wire nodes/edges/onNodesChange/onEdgesChange/onConnect to
   the Zustand store. Register the PathwayNode + PathwayEdge types.
4. Add a "Layout" button in the Panel toolbar that runs dagre top-to-bottom
   over the current graph and writes the new positions back to the store.
   Keep an elkjs version stubbed but commented for the parallel-lanes case.
5. Accept drops from outside the canvas: useReactFlow().screenToFlowPosition
   on `onDrop`, parse the dataTransfer payload as { blockId: string }, call
   addNode with default position + params from the BlockDefinition.

Out of scope: palette UI, inspector UI, JSON import/export.

Verify: open the app, paste this into the browser console to seed a node:
  window.__pathway?.addNode({ blockId: 'moca', position: { x: 0, y: 0 } })
The node should appear, be draggable, and the "Layout" button should reposition
it. Take a screenshot and attach to the PR.
```

### Prompt for `feat/palette`

```
Build the left palette pane for the Care Pathway Builder rebuild on this worktree.

Context: same base scaffold. Block catalog at src/state/catalog.ts. Schema at
src/schema/pathway-schema.ts. The canvas worktree is expecting drops with
dataTransfer payload `{ "blockId": "<id>" }` and MIME type
"application/x-pathway-block".

Tasks, in order:
1. Create src/palette/PaletteCard.tsx — small draggable card showing the block
   icon, label, type-colored left border (use var(--block-{type})), and
   evidenceGrade chip. Uses native HTML5 drag (onDragStart sets the payload
   above) — NOT @dnd-kit, because @dnd-kit can't drop onto a React Flow
   <div data-rfd-droppable>. (@dnd-kit is still used below for the saved-runs
   list.)
2. Create src/palette/PalettePane.tsx — shadcn Tabs at top with one tab per
   BlockType (entry / assessment / decision / treatment / monitoring / outcome),
   shadcn Command-style search at the top, a virtualized list (use react-window
   if >50 visible blocks). Render PaletteCards filtered by tab + search query.
3. Add a "Saved Runs" Collapsible section below the catalog that lists the
   user's saved pathways from store.savedRuns, draggable to reorder via
   @dnd-kit useSortable.
4. Add a keyboard shortcut Cmd-K that opens a shadcn CommandDialog with
   every block in the catalog, fuzzy-searchable, Enter to insert at canvas
   origin via store.addNode.

Out of scope: canvas rendering, inspector, JSON IO.

Verify: drag a "MoCA" card onto the empty canvas — once the canvas worktree
merges, the node should land. For now, log the dataTransfer payload on drop
into a stub drop zone in the center pane. Cmd-K opens the dialog and Enter
calls addNode. Screenshot or screen recording on the PR.
```

### Prompt for `feat/properties`

```
Build the right inspector / properties panel for the Care Pathway Builder
rebuild on this worktree.

Context: same base scaffold. Schema at src/schema/pathway-schema.ts. Store
exposes selectedNodeId, selectedEdgeId, updateNode, removeNode. Catalog at
src/state/catalog.ts. The properties form is schema-driven from each
BlockDefinition's `paramSchema: ParamField[]`.

Tasks, in order:
1. Create src/inspector/FieldRenderer.tsx — given a ParamField, render the
   correct shadcn control:
     kind=number      -> Slider with label + numeric input + unit
     kind=select      -> Select with options
     kind=multiselect -> chip-style toggle group with options
     kind=boolean     -> Switch
2. Create src/inspector/NodePropertiesForm.tsx — given a node id:
     - look up its BlockDefinition
     - build a Zod schema dynamically from paramSchema
     - wire react-hook-form with zodResolver
     - render FieldRenderers in a vertical stack
     - on every change (mode: "onChange"), call store.updateNode with new params
3. Create src/inspector/BranchPicker.tsx — when the selected node is a gate
   (isGate=true), render a list of available Branches from the catalog with
   their whoDecides chip + effect multiplier. Selecting one writes
   branchSelection on the node.
4. Create src/inspector/InspectorPane.tsx — empty state ("Select a block to
   edit its properties"), block header (label + type + evidenceGrade), then
   the NodePropertiesForm, then the BranchPicker if applicable. Add a
   "Delete block" button at the bottom that calls store.removeNode.

Out of scope: canvas, palette, JSON IO.

Verify: temporarily seed a MoCA node + select it in the store on mount. The
inspector should render its params, edits should flow to the store and back
into the form (round-trip). Screenshot on the PR.
```

### Prompt for `feat/io`

```
Build JSON import/export + catalog drift handling for the Care Pathway Builder
rebuild on this worktree.

Context: same base scaffold. The serialization contract is in
src/schema/pathway-schema.ts (PathwayDocumentSchema + CatalogDocumentSchema +
detectCatalogDrift). The catalog is referenced by id — pathway files contain
node.data.blockId values that resolve against catalog/catalog.json at load
time. The store exposes nodes, edges, meta, viewport. The catalog module is
src/state/catalog.ts and exposes catalog, getBlock, getBranches, catalogVersion.

Tasks, in order:
1. Create src/io/serialize.ts:
     export function toDocument(state): PathwayDocument
   Pulls current store state into a PathwayDocument shape. Sets
   meta.catalogVersion = the current imported catalogVersion. Runs the
   result through PathwayDocumentSchema.parse before returning.
2. Create src/io/deserialize.ts:
     export function fromDocument(input: unknown):
       { doc: PathwayDocument; drift: CatalogDriftReport }
   Parses with PathwayDocumentSchema (throws ZodError on bad data), then
   runs detectCatalogDrift against the current catalog. Migration switch
   for older schemaVersion left as v0→v1 stub.
3. Create src/io/MissingBlockNode.tsx — a React Flow custom node type for
   rendering placeholders when a saved doc references a blockId no longer
   in the catalog. Shows the orphan blockId, a "missing from catalog
   v{currentVersion}" tooltip, and a "Replace…" button that opens a
   Command picker. The picker MUST call findClosestBlockMatches(missingId,
   catalog, { limit: 5, preferType: node.data.type }) from the schema and
   surface those matches at the top of the list (with their confidence
   score as a chip), followed by the full alphabetized catalog. Selecting
   a match rewrites node.data.blockId and re-runs detectCatalogDrift on
   the doc so the DriftBanner updates live.
4. Extend src/state/usePathwayStore.ts with:
     loadPathway(doc: PathwayDocument): { drift: CatalogDriftReport }
        // replaces nodes/edges/meta; any node whose blockId is missing
        // gets its type rewritten to "missingBlock" so the canvas renders
        // MissingBlockNode for it
     savePathway(): PathwayDocument           // calls toDocument
   Wrap loadPathway in the zundo middleware boundary so it clears history.
5. Create src/io/DriftBanner.tsx — Sonner-style sticky banner that shows
   on load when the returned drift is non-empty. Lists missing blocks,
   missing branches, and a "View report" link that opens a Sheet with the
   full CatalogDriftReport.
6. Create src/io/PathwayMenu.tsx — top-bar dropdown with:
     - New (calls makeEmptyPathway(id, title, catalogVersion) + loadPathway)
     - Open from file (file input → JSON.parse → fromDocument → loadPathway
       → if drift, show DriftBanner)
     - Save to file (savePathway → JSON.stringify(_, null, 2) → trigger
       download as `${meta.id}.pathway.json`)
     - Copy share link (base64-encode the doc into the URL hash; load on
       mount if hash present)
7. Create bin/validate.ts — the three-mode CLI:
     pnpm validate:catalog catalog/catalog.json
     pnpm validate:pathway <pathway.json> catalog/catalog.json
     pnpm drift:report     catalog/catalog.json
   The implementation is provided as the validate-cli.ts artifact — drop it
   in at bin/validate.ts and wire the three scripts into package.json.
8. Verify CI: the workflow .github/workflows/validate-pathways.yml is already
   in the base scaffold. Run it locally with `act` or just push and check
   that all three jobs pass.
9. Create examples/agilon-judy.pathway.json — port the agilon Judy's Story
   15-block template from the prototype's Ff array. Reference blocks by id
   only; set meta.catalogVersion to the current value. This is the
   regression fixture for both unit tests and CI.

Out of scope: canvas/palette/inspector UI work beyond the menu, banner, and
MissingBlockNode component.

Verify:
  pnpm validate:catalog catalog/catalog.json                          # OK
  pnpm validate:pathway examples/agilon-judy.pathway.json catalog/catalog.json   # OK
  pnpm drift:report catalog/catalog.json                              # ✓ everywhere
Then break it: delete a referenced blockId from catalog.json and rerun —
drift:report must print BREAKING and exit 1. Restore catalog, screenshot the
PR, ship.
```

## 3. Merge order

Land in this order; each PR rebases on the previous one's `main`.

1. **`feat/io`** first. It has zero UI surface, so it lands silently and gives the other three a working `loadPathway` to seed test data.
2. **`feat/canvas`** second. Once canvas is on main, palette has a real drop target and inspector has real nodes to select.
3. **`feat/palette`** third. Drops now do something visible.
4. **`feat/properties`** last. Inspector edits real nodes that are visible on a real canvas.

If two PRs collide on `App.tsx`, the second-to-merge owns the conflict resolution; the conflict is always purely additive (importing a new pane component).

## 4. Conductor mechanics

In Conductor, each task gets its own worktree and its own Claude Code session, so you can watch all four diffs in parallel from the unified view. Use the per-task chat to nudge any agent that's drifting (for instance: "use shadcn Slider not the native range input"). When all four PRs are green, merge in the order above, run `pnpm validate examples/agilon-judy.pathway.json` on `main` as a sanity check, then tag `v0.1.0`.

## 5. Catalog ownership and drift policy

The catalog is the contract; pathways reference it by id. That makes catalog edits a higher-stakes change than pathway edits, so the rules are:

- **The catalog lives on `main` only.** No worktree commits changes to `catalog/catalog.json`. Catalog edits ship in their own PRs.
- **Every catalog edit bumps `catalogVersion`** per semver: patch for additive metadata, minor for additive blocks or additive paramSchema keys, **major for any removed/renamed blockId, branchId, or paramSchema key**.
- **Breaking drift fails CI.** The `check-drift` job in `validate-pathways.yml` posts a sticky PR comment with the drift report and exits non-zero if any pathway file references a missing blockId or branchId. Soft drift (dropped paramSchema keys) warns but doesn't fail.
- **Graceful render at runtime.** When a user opens a pathway whose catalog drifted, missing blocks render as `MissingBlockNode` placeholders with a "Replace…" picker. The pathway is still openable, savable, and editable — just incomplete.
- **Migrations live in `catalog/migrations/`.** For any major catalog bump, the maintainer adds one TS file per renamed/dropped id (e.g. `catalog/migrations/2.0.0-rename-moca.ts`) declaring the rename map. `pnpm migrate` walks every `.pathway.json` in the repo, applies the chain in semver order, and writes them back. CI runs `pnpm migrate:dry` on every PR — if there are pending migrations that haven't been applied, the dry-run reports it and the PR is blocked.

## 6. Catalog edit + migration workflow (step by step)

For a contributor making any catalog change:

1. Open `catalog/catalog.ts`. Edit the block, branch, or paramSchema.
2. Bump `CATALOG_VERSION` per the semver rules in section 5.
3. Run `pnpm catalog:build`. The script validates the TS source against `CatalogDocumentSchema` and writes the updated `catalog/catalog.json`. Both files get committed.
4. **If the bump is major** (renamed or removed blockId, branchId, or paramKey):
   - Create `catalog/migrations/<newVersion>-<slug>.ts` exporting a `Migration` object with `blockIdRenames`, `branchIdRenames`, `paramKeyRenames`, or `paramKeyDrops` declared. See the `migrate-cli.ts` artifact's docblock for the format.
   - Run `pnpm migrate:dry` to preview the rewrites against every `examples/*.pathway.json`. If any docs are still drifting (the migration didn't cover everything), the dry-run prints fuzzy-match suggestions from `findClosestBlockMatches` — refine the migration until clean.
   - Run `pnpm migrate` to write the migrated docs back. Commit them in the same PR as the catalog change.
5. Open the PR. CI runs in this order: `catalog-sync` → `validate-catalog` → `validate-pathways` → `migrate-dry-run` → `check-drift`. The PR is green only when all five pass. The drift report is posted as a sticky comment for reviewer context.
6. Merge to `main`. Done.

For a contributor adding a new pathway (not editing the catalog):
1. Build it in the app, save to file, commit to `examples/`.
2. CI's `validate-pathways` and `check-drift` jobs verify it against the current catalog. That's it.

## 7. What's intentionally out of scope for v0.1.0

The Snake easter egg, the agilon scripted narrative runner (chapter auto-scroll), the Present Mode auto-hide, and the Compare grid — all of these are second-pass features that depend on the four primitives above working. The agilon JSON fixture from `feat/io` keeps the option alive for v0.2.0 without blocking v0.1.0.
