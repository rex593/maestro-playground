// src/state/usePathwayStore.ts
// Single source of truth for the pathway graph. Wrapped with zundo's `temporal`
// so every pane gets free undo/redo over the { nodes, edges, meta } slice.
//
// Task 0 ships this as the shared scaffolding: typed, working actions the canvas
// (Task 2), palette (Task 3), inspector (Task 4) and IO (Task 1) all build on.

import { create } from "zustand";
import { useStore } from "zustand";
import { temporal, type TemporalState } from "zundo";
import { nanoid } from "nanoid";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import {
  makeEmptyPathway,
  detectCatalogDrift,
  PathwayDocumentSchema,
  type PathwayDocument,
  type CatalogDriftReport,
} from "@/schema/pathway-schema";
import { catalog, catalogVersion, getBlock } from "./catalog";

// The schema exports Zod schemas but not these standalone type aliases, and the
// schema file is locked — so derive them from the exported PathwayDocument type.
type PathwayMeta = PathwayDocument["meta"];
type EdgeKind = NonNullable<
  PathwayDocument["graph"]["edges"][number]["data"]
>["kind"];

/* ------------------------------------------------------------------ */
/* Node / edge data shapes used on the canvas                          */
/* ------------------------------------------------------------------ */

export interface PathwayNodeData {
  blockId: string;
  params: Record<string, unknown>;
  branchSelection?: string;
  lane?: number;
  forkId?: string;
  laneIndex?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface PathwayEdgeData {
  kind: EdgeKind;
  branchId?: string;
  label?: string;
  [key: string]: unknown;
}

export type FlowNode = Node<PathwayNodeData>;
export type FlowEdge = Edge<PathwayEdgeData>;

export interface SavedRun {
  id: string;
  name: string;
  blockCount: number;
  savedAt: string;
  doc: PathwayDocument;
}

/* ------------------------------------------------------------------ */
/* Store shape                                                         */
/* ------------------------------------------------------------------ */

export interface PathwayState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  meta: PathwayMeta;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  savedRuns: SavedRun[];
  lastDrift: CatalogDriftReport | null;

