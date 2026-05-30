# Care Pathway Builder — Library & Snippet Recommendations

For the rebuild of `mindspan-visual-care-pathway-builder.html` using Conductor + GitHub.

## What the current file actually is (so we pick the right libs)

Important finding: the attached prototype is **not** drag-and-drop today. It is a **click-to-add catalog** plus a static auto-layout canvas. The "Build Your Own" experience already has the data model, the catalog of 50+ blocks, branch logic, parallel lanes, animated dashed Bézier edges, geography overrides, properties popovers, undo, save runs, compare grid, present mode, and a Snake easter egg, but every node is positioned by a hand-rolled grid packer (`kf`, `jf`) and the only "drop" target is the inline `+` suggester after the last node.

So the rebuild is really two upgrades layered onto an already-rich domain model:
1. Replace the static canvas with a true draggable, pannable, zoomable node graph.
2. Replace the bottom dock with a sidebar palette you drag from onto the canvas.

That framing drives every library pick below.

## Mirza's requested features, mapped

Only one literal "Mirza" quote exists in the file, attached to the Decide phase:

> Partner-first control model. Mirza: "they may just want to buy the assessments and have control over the subsequent steps."

The Decide-phase blocks immediately under that quote read as the operationalized version of that thesis: Partner Protocol Junction, Partner Owns Next Step, Amyloid Status Gate (blood-first, PET fallback), APOE-Stratified Consent, and explicit junction nodes for PCP, MDT, Care Navigator, Caregiver, and Payer. The partner cognitive journey template also exposes two scripted Partner Touchpoints (Route Decision, Workup Decision), which is the same idea told as narrative.

What that means for the rebuild: the builder needs first-class support for **handoff gates** — nodes whose primary attribute is `whoDecides` (Mindspan, Partner, Payer, Family, Auto), and edges that carry a payload describing what the partner receives at handoff. Plus a few non-obvious requirements that fall out: branch-level `downstreamSwap` (a partner choice mutates the rest of the path), `parallelLanes` (Mindspan and Partner working in parallel), and `effect` multipliers (a partner-controlled branch changes risk/cost math). Any library shortlist has to keep these expressible.

## Recommended primary stack

**React Flow (`@xyflow/react`)** is the right base. MIT, 36k stars, 180k weekly downloads, built around a Zustand store under the hood, ships Background / Minimap / Controls / Panel / NodeToolbar / NodeResizer out of the box, and gives you custom node types via plain React components — which means the existing phase-tinted block UI from `mf` (the SVG glyphs, `whoDecides` tag, animated dashed border) lifts in as a `<PartnerGate>` or `<AssessmentBlock>` component with handles. The `toObject()` / `fromObject()` pair gives you the JSON round-trip you'll want for saving pathways to GitHub. Source: [Node-Based UIs in React — React Flow](https://reactflow.dev/) and [ReactFlowJsonObject API](https://reactflow.dev/api-reference/types/react-flow-json-object).

Alternatives considered and rejected: GoJS is commercial, Drawflow is a tenth the activity and missing the React-first ergonomics, Rete.js targets visual programming (typed sockets, eval graphs) which is overkill, tldraw is a whiteboard SDK with a $6k/yr commercial license and isn't built for structured node graphs. See [tldraw vs React Flow comparison](https://reactflow.dev/learn/advanced-use/whiteboard) and the [npm trends chart](https://npmtrends.com/drawflow-vs-flume-vs-gojs-vs-node-red-vs-noflo-vs-react-flow-renderer-vs-rete).

## The supporting libraries you'll actually need

