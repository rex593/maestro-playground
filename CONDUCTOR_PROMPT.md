# Conductor Prompt Pack — Mindspan Pathway Builder Rebuild

This file is the only thing you need open. It contains:

1. A one-time **base-scaffold task** that you paste into Conductor against the empty `main` branch.
2. Four **parallel feature tasks** that you paste into four separate Conductor tasks once `main` is set up.

Every task is self-contained. Every task tells the agent exactly which files in this kit to read, where to copy them to in the repo, what to write from scratch, and what counts as "done."

## How to drive Conductor through this

1. Create the GitHub repo `mindspan-pathway-builder` (empty, default branch `main`).
2. Clone it locally.
3. Unzip this kit into the repo root. Commit and push the kit as-is. This single commit is the "base of the rebuild."
4. Open Conductor → **New Task** → point at this repo → paste the **Task 0 (base scaffold)** prompt below. Let it run on `main` directly (not a worktree). It will install deps, port the catalog, and push.
5. Once Task 0 is merged to `main`, click **New Task** four times. For each one, paste **Task 1 / 2 / 3 / 4** below. Conductor will create four isolated worktrees off `main` and run them in parallel.
6. As PRs come in, merge them in the documented order: `feat/io` → `feat/canvas` → `feat/palette` → `feat/properties`.
7. After all four merge, tag `v0.1.0`.

Everything below this line is meant to be **copy-pasted verbatim**, one task per Conductor session.

---

## Task 0 — Base scaffold (run on `main`, not a worktree)

```
You are setting up the base scaffold for the Mindspan Pathway Builder rebuild.
This task runs directly on `main`. The repo already has a kit committed at the
root with these files:

  src/schema/pathway-schema.ts        — Zod contract for the data model
  catalog/catalog.ts                  — TS source of truth for the block catalog
  bin/validate.ts                     — CLI: catalog build/check, validate, drift
  bin/migrate.ts                      — CLI: migration runner with --dry-run
  .github/workflows/validate-pathways.yml
  .github/CODEOWNERS
  .github/PULL_REQUEST_TEMPLATE.md
  CONTRIBUTING.md
  README.md
  package.json                        — all deps + scripts wired
  docs/conductor-worktree-plan.md     — the full plan
  docs/library-recommendations.md     — why each library was chosen

Do these steps, in order:

1. Run `pnpm install`. Resolve any lockfile issues. Commit the lockfile.
2. Scaffold Vite + React 19 + TypeScript over the existing tree:
     - Add `vite.config.ts` with @vitejs/plugin-react and a path alias `@` → `./src`.
     - Add `tsconfig.json` and `tsconfig.node.json` with strict mode, jsx: "react-jsx",
       moduleResolution: "bundler", and the `@/*` alias.
     - Add `index.html` and `src/main.tsx` that mounts <App /> with createRoot.
     - Add `src/App.tsx` as the three-pane shell (see step 4).
3. Install and initialize Tailwind + shadcn/ui:
     - `pnpm dlx tailwindcss init -p`
     - Configure `tailwind.config.ts` to scan `./src/**/*.{ts,tsx}` and `./index.html`.
     - `pnpm dlx shadcn@latest init` with defaults (Slate, CSS variables, RSC: no).
     - Add these shadcn components: button, input, select, slider, switch, tabs,
       dialog, sheet, command, tooltip, sonner, separator, resizable, sidebar,
       collapsible, scroll-area, badge, toggle-group, label.
4. Create the empty pane stubs (one file per pane so worktrees don't collide):
     - `src/canvas/CanvasPane.tsx` — exports `<CanvasPane />`, returns
       `<div className="h-full grid place-items-center text-muted-foreground">canvas</div>`.
     - `src/palette/PalettePane.tsx` — same pattern, returns "palette".
     - `src/inspector/InspectorPane.tsx` — same pattern, returns "inspector".
     - `src/io/PathwayMenu.tsx` — same pattern, returns null.
5. Wire `src/App.tsx` as a top-bar + three-pane `ResizablePanelGroup`:
     left = PalettePane (defaultSize 20), center = CanvasPane (defaultSize 55),
     right = InspectorPane (defaultSize 25). Top bar renders <PathwayMenu />.
6. Build the empty Zustand store at `src/state/usePathwayStore.ts`:
     - Wrap with `temporal()` from zundo so every worktree gets free undo/redo.
     - Slice: { nodes: [], edges: [], meta: makeEmptyPathway('untitled','Untitled',catalogVersion).meta,
       selectedNodeId: null, selectedEdgeId: null, savedRuns: [] }.
     - Actions (typed but empty/no-op for now): setNodes, setEdges, addNode,
       updateNode, removeNode, connect, loadPathway, savePathway,
       selectNode, selectEdge, clearSelection, saveRun.
     - Export a `usePathwayStore` hook + a `useTemporalStore` hook for undo/redo.
7. Build the catalog loader at `src/state/catalog.ts`:
     - `import catalogJson from '../../catalog/catalog.json'`
     - Parse with CatalogDocumentSchema at module init; throw on failure.
     - Export: catalog, catalogVersion, getBlock(id), getBranches(blockId).
8. Build the design tokens at `src/styles/tokens.css`:
     - :root variables for grayscale neutrals (--background, --foreground,
       --muted, --border, --card), the six block-category tints
       (--block-entry through --block-outcome) using the prototype's neon palette,
       and a single --accent-active = #FF2D95.
     - Import this from `src/main.tsx` after the Tailwind directives.
9. Run `pnpm catalog:build`. This compiles `catalog/catalog.ts` to
   `catalog/catalog.json`. Commit both. Verify with `pnpm catalog:check`.
10. Run `pnpm typecheck`. It must pass with zero errors. Fix anything broken.
11. Confirm `pnpm dev` boots and renders the three empty panes.
12. Commit everything in a single commit titled "chore: base scaffold (Task 0)".
    Push to `main`. Do NOT open a PR — this is the base for everything else.

Out of scope: any canvas, palette, inspector, or IO functionality beyond
the empty stubs. Those are Tasks 1–4.

Verify before declaring done:
  - `pnpm install` clean
  - `pnpm catalog:build` writes catalog/catalog.json
  - `pnpm catalog:check` exits 0
  - `pnpm typecheck` exits 0
  - `pnpm dev` boots and the three panes render
  - `git log` shows one new commit on main
```