  // Mutations
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  onNodesChange: (changes: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => void;
  addNode: (input: { blockId: string; position: { x: number; y: number } }) => string;
  updateNode: (nodeId: string, partial: Partial<FlowNode>) => void;
  removeNode: (nodeId: string) => void;
  connect: (connection: Connection) => void;

  // IO
  loadPathway: (doc: PathwayDocument) => { drift: CatalogDriftReport };
  savePathway: () => PathwayDocument;
  setLastDrift: (drift: CatalogDriftReport | null) => void;

  // Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // Saved runs
  saveRun: (name: string) => void;
}

const initialMeta = makeEmptyPathway("untitled", "Untitled", catalogVersion).meta;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Build a fresh canvas node for a catalog block, seeding defaultParams. */
function makeNode(
  blockId: string,
  position: { x: number; y: number }
): FlowNode {
  const def = getBlock(blockId);
  return {
    id: `pe-${nanoid(6)}`,
    type: def ? "pathwayNode" : "missingBlock",
    position,
    data: {
      blockId,
      params: { ...(def?.defaultParams ?? {}) },
    },
  };
}

/** Serialize current store state into a validated PathwayDocument. */
function toDocument(state: PathwayState): PathwayDocument {
  const now = new Date().toISOString();
  const doc: PathwayDocument = {
    meta: { ...state.meta, catalogVersion, updatedAt: now },
    graph: {
      nodes: state.nodes.map((n) => ({
        id: n.id,
        type: n.type ?? "pathwayNode",
        position: n.position,
        data: {
          blockId: n.data.blockId,
          params: n.data.params ?? {},
          branchSelection: n.data.branchSelection,
          lane: n.data.lane,
          forkId: n.data.forkId,
          laneIndex: n.data.laneIndex,
          notes: n.data.notes,
        },
        width: n.width ?? undefined,
        height: n.height ?? undefined,
      })),
      edges: state.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        type: e.type ?? "pathwayEdge",
        data: {
          kind: e.data?.kind ?? "sequential",
          branchId: e.data?.branchId,
          label: e.data?.label,
        },
      })),
    },
  };
  return PathwayDocumentSchema.parse(doc);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const usePathwayStore = create<PathwayState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      meta: initialMeta,
      selectedNodeId: null,
      selectedEdgeId: null,
      savedRuns: [],
      lastDrift: null,

      setNodes: (nodes) => set({ nodes }),
      setEdges: (edges) => set({ edges }),

      onNodesChange: (changes) =>
        set({ nodes: applyNodeChanges(changes, get().nodes) }),
      onEdgesChange: (changes) =>
        set({ edges: applyEdgeChanges(changes, get().edges) }),

      addNode: ({ blockId, position }) => {
        const node = makeNode(blockId, position);
        set({ nodes: [...get().nodes, node] });
        return node.id;
      },

      updateNode: (nodeId, partial) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  ...partial,
                  data: { ...n.data, ...(partial.data ?? {}) },
                }
              : n
          ),
        }),

      removeNode: (nodeId) =>
        set({
          nodes: get().nodes.filter((n) => n.id !== nodeId),
          edges: get().edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          ),
          selectedNodeId:
            get().selectedNodeId === nodeId ? null : get().selectedNodeId,
        }),

      connect: (connection) =>
        set({
          edges: addEdge(
            {
              ...connection,
              type: "pathwayEdge",
              data: { kind: "sequential" },
            },
            get().edges
          ),
        }),

      loadPathway: (doc) => {
        const drift = detectCatalogDrift(doc, catalog);
        const missing = new Set(drift.missingBlockIds);
        const nodes: FlowNode[] = doc.graph.nodes.map((n) => ({
          id: n.id,
          type: missing.has(n.data.blockId) ? "missingBlock" : n.type,
          position: n.position,
          data: {
            blockId: n.data.blockId,
            params: n.data.params ?? {},
            branchSelection: n.data.branchSelection,
            lane: n.data.lane,
            forkId: n.data.forkId,
            laneIndex: n.data.laneIndex,
            notes: n.data.notes,
          },
          width: n.width,
          height: n.height,
        }));
        const edges: FlowEdge[] = doc.graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: e.type,
          data: e.data,
        }));
        set({
          nodes,
          edges,
          meta: doc.meta,
          selectedNodeId: null,
          selectedEdgeId: null,
          lastDrift: hasDrift(drift) ? drift : null,
        });
        // Fresh document → reset undo history so you can't undo past load.
        usePathwayStore.temporal.getState().clear();
        return { drift };
      },

      savePathway: () => toDocument(get()),

      setLastDrift: (drift) => set({ lastDrift: drift }),

      selectNode: (nodeId) =>
        set({ selectedNodeId: nodeId, selectedEdgeId: null }),
      selectEdge: (edgeId) =>
        set({ selectedEdgeId: edgeId, selectedNodeId: null }),
      clearSelection: () =>
        set({ selectedNodeId: null, selectedEdgeId: null }),

      saveRun: (name) => {
        const doc = toDocument(get());
        const run: SavedRun = {
          id: nanoid(8),
          name,
          blockCount: doc.graph.nodes.length,
          savedAt: new Date().toISOString(),
          doc,
        };
        set({ savedRuns: [...get().savedRuns, run] });
      },
    }),
    {
      limit: 100,
      // Only the document graph belongs in undo history — not selection/runs.
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        meta: state.meta,
      }),
    }
  )
);

/** True when a drift report contains any breaking or soft drift. */
export function hasDrift(drift: CatalogDriftReport): boolean {
  return (
    drift.missingBlockIds.length > 0 ||
    drift.missingBranchIds.length > 0 ||
    drift.paramSchemaChanges.length > 0
  );
}

/* ------------------------------------------------------------------ */
/* Undo/redo hook — subscribe to zundo's temporal store               */
/* ------------------------------------------------------------------ */

type TemporalPathwayState = TemporalState<
  Pick<PathwayState, "nodes" | "edges" | "meta">
>;

export function useTemporalStore<T>(
  selector: (state: TemporalPathwayState) => T
): T {
  return useStore(usePathwayStore.temporal, selector);
}
