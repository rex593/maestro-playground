// src/canvas/layout/dagre.ts
// Auto-layout via dagre. Returns a new node array with positions written back;
// edges pass through unchanged. Node dimensions match the prototype's wf/Tf
// constants (220 × 108).

import dagre from "dagre";
import type { FlowNode, FlowEdge } from "@/state/usePathwayStore";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 108;

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

export function layoutDagre(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: LayoutDirection = "TB"
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 48, ranksep: 64 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, {
      width: node.width ?? NODE_WIDTH,
      height: node.height ?? NODE_HEIGHT,
    });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const laidOut = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    const width = node.width ?? NODE_WIDTH;
    const height = node.height ?? NODE_HEIGHT;
    // dagre returns the node center; React Flow positions are top-left.
    return {
      ...node,
      position: { x: x - width / 2, y: y - height / 2 },
    };
  });

  return { nodes: laidOut, edges };
}