---

## Task 1 — `feat/io` (run in worktree)

```
You own JSON import/export + catalog drift handling for the Mindspan Pathway
Builder rebuild. You're in a Conductor worktree off `main`. The base scaffold
is already in place (see docs/conductor-worktree-plan.md section 0).

The data contract you implement against:
  - src/schema/pathway-schema.ts — PathwayDocumentSchema, CatalogDocumentSchema,
    detectCatalogDrift, findClosestBlockMatches, makeEmptyPathway. Read this
    file first. DO NOT MODIFY IT.
  - src/state/catalog.ts — exports catalog + catalogVersion + getBlock/getBranches.
  - src/state/usePathwayStore.ts — has stub actions you'll fill in.

You own these files (no other worktree touches them):
  src/io/serialize.ts
  src/io/deserialize.ts
  src/io/MissingBlockNode.tsx
  src/io/DriftBanner.tsx
  src/io/PathwayMenu.tsx           (replace the Task 0 stub)
  examples/partner-cognitive-journey.pathway.json

You also extend src/state/usePathwayStore.ts with two actions: loadPathway and
savePathway. Touch nothing else in that file.

Implementation steps:

1. src/io/serialize.ts:
     export function toDocument(state): PathwayDocument
   Pull nodes/edges/meta from the store. Force meta.catalogVersion to the
   current catalogVersion exported by src/state/catalog.ts. Run the result
   through PathwayDocumentSchema.parse before returning.

2. src/io/deserialize.ts:
     export function fromDocument(input: unknown):
       { doc: PathwayDocument; drift: CatalogDriftReport }
   Parse with PathwayDocumentSchema (throws ZodError on bad data). Run
   detectCatalogDrift against the current catalog. Add a switch on
   doc.meta.schemaVersion for future migrations; v0→v1 stub is fine for now.

3. src/io/MissingBlockNode.tsx:
   A React Flow custom node type. Shows the orphan blockId, a tooltip
   "missing from catalog v{currentVersion}", and a "Replace…" button that
   opens a shadcn CommandDialog. The dialog MUST surface fuzzy matches at
   the top by calling:
     findClosestBlockMatches(missingId, catalog, {
       limit: 5,
       preferType: node.data.type
     })
   Render each match with its `confidence` as a percentage badge and its
   `reason` ("exact" / "prefix" / "substring" / "fuzzy" / "type-fallback")
   as a chip. Below the matches, show the full alphabetized catalog.
   Selecting any block rewrites node.data.blockId via store.updateNode
   and re-runs detectCatalogDrift so the DriftBanner updates live.

4. src/io/DriftBanner.tsx:
   Sticky banner using sonner. Mounts at app root. Subscribes to the store's
   most-recent drift report. When non-empty, shows a one-line summary
   ("3 missing blocks, 1 missing branch") and a "View report" button that
   opens a Sheet with the full CatalogDriftReport in a readable form.

5. Extend src/state/usePathwayStore.ts (additive — do not rewrite existing actions):
     loadPathway: (doc: PathwayDocument) => { drift: CatalogDriftReport }
        - Replaces nodes/edges/meta/viewport.
        - For any node whose data.blockId is in drift.missingBlockIds,
          set node.type = "missingBlock" so React Flow uses MissingBlockNode.
        - Wrap in zundo's clear() so undo history starts fresh on load.
     savePathway: () => PathwayDocument
        - Calls toDocument(get()).
   Also expose: lastDrift: CatalogDriftReport | null and setLastDrift action.

6. src/io/PathwayMenu.tsx (replace stub):
   Top-bar shadcn DropdownMenu with items:
     - New                — makeEmptyPathway + loadPathway
     - Open from file…    — hidden <input type="file" accept=".json">,
                            JSON.parse → fromDocument → loadPathway. If
                            drift, set store.lastDrift to trigger DriftBanner.
     - Save to file       — savePathway → JSON.stringify(doc, null, 2) →
                            trigger download as `${meta.id}.pathway.json`.
     - Copy share link    — base64-encode doc into URL hash. On app mount
                            (handle this with a useEffect in App.tsx —
                            yes you can edit App.tsx for this one block),
                            decode and loadPathway if hash present.

7. bin/validate.ts and bin/migrate.ts already exist. Wire them in if any
   script in package.json is missing. Verify all of these run:
     pnpm catalog:build
     pnpm catalog:check
     pnpm validate:catalog catalog/catalog.json
     pnpm drift:report catalog/catalog.json
     pnpm migrate:dry

8. examples/partner-cognitive-journey.pathway.json:
   Port the partner cognitive journey 15-block template from the prototype's `Ff`
   array (see the original uploaded HTML) into a real PathwayDocument.
   Nodes reference blocks by id only — do NOT bundle the catalog into the
   doc. Set meta.catalogVersion = the current value from src/state/catalog.ts.
   Set meta.template = "partner_journey" and meta.geography = "national".
   This file MUST validate clean with:
     pnpm validate:pathway examples/partner-cognitive-journey.pathway.json catalog/catalog.json
   It MUST also pass `pnpm drift:report catalog/catalog.json`.

9. Add a hard test: temporarily duplicate examples/partner-cognitive-journey.pathway.json
   as examples/_drift-fixture.pathway.json and rename a blockId in the copy
   to something the catalog doesn't have. Run `pnpm drift:report` — it must
   print "BREAKING" and exit 1. Then delete the fixture. Add a note in the
   PR description that you verified breaking-drift detection.

Out of scope: canvas rendering, palette UI, inspector UI. Those are Tasks 2–4.

Verify before declaring done:
  - pnpm typecheck clean
  - pnpm validate:pathway examples/partner-cognitive-journey.pathway.json catalog/catalog.json → OK
  - pnpm drift:report → ✓ everywhere
  - Hand-test: open the app, click "Open from file" with the partner journey JSON.
    Once Task 2 (canvas) merges this will visibly render; for now log the
    loaded doc to the console.
  - Screenshot of the PathwayMenu, the DriftBanner in a forced-drift state,
    and the MissingBlockNode with the fuzzy-match dialog open. Attach to PR.

Open the PR titled "feat(io): JSON IO + catalog drift handling". Tag
@rex for review.
```

