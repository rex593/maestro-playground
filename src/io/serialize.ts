// src/io/serialize.ts
// Turns live store state into a validated, on-disk PathwayDocument.
//
// The serialized doc always pins meta.catalogVersion to the CURRENT catalog
// version (the loader compares this against the catalog at open time to surface
// drift). Nodes reference blocks by id only — the catalog is never bundled.

import {
  PathwayDocumentSchema,
  type PathwayDocument,
} from "@/schema/pathway-schema";
import { catalogVersion } from "@/state/catalog";
import type { FlowNode, FlowEdge } from "@/state/usePathwayStore";

export interface SerializableState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  meta: PathwayDocument["meta"];
}

export function toDocument(state: SerializableState): PathwayDocument {
  const now = new Date().toISOString();
  const doc: PathwayDocument = {
    // Force the current catalog version — this is the authored-against marker.
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
  // Throws ZodError if the live graph somehow violates the contract.
  return PathwayDocumentSchema.parse(doc);
}
