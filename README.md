# Mindspan Pathway Builder Kit

Drop-in scaffolding to rebuild the Mindspan Visual Care Pathway Builder as a true drag-and-drop workflow editor, using React Flow + dnd-kit + Zustand/zundo + shadcn/ui. Designed to be built across four parallel Conductor worktrees off `main`.

## What's in the box

```
pathway-builder-kit/
├── CONDUCTOR_PROMPT.md            # paste this into Conductor — five tasks, full directions
├── README.md                      # you are here
├── package.json                   # all deps + scripts wired
├── .github/
│   ├── CODEOWNERS                 # restricts catalog/ + schema/ edits
│   ├── PULL_REQUEST_TEMPLATE.md   # required PR checklist
│   └── workflows/
│       └── validate-pathways.yml  # CI: catalog sync, schema, drift, migration dry-run
├── bin/
│   ├── validate.ts                # catalog:build, catalog:check, validate:*, drift:report
│   └── migrate.ts                 # rewrites pathway files across catalog major bumps
├── catalog/
│   ├── catalog.ts                 # source of truth (TS); IntelliSense + compile-time checks
│   └── migrations/                # one TS file per major catalog bump
├── examples/                      # *.pathway.json fixtures, validated in CI
├── src/
│   └── schema/
│       └── pathway-schema.ts      # Zod contract for every doc + drift detection + fuzzy match
├── docs/
│   ├── conductor-worktree-plan.md # the full implementation plan
│   └── library-recommendations.md # why each library was picked
└── CONTRIBUTING.md                # non-developer authoring guide
```

## How to use this kit

1. Create a new GitHub repo `mindspan-pathway-builder`.
2. Unzip this kit at the repo root and commit it as the initial commit on `main`.
3. Open `CONDUCTOR_PROMPT.md` and follow the steps. It walks you through:
   - The one-time base-scaffold task (paste into Conductor against `main`).
   - The four parallel feature tasks (paste each into its own Conductor task).
   - The merge order.

## Stack at a glance

- **React 19 + Vite + TypeScript** — the app shell.
- **React Flow (`@xyflow/react`)** — the node canvas with built-in pan/zoom, Minimap, Controls, Background.
- **dnd-kit** — the sidebar palette (catalog-to-canvas drag uses native HTML5 because React Flow's drop zone doesn't accept dnd-kit drops).
- **Zustand + zundo** — single source of truth for nodes/edges, with free undo/redo.
- **react-hook-form + Zod** — schema-driven properties panel; every block's `paramSchema` is the form spec.
- **dagre** (default) + **elkjs** (parallel-lanes escape hatch) — auto-layout.
- **shadcn/ui** — Sidebar, Resizable, Command, Tabs, Slider, Select, Sheet, Sonner.

## Design system defaults

Grayscale 60/30 (neutral-50/100 + neutral-900). The 10% accent is `#FF2D95` (the pink already used in the prototype). The six block categories keep their original semantic colors (pink/cyan/green/yellow/violet/mint) as a 4px left-border or chip — not as fill — so the accent rule stays intact while the domain coding survives.

See `docs/library-recommendations.md` for the why-this-library writeups.