The trap with React Flow is that "drag a new node onto the canvas from a sidebar" is not built in — React Flow handles intra-canvas drag and connections, not palette-to-canvas drag. The clean pattern is React Flow for the canvas plus **dnd-kit (`@dnd-kit/react`)** for the palette. dnd-kit is framework-agnostic, accessible, supports keyboard drag, and integrates cleanly with sortable sidebar groups. Source: [dnd kit](https://dndkit.com/).

For state and time travel, use **Zustand** as the single source of truth for nodes, edges, and the `whoDecides` selections, then wrap it in **Zundo** for undo/redo. React Flow itself uses Zustand internally, so there is no architectural conflict, and Zundo gives you `pastStates`, `futureStates`, `undo()`, `redo()`, `clear()` in under 700 bytes — which is what the existing `history` array in `Nf` is reinventing by hand. Sources: [React Flow state management](https://reactflow.dev/learn/advanced-use/state-management) and [zundo on GitHub](https://github.com/charkour/zundo).

For auto-layout, use **dagre** as the default and have **elkjs** ready behind a feature flag. Dagre is the drop-in for clean left-to-right phase ordering (which is what the current `kf` packer is approximating). ELK is the escape hatch for the parallel-lane case, where you need port constraints and layer hints. React Flow ships official examples for both. Source: [React Flow layouting overview](https://reactflow.dev/learn/layouting/layouting).

For the properties panel — every block in `gf` has a typed `paramSchema` with `kind: 'number' | 'select' | 'multiselect'` — use **react-hook-form + Zod + @hookform/resolvers/zod** with a schema-driven `FieldRenderer`. That same Zod schema doubles as your runtime validation when importing a pathway JSON, which closes a loop the current prototype leaves open. Source: [Dynamic forms with React Hook Form, Zod](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn).

For the shell — sidebar, resizable inspector, command palette — use **shadcn/ui's Sidebar + Resizable** (Resizable is a wrapper around react-resizable-panels, which is the industry default) plus the shadcn **Command** primitive for a Cmd-K block-catalog search. This also matches your global preference for shadcn and a black-and-white base palette. Source: [shadcn Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) and [Resizable](https://ui.shadcn.com/docs/components/radix/resizable).

For icons, keep **lucide-react** (already used) and continue hand-rolling the medical glyphs in `mf` — they read as part of the brand.

## Snippet-level grabs (worth copying, not reinventing)

The xyflow team publishes [`xyflow/awesome-node-based-uis`](https://github.com/xyflow/awesome-node-based-uis), which is the right place to mine for live builders, and React Flow's own [Save and Restore example](https://reactflow.dev/examples/interaction/save-and-restore) is the literal blueprint for the JSON persistence flow. The [`json-to-reactflow`](https://www.npmjs.com/package/json-to-reactflow) package is a useful starting point if we decide to author pathways as YAML in the repo and let the builder render them, though I'd lean toward owning the serializer ourselves so the partner-handoff payload stays first-class.

## Recommended palette and how the 60-30-10 applies

Per your default, start in grayscale: neutral-50 / neutral-100 / neutral-900 as the 60 (canvas, panels) and 30 (cards, headers). For the 10 percent accent, the existing prototype already encodes meaning in color — pink for assessment, cyan for decision, green for treatment, yellow for monitoring, violet for outcome, mint for entry. That's a six-token semantic system, not a single accent, so don't collapse it. The cleanest path: keep grayscale chrome, render block category as a 4px left-border or chip in the original neon tokens, and reserve `#FF2D95` (the existing pink) as the single "active selection / Partner-controlled" accent in the rest of the UI. That keeps the 10 percent rule intact while honoring the domain coding.

## Conductor + GitHub workflow note

For the rebuild itself, the Conductor app from Melty Labs is well-suited: spin up parallel worktrees for, for example, "canvas + React Flow base," "palette + dnd-kit," "properties panel + RHF/Zod," and "JSON import/export," then merge in order. Each worktree is isolated, so the team can iterate the data model in one worktree while another fights with auto-layout. Source: [Conductor](https://www.todayonmac.com/conductor/).

## Open questions before we start the rebuild

There are three things the prototype doesn't answer that will shape the library list. Whether multiplayer/co-editing is in scope (changes the persistence and conflict story — if yes, Yjs + a Liveblocks or PartyKit channel becomes a hard requirement). Whether the partner-handoff gates need to export to a real runtime, for example Conductor OSS workflow JSON or BPMN, so partners can execute the downstream protocol (changes whether we ship our own serializer or target an existing schema). And whether the partner "Judy's Story" narrative mode is a separate viewer or a first-class authoring affordance inside the same builder.

## Sources

- [Node-Based UIs in React — React Flow](https://reactflow.dev/)
- [ReactFlowJsonObject — React Flow API](https://reactflow.dev/api-reference/types/react-flow-json-object)
- [Save and Restore — React Flow](https://reactflow.dev/examples/interaction/save-and-restore)
- [Layouting overview — React Flow](https://reactflow.dev/learn/layouting/layouting)
- [Dagre Tree example — React Flow](https://reactflow.dev/examples/layout/dagre)
- [Elkjs Tree example — React Flow](https://reactflow.dev/examples/layout/elkjs)
- [Using a State Management Library — React Flow](https://reactflow.dev/learn/advanced-use/state-management)
- [Whiteboard Features — React Flow](https://reactflow.dev/learn/advanced-use/whiteboard)
- [xyflow/awesome-node-based-uis on GitHub](https://github.com/xyflow/awesome-node-based-uis)
- [npm trends: Drawflow vs GoJS vs React Flow vs Rete](https://npmtrends.com/drawflow-vs-flume-vs-gojs-vs-node-red-vs-noflo-vs-react-flow-renderer-vs-rete)
- [dnd kit](https://dndkit.com/) and [GitHub](https://github.com/clauderic/dnd-kit)
- [zundo on GitHub](https://github.com/charkour/zundo)
- [Advanced React Forms with RHF, Zod, shadcn](https://wasp.sh/blog/2025/01/22/advanced-react-hook-form-zod-shadcn)
- [shadcn Sidebar](https://ui.shadcn.com/docs/components/radix/sidebar) and [Resizable](https://ui.shadcn.com/docs/components/radix/resizable)
- [json-to-reactflow on npm](https://www.npmjs.com/package/json-to-reactflow)
- [Conductor (Melty Labs)](https://www.todayonmac.com/conductor/)
- [Conductor OSS](https://github.com/conductor-oss/conductor)