---

## Task 2 — `feat/canvas` (run in worktree)

```
You own the canvas pane for the Mindspan Pathway Builder rebuild. You're in
a Conductor worktree off `main`. The base scaffold is already in place.

You own these files:
  src/canvas/CanvasPane.tsx      (replace the Task 0 stub)
  src/canvas/PathwayNode.tsx
  src/canvas/PathwayEdge.tsx
  src/canvas/layout/dagre.ts
  src/canvas/layout/elk.ts       (stub, commented body — see below)
  src/canvas/CanvasToolbar.tsx

You also touch src/App.tsx ONLY to import CanvasPane into the existing center
slot — do not change the slot's layout or props.

Implementation steps:

1. src/canvas/PathwayNode.tsx — a React Flow custom node type registered as
   "pathwayNode". The node:
     - Reads node.data: { blockId, params, branchSelection, lane }
     - Looks up the BlockDefinition via getBlock(blockId) from src/state/catalog.ts
     - Renders a Card whose left border is `var(--block-{def.type})` (4px)
     - Header: lucide icon for the type + def.label + def.evidenceGrade chip
     - Body: def.shortLabel + costPerPatient as `$N` + a `whoDecides` tag in
       `var(--accent-active)` when present
     - One Handle on top (target) and one on bottom (source)
     - When data.branchSelection is set, render a small chip showing the
       branch label below the body
     - className uses Tailwind utilities only

2. src/canvas/PathwayEdge.tsx — a React Flow custom edge type registered as
   "pathwayEdge". The edge:
     - Reads edge.data.kind: "sequential" | "out_of_sequence" | "parallel" | "handoff"
     - Renders an animated dashed bezier path (stroke-dasharray: 6 3, animate
       stroke-dashoffset from 0 to -18 over 1.5s, infinite)
     - Color by kind: sequential = neutral-400, out_of_sequence = red-500,
       parallel = pink-500, handoff = var(--accent-active)
     - Arrowhead marker matching the color
     - Optional edge.data.label rendered as a centered EdgeLabelRenderer pill

3. src/canvas/layout/dagre.ts:
     export function layoutDagre(nodes, edges, direction = 'TB'):
       { nodes, edges }
   Build a dagre graph, run layout, write position back to a new node array.
   Use node dimensions of 220×108 (matches the prototype's wf/Tf constants).

4. src/canvas/layout/elk.ts:
   Export a stub with the same signature. Body is `throw new Error('elk
   layout not yet implemented')`. Add a TODO comment explaining when to
   wire it up (parallel-lane forks where dagre's port assignment is weak).

5. src/canvas/CanvasToolbar.tsx — a React Flow <Panel> at top-right:
     - Undo / Redo buttons wired to useTemporalStore (zundo).
     - "Layout" button calls layoutDagre and setNodes/setEdges.
     - "Fit view" button calls fitView from useReactFlow.

6. src/canvas/CanvasPane.tsx — the main component:
     - Wraps everything in <ReactFlowProvider> if needed
     - <ReactFlow> with:
         nodeTypes={{ pathwayNode: PathwayNode, missingBlock: MissingBlockNode }}
         edgeTypes={{ pathwayEdge: PathwayEdge }}
         onNodesChange / onEdgesChange / onConnect → store actions
         onNodeClick → store.selectNode(node.id)
         onEdgeClick → store.selectEdge(edge.id)
         onPaneClick → store.clearSelection()
         fitView attribute set
     - Children: <Background />, <Controls />, <MiniMap />, <CanvasToolbar />
   IMPORTANT: import MissingBlockNode from "@/io/MissingBlockNode" with a
   try/catch fallback so this worktree builds before feat/io merges. If
   the import fails at runtime, register a placeholder div with the same
   shape. After feat/io merges, delete the fallback.

7. Drop target for the palette:
     - useReactFlow().screenToFlowPosition on onDrop
     - Read event.dataTransfer.getData('application/x-pathway-block') →
       JSON.parse → { blockId: string }
     - Call store.addNode({ blockId, position }). addNode uses
       getBlock(blockId).defaultParams to fill node.data.params.

Out of scope: palette UI, inspector UI, JSON IO. Those are Tasks 1, 3, 4.

Verify before declaring done:
  - pnpm typecheck clean
  - Hand-seed a node from the browser console:
      window.__store = usePathwayStore.getState();
      window.__store.addNode({ blockId: 'moca', position: { x: 0, y: 0 } });
    Confirm it appears, is draggable, and the "Layout" button repositions it.
  - Connect two nodes by dragging from one handle to another. Confirm the
    PathwayEdge renders with the animated dashed style.
  - Screenshot of the canvas with 2–3 nodes and an edge. Attach to PR.

Open the PR titled "feat(canvas): React Flow canvas + custom node/edge".
```

---

## Task 3 — `feat/palette` (run in worktree)

```
You own the left palette pane for the Mindspan Pathway Builder rebuild. You're
in a Conductor worktree off `main`. The base scaffold is already in place.

You own these files:
  src/palette/PalettePane.tsx    (replace the Task 0 stub)
  src/palette/PaletteCard.tsx
  src/palette/PaletteSearch.tsx
  src/palette/SavedRunsList.tsx
  src/palette/QuickInsertDialog.tsx

You touch src/App.tsx ONLY to import PalettePane into the existing left slot.

The canvas worktree (Task 2) expects drops with:
  dataTransfer.types includes "application/x-pathway-block"
  payload = JSON.stringify({ blockId: "<id>" })

Implementation steps:

1. src/palette/PaletteCard.tsx:
   Small draggable card for one BlockDefinition. Renders:
     - lucide icon for the type
     - def.label + def.shortLabel
     - 4px left border in `var(--block-{def.type})`
     - def.evidenceGrade chip
   Uses NATIVE HTML5 drag (NOT @dnd-kit — React Flow's drop zone won't
   accept dnd-kit drops):
     onDragStart: e.dataTransfer.setData(
       'application/x-pathway-block',
       JSON.stringify({ blockId: def.id })
     ); e.dataTransfer.effectAllowed = 'copyMove';

2. src/palette/PaletteSearch.tsx:
   Wrapper around shadcn Input with a Search icon. Local state, debounced
   (~150ms) via a setTimeout in useEffect.

3. src/palette/PalettePane.tsx:
   shadcn Tabs at top with one tab per BlockType ("Entry" / "Assess" /
   "Decide" / "Treat" / "Monitor" / "Outcome"). Each tab content:
     - PaletteSearch at the top
     - Filtered list of PaletteCards for blocks where:
         def.type === activeTab AND (no query OR fuzzy-matches def.label/id)
     - Virtualize with react-window FixedSizeList if visible blocks > 30
   Below the tabs section, an "Saved Runs" Collapsible (defaultClosed) that
   renders <SavedRunsList />.

4. src/palette/SavedRunsList.tsx:
   Reads store.savedRuns. Renders each as a row with the run's name +
   block count + saved-at timestamp. Uses @dnd-kit's useSortable to allow
   reordering. (This is the only place @dnd-kit is used in the palette.)

5. src/palette/QuickInsertDialog.tsx:
   A shadcn CommandDialog opened by Cmd-K / Ctrl-K. Lists every block in
   the catalog, fuzzy-searchable. On Enter, calls store.addNode with the
   selected block at the current viewport center (use useReactFlow's
   getViewport from @xyflow/react). Mount it from PalettePane.

Out of scope: canvas rendering, inspector, JSON IO.

Verify before declaring done:
  - pnpm typecheck clean
  - Drag a PaletteCard onto the canvas (once Task 2 has merged into your
    branch via rebase, this will visibly drop). For now, drop onto a
    temporary <div onDrop> in CanvasPane and console.log the payload.
  - Open Cmd-K, type "moca", press Enter → addNode is called.
  - Screenshot of the palette open on the Assess tab + the Cmd-K dialog
    with results. Attach to PR.

Open the PR titled "feat(palette): catalog palette + Cmd-K + saved runs".
```

---

## Task 4 — `feat/properties` (run in worktree)

```
You own the right inspector / properties panel for the Mindspan Pathway Builder
rebuild. You're in a Conductor worktree off `main`. The base scaffold is in.

You own these files:
  src/inspector/InspectorPane.tsx    (replace the Task 0 stub)
  src/inspector/FieldRenderer.tsx
  src/inspector/NodePropertiesForm.tsx
  src/inspector/BranchPicker.tsx
  src/inspector/EmptyState.tsx

You touch src/App.tsx ONLY to import InspectorPane into the existing right slot.

The data contract: each BlockDefinition has a `paramSchema: ParamField[]`
where ParamField is a discriminated union on `kind` ("number" | "select" |
"multiselect" | "boolean"). The store exposes:
  - selectedNodeId
  - selectedEdgeId
  - updateNode(nodeId, partial)
  - removeNode(nodeId)

Implementation steps:

1. src/inspector/FieldRenderer.tsx:
   Given a ParamField + a value + an onChange callback, render the right
   shadcn control:
     kind=number      → shadcn Slider + numeric Input + unit suffix
     kind=select      → shadcn Select
     kind=multiselect → shadcn ToggleGroup type="multiple"
     kind=boolean     → shadcn Switch
   Each field uses shadcn Label and shows helpText as muted small text below.

2. src/inspector/NodePropertiesForm.tsx:
   Given a node id:
     - Resolve BlockDefinition via getBlock(node.data.blockId)
     - Dynamically build a Zod schema from def.paramSchema using a switch on
       each field's `kind`:
         number      → z.number().min(min ?? -Infinity).max(max ?? Infinity)
         select      → z.enum(options.map(o => o.value))
         multiselect → z.array(z.enum(options.map(o => o.value)))
         boolean     → z.boolean()
     - Wire react-hook-form with @hookform/resolvers/zod, mode: "onChange",
       defaultValues: { ...def.defaultParams, ...node.data.params }
     - Render a FieldRenderer per param.
     - watch() the form; on every change call store.updateNode(node.id,
       { data: { ...node.data, params: nextValues } }). Debounce 100ms to
       avoid hammering zundo's history.

3. src/inspector/BranchPicker.tsx:
   Rendered only when getBlock(node.data.blockId).isGate is true.
     - Reads catalog branches via getBranches(blockId).
     - Renders each Branch as a Card with the label, whoDecides chip,
       effect multiplier (`×0.85` etc), and isDefault badge.
     - The currently-selected branch (node.data.branchSelection) has a
       solid accent border.
     - Clicking writes branchSelection via store.updateNode.

4. src/inspector/EmptyState.tsx:
   Shown when no selection. A short instruction + a small lucide icon.

5. src/inspector/InspectorPane.tsx:
   Reads selectedNodeId from the store.
     - No selection → <EmptyState />.
     - Node selected:
         Header: def icon + def.label + def.type chip + def.evidenceGrade.
         Section: <NodePropertiesForm nodeId={selectedNodeId} />
         Section: <BranchPicker nodeId={selectedNodeId} /> (conditional)
         Footer: shadcn Button variant="destructive" "Delete block" that
         calls store.removeNode(selectedNodeId).
     - (Edge selection in v0.1.0 just shows EmptyState with a "edges
       have no properties yet" hint.)

Out of scope: canvas, palette, IO.

Verify before declaring done:
  - pnpm typecheck clean
  - Hand-seed in console:
      const s = usePathwayStore.getState();
      s.addNode({ blockId: 'moca', position: { x: 0, y: 0 } });
      s.selectNode(s.nodes[0].id);
    The inspector should render the MoCA paramSchema (cutoffScore Slider,
    administeredBy Select). Drag the slider; the store value updates and
    the form value follows (round-trip).
  - For a gate node (e.g. junction_partner_handoff), the BranchPicker
    appears below the form and selecting a branch writes to the node.
  - Screenshot of the inspector populated with a MoCA node + a screenshot
    with a partner-handoff node showing the BranchPicker. Attach to PR.

Open the PR titled "feat(properties): schema-driven inspector + branch picker".
```

---

## Merge order

When all four PRs are green:

1. Merge `feat/io` first. It has no UI surface, so it lands silently.
2. Merge `feat/canvas`. Now `MissingBlockNode` from feat/io has a real renderer.
3. Merge `feat/palette`. Drops now do something visible.
4. Merge `feat/properties`. Inspector edits real nodes on a real canvas.

After all four:

```
pnpm install
pnpm catalog:build
pnpm catalog:check
pnpm validate:pathway examples/partner-cognitive-journey.pathway.json catalog/catalog.json
pnpm drift:report catalog/catalog.json
pnpm dev
```

Hand-test: open the partner journey fixture, drag a new block from the palette,
edit it, save to a new file, reload. Everything works → tag `v0.1.0`.

---

## What if a task's verification fails?

- Don't try to fix it across worktrees. Send a follow-up message to the
  failing Conductor task with the specific file + line and ask it to retry.
- If a Conductor agent rewrites a file outside its owned set, reject the PR
  and ask the agent to revert that file only.
- If the catalog version drifts during this work (someone bumps it in a
  separate PR), rebase the worktree and re-run `pnpm catalog:build` +
  `pnpm migrate:dry`.
