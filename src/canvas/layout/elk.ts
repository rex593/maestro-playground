// src/canvas/layout/elk.ts
// Stub for an ELK-based layout, mirroring layoutDagre's signature.
//
// TODO: wire this up when parallel-lane forks need it. dagre's port assignment
// is weak when a gate forks into multiple parallel lanes that must stay visually
// grouped and aligned — ELK's layered algorithm with `elk.layered` + port
// constraints handles that case. Use elkjs (already a dependency) here, run its
// async layout, and write positions back the same way layoutDagre does.

import type { FlowNode, FlowEdge } from "@/state/usePathwayStore";
import type { LayoutDirection } from "./dagre";

export function layoutElk(
  _nodes: FlowNode[],
  _edges: FlowEdge[],
  _direction: LayoutDirection = "TB"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  throw new Error("elk layout not yet implemented");
}
